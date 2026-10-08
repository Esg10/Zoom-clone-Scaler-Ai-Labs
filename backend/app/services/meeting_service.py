"""Meeting business logic: ID/passcode/link generation, scheduling and access checks."""
import secrets
import string
from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy import exists, or_, select
from sqlalchemy.orm import Session, selectinload

from app.config import FRONTEND_URL
from app.database import utcnow
from app.errors import AppError, not_found
from app.models import Meeting, MeetingStatus, MeetingType, Participant, User
from app.schemas import MeetingUpdate, ScheduleMeetingCreate

MEETING_CODE_LENGTH = 11
PERSONAL_ID_LENGTH = 10
PASSCODE_LENGTH = 6
MAX_CODE_ATTEMPTS = 10
PASSCODE_ALPHABET = string.ascii_letters + string.digits


# ---------- Generators ----------

def random_digits(length: int) -> str:
    # First digit is never 0 so the code keeps its length when treated as a number.
    return str(secrets.randbelow(9) + 1) + "".join(str(secrets.randbelow(10)) for _ in range(length - 1))


def code_in_use(db: Session, code: str) -> bool:
    # Meeting codes share a namespace with personal meeting IDs, because a PMI
    # becomes a meeting_code the first time its owner starts a meeting with it.
    return db.scalar(
        select(
            exists().where(Meeting.meeting_code == code)
            | exists().where(User.personal_meeting_id == code)
        )
    )


def generate_unique_code(db: Session, length: int = MEETING_CODE_LENGTH) -> str:
    """Random numeric ID; collisions are astronomically rare but still retried."""
    for _ in range(MAX_CODE_ATTEMPTS):
        code = random_digits(length)
        if not code_in_use(db, code):
            return code
    raise AppError(503, "code_generation_failed", "Could not allocate a meeting ID, please retry")


def generate_passcode() -> str:
    return "".join(secrets.choice(PASSCODE_ALPHABET) for _ in range(PASSCODE_LENGTH))


def build_invite_link(code: str, passcode: str) -> str:
    return f"{FRONTEND_URL}/j/{code}?pwd={passcode}"


def to_utc(local_date: date, local_time: time, tz_name: str) -> datetime:
    """Interpret a wall-clock date/time in the given IANA zone and convert to UTC."""
    return datetime.combine(local_date, local_time, tzinfo=ZoneInfo(tz_name)).astimezone(timezone.utc)


# ---------- Queries ----------

def get_meeting(db: Session, code: str) -> Meeting:
    meeting = db.scalar(select(Meeting).where(Meeting.meeting_code == code.replace(" ", "")))
    if meeting is None:
        raise not_found()
    return meeting


def list_upcoming(db: Session, user_id: int) -> List[Meeting]:
    """Scheduled meetings hosted by the user that haven't finished yet."""
    now = utcnow()
    candidates = db.scalars(
        select(Meeting)
        .options(selectinload(Meeting.host), selectinload(Meeting.participants))
        .where(
            Meeting.host_id == user_id,
            Meeting.type == MeetingType.scheduled,
            Meeting.status.in_([MeetingStatus.scheduled, MeetingStatus.live]),
            # Coarse SQL filter; the exact "end time > now" check happens below
            # because duration arithmetic isn't portable across databases.
            Meeting.scheduled_start >= now - timedelta(days=1),
        )
        .order_by(Meeting.scheduled_start)
    ).all()
    return [m for m in candidates if m.status == MeetingStatus.live or meeting_end(m) > now]


def list_recent(db: Session, user_id: int, limit: int = 20) -> List[Meeting]:
    """Ended meetings the user hosted or took part in, newest first."""
    attended = exists().where(Participant.meeting_id == Meeting.id, Participant.user_id == user_id)
    return list(
        db.scalars(
            select(Meeting)
            .options(selectinload(Meeting.host), selectinload(Meeting.participants))
            .where(Meeting.status == MeetingStatus.ended, or_(Meeting.host_id == user_id, attended))
            .order_by(Meeting.ended_at.desc())
            .limit(limit)
        ).all()
    )


def meeting_end(meeting: Meeting) -> datetime:
    return meeting.scheduled_start + timedelta(minutes=meeting.duration_minutes)


# ---------- Commands ----------

