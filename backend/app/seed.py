"""Demo data so the dashboard looks realistic on first load.

Runs automatically on startup when the users table is empty.
Manual reset:  python -m app.seed --reset
"""
import sys
from datetime import datetime, timedelta, timezone
from typing import List, Tuple
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import ChatMessage, Meeting, MeetingStatus, MeetingType, Participant, ParticipantRole, User
from app.services.meeting_service import build_invite_link, generate_passcode, generate_unique_code

SEED_TIMEZONE = "Asia/Kolkata"

USERS = [
    ("Eaknoor Singh", "eaknoor.singh@example.com", "#0B5CFF", "4815162342"),
    ("Priya Sharma", "priya.sharma@example.com", "#E8590C", "5623401987"),
    ("Arjun Mehta", "arjun.mehta@example.com", "#2F9E44", "7390215846"),
    ("Sarah Chen", "sarah.chen@example.com", "#AE3EC9", "6140987325"),
    ("David Kim", "david.kim@example.com", "#1098AD", "8257103964"),
]

# (title, description, days from today, local hour, local minute, duration)
UPCOMING = [
    ("Daily Standup", "Quick sync on blockers and priorities.", 0, None, None, 30),
    ("Design Review: Meeting Room UI", "Walk through the new gallery view and control bar.", 1, 11, 0, 60),
    ("1:1 with Priya", None, 2, 15, 30, 30),
    ("Sprint Planning", "Plan stories for the next two-week sprint.", 4, 10, 0, 90),
    ("Product Demo for Stakeholders", "Live demo of scheduling and join flows.", 6, 17, 0, 45),
]

# (title, host index, days ago, local hour, duration, attendee indexes, guest names, chat lines)
RECENT = [
    ("Backend API Sync", 0, 1, 14, 40, [1, 2], ["Rahul (Guest)"], [(1, "Shared the API contract in the doc."), (0, "Thanks! Reviewing now.")]),
    ("Weekly Team Meeting", 1, 2, 10, 55, [0, 2, 3, 4], [], [(3, "Can we move the retro to Friday?")]),
    ("Interview Prep", 0, 3, 18, 30, [3], [], []),
    ("Customer Feedback Review", 3, 4, 16, 50, [0, 1], ["Alex from Acme"], [(0, "Great insights, let's prioritise search.")]),
    ("Eaknoor Singh's Zoom Meeting", 0, 5, 12, 20, [4], [], []),
    ("Architecture Deep Dive", 2, 6, 11, 75, [0, 1, 4], [], [(2, "Slides: WebRTC mesh vs SFU trade-offs.")]),
]


def _local(days: int, hour: int, minute: int = 0) -> datetime:
    tz = ZoneInfo(SEED_TIMEZONE)
    day = datetime.now(tz).date() + timedelta(days=days)
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=tz).astimezone(timezone.utc)


def _next_half_hour(after_minutes: int = 60) -> datetime:
    """Today's first meeting: the next :00/:30 slot at least an hour from now."""
    target = datetime.now(timezone.utc) + timedelta(minutes=after_minutes)
    round_up = (30 - target.minute % 30) % 30
    return (target + timedelta(minutes=round_up)).replace(second=0, microsecond=0)


def _new_meeting(db: Session, host: User, title: str, **fields) -> Meeting:
    code, passcode = generate_unique_code(db), generate_passcode()
    meeting = Meeting(
        meeting_code=code, title=title, host_id=host.id, passcode=passcode,
        invite_link=build_invite_link(code, passcode), timezone=SEED_TIMEZONE, **fields,
    )
    db.add(meeting)
    db.flush()  # assigns meeting.id and makes the code visible to the next collision check
    return meeting


def _seed_users(db: Session) -> List[User]:
    users = [
        User(name=name, email=email, avatar_color=color, personal_meeting_id=pmi)
        for name, email, color, pmi in USERS
    ]
    db.add_all(users)
    db.flush()
    return users


def _seed_upcoming(db: Session, host: User) -> None:
    for title, description, days, hour, minute, duration in UPCOMING:
        start = _next_half_hour() if hour is None else _local(days, hour, minute)
        _new_meeting(
            db, host, title, description=description, type=MeetingType.scheduled,
            status=MeetingStatus.scheduled, scheduled_start=start, duration_minutes=duration,
            waiting_room_enabled=days % 2 == 0, mute_on_entry=duration >= 60,
        )


def _seed_recent(db: Session, users: List[User]) -> None:
    for title, host_idx, days_ago, hour, duration, attendee_idxs, guests, chat in RECENT:
        start = _local(-days_ago, hour)
        end = start + timedelta(minutes=duration)
        meeting = _new_meeting(
            db, users[host_idx], title, type=MeetingType.scheduled, status=MeetingStatus.ended,
            scheduled_start=start, duration_minutes=duration, started_at=start, ended_at=end,
            created_at=start - timedelta(days=2),
        )
        people: List[Tuple[int, Participant]] = []
        for offset, idx in enumerate([host_idx] + attendee_idxs):
            user = users[idx]
            people.append((idx, Participant(
                meeting_id=meeting.id, user_id=user.id, display_name=user.name,
                role=ParticipantRole.host if idx == host_idx else ParticipantRole.attendee,
                joined_at=start + timedelta(minutes=offset), left_at=end, is_video_on=offset % 2 == 0,
            )))
        for guest in guests:
            people.append((-1, Participant(
                meeting_id=meeting.id, display_name=guest, joined_at=start + timedelta(minutes=3), left_at=end,
            )))
        db.add_all(p for _, p in people)
        db.flush()

        by_user = {idx: p for idx, p in people}
        for minute, (sender_idx, content) in enumerate(chat, start=5):
            db.add(ChatMessage(
                meeting_id=meeting.id, participant_id=by_user[sender_idx].id, content=content,
                sent_at=start + timedelta(minutes=minute),
            ))


def seed(db: Session) -> None:
    users = _seed_users(db)
    _seed_upcoming(db, users[0])
    _seed_recent(db, users)
    db.commit()


def seed_if_empty() -> bool:
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(User)):
            return False
        seed(db)
        return True


if __name__ == "__main__":
    if "--reset" in sys.argv:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    print("Seeded demo data" if seed_if_empty() else "Database already has data (use --reset)")