def create_instant_meeting(db: Session, host: User, use_personal_id: bool) -> Meeting:
    now = utcnow()
    if use_personal_id:
        # The personal room is one reusable meeting row keyed by the user's PMI.
        meeting = db.scalar(select(Meeting).where(Meeting.meeting_code == host.personal_meeting_id))
        if meeting is not None:
            if meeting.status != MeetingStatus.live:
                meeting.status, meeting.started_at, meeting.ended_at = MeetingStatus.live, now, None
                db.commit()
            return meeting
        code, title = host.personal_meeting_id, f"{host.name}'s Personal Meeting Room"
    else:
        code, title = generate_unique_code(db), f"{host.name}'s Zoom Meeting"

    passcode = generate_passcode()
    meeting = Meeting(
        meeting_code=code,
        title=title,
        host_id=host.id,
        type=MeetingType.instant,
        status=MeetingStatus.live,
        duration_minutes=60,
        timezone="UTC",
        passcode=passcode,
        invite_link=build_invite_link(code, passcode),
        started_at=now,
    )
    db.add(meeting)
    db.commit()
    return meeting


def schedule_meeting(db: Session, host: User, data: ScheduleMeetingCreate) -> Meeting:
    start = to_utc(data.date, data.time, data.timezone)
    ensure_future(start)
    code = generate_unique_code(db)
    passcode = data.passcode or generate_passcode()
    meeting = Meeting(
        meeting_code=code,
        title=data.title,
        description=data.description or None,
        host_id=host.id,
        type=MeetingType.scheduled,
        status=MeetingStatus.scheduled,
        scheduled_start=start,
        duration_minutes=data.duration_minutes,
        timezone=data.timezone,
        passcode=passcode,
        invite_link=build_invite_link(code, passcode),
        waiting_room_enabled=data.waiting_room_enabled,
        mute_on_entry=data.mute_on_entry,
    )
    db.add(meeting)
    db.commit()
    return meeting


def update_meeting(db: Session, meeting: Meeting, data: MeetingUpdate) -> Meeting:
    if meeting.type != MeetingType.scheduled or meeting.status != MeetingStatus.scheduled:
        raise AppError(409, "not_editable", "Only upcoming scheduled meetings can be edited")

    changes = data.model_dump(exclude_unset=True)
    if {"date", "time", "timezone"} & changes.keys():
        # Fill the missing parts from the current start, expressed in the (new) zone.
        tz_name = changes.get("timezone") or meeting.timezone
        current_local = meeting.scheduled_start.astimezone(ZoneInfo(tz_name))
        start = to_utc(changes.get("date") or current_local.date(), changes.get("time") or current_local.time(), tz_name)
        if start != meeting.scheduled_start:
            # Only a *new* start must be in the future, so a meeting that is due
            # now can still be renamed without moving it.
            ensure_future(start)
        meeting.scheduled_start, meeting.timezone = start, tz_name

    for field in ("title", "duration_minutes", "waiting_room_enabled", "mute_on_entry"):
        if changes.get(field) is not None:
            setattr(meeting, field, changes[field])
    if "description" in changes:
        meeting.description = (changes["description"] or "").strip() or None  # empty clears it
    if changes.get("passcode"):
        meeting.passcode = changes["passcode"]
        meeting.invite_link = build_invite_link(meeting.meeting_code, meeting.passcode)

    db.commit()
    return meeting


def cancel_meeting(db: Session, meeting: Meeting) -> Meeting:
    if meeting.status != MeetingStatus.scheduled:
        reason = "in progress; end it instead" if meeting.status == MeetingStatus.live else f"already {meeting.status.value}"
        raise AppError(409, "not_cancellable", f"This meeting is {reason}")
    meeting.status = MeetingStatus.cancelled
    db.commit()
    return meeting


def mark_live(db: Session, meeting: Meeting) -> None:
    if meeting.status == MeetingStatus.scheduled:
        meeting.status, meeting.started_at = MeetingStatus.live, utcnow()
        db.commit()


def end_meeting(db: Session, meeting: Meeting) -> Meeting:
    now = utcnow()
    meeting.status, meeting.ended_at = MeetingStatus.ended, now
    for participant in meeting.participants:
        if participant.left_at is None:
            participant.left_at = now
    db.commit()
    return meeting


# ---------- Validation ----------

def ensure_future(start: datetime) -> None:
    if start <= utcnow():
        raise AppError(422, "start_in_past", "The meeting start time must be in the future")


def ensure_joinable(meeting: Meeting, passcode: Optional[str], is_host: bool = False) -> None:
    """Raise a descriptive error if this meeting can't be joined with the given passcode."""
    if meeting.status == MeetingStatus.ended:
        raise AppError(410, "meeting_ended", "This meeting has ended.")
    if meeting.status == MeetingStatus.cancelled:
        raise AppError(410, "meeting_cancelled", "This meeting has been cancelled by the host.")
    if is_host:
        return
    if not passcode:
        raise AppError(403, "passcode_required", "This meeting requires a passcode.")
    # Constant-time comparison avoids leaking how many characters matched.
    # (Compared as bytes: compare_digest rejects non-ASCII strings.)
    if not secrets.compare_digest(passcode.strip().encode(), meeting.passcode.encode()):
        raise AppError(403, "invalid_passcode", "Incorrect meeting passcode. Please try again.")
