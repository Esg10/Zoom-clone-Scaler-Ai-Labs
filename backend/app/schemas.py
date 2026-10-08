"""Pydantic request/response models (mirrored by frontend/types/index.ts)."""
import datetime as dt
import re
from typing import Annotated, List, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator

from app.models import MeetingStatus, MeetingType, ParticipantRole

PASSCODE_PATTERN = re.compile(r"^[A-Za-z0-9]{6,10}$")
# Deliberately simple: "something@something.tld". Real verification would email a link.
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


def _validate_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        raise ValueError(f"Unknown time zone '{value}'")
    return value


def _validate_passcode(value: str) -> str:
    if not PASSCODE_PATTERN.match(value):
        raise ValueError("Passcode must be 6-10 letters or digits")
    return value


TimeZoneName = Annotated[str, AfterValidator(_validate_timezone)]
Passcode = Annotated[str, AfterValidator(_validate_passcode)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Users ----------

class UserOut(ORMModel):
    id: int
    name: str
    email: str
    avatar_color: str
    personal_meeting_id: str
    created_at: dt.datetime


# ---------- Auth ----------

class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=255)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Name is required")
        return value.strip()

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_PATTERN.match(value):
            raise ValueError("Enter a valid email address")
        return value


class LoginRequest(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=128)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AuthResponse(BaseModel):
    token: str
    user: UserOut


# ---------- Meetings ----------

class MeetingOut(ORMModel):
    id: int
    meeting_code: str
    title: str
    description: Optional[str]
    host_id: int
    host_name: str
    type: MeetingType
    status: MeetingStatus
    scheduled_start: Optional[dt.datetime]
    duration_minutes: int
    timezone: str
    passcode: str
    invite_link: str
    waiting_room_enabled: bool
    mute_on_entry: bool
    created_at: dt.datetime
    started_at: Optional[dt.datetime]
    ended_at: Optional[dt.datetime]
    participant_count: int = 0


class InstantMeetingCreate(BaseModel):
    use_personal_meeting_id: bool = False


class ScheduleMeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    date: dt.date
    time: dt.time
    duration_minutes: int = Field(ge=15, le=24 * 60)
    timezone: TimeZoneName = "UTC"
    passcode: Optional[Passcode] = None
    waiting_room_enabled: bool = False
    mute_on_entry: bool = False

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Topic is required")
        return value.strip()


class MeetingUpdate(BaseModel):
    """PATCH body: every field optional; omitted fields keep their value."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    date: Optional[dt.date] = None
    time: Optional[dt.time] = None
    duration_minutes: Optional[int] = Field(default=None, ge=15, le=24 * 60)
    timezone: Optional[TimeZoneName] = None
    passcode: Optional[Passcode] = None
    waiting_room_enabled: Optional[bool] = None
    mute_on_entry: Optional[bool] = None


class ValidateRequest(BaseModel):
    passcode: Optional[str] = None


class ErrorDetail(BaseModel):
    code: str
    message: str


class ValidateResponse(BaseModel):
    """Always returned with HTTP 200 so the join form can show the reason inline."""

    ok: bool
    meeting: Optional[MeetingOut] = None
    error: Optional[ErrorDetail] = None


# ---------- Participants ----------

class JoinRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    passcode: Optional[str] = None
    is_video_on: bool = True

    @field_validator("display_name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Display name is required")
        return value.strip()


class ParticipantOut(ORMModel):
    id: int
    meeting_id: int
    user_id: Optional[int]
    display_name: str
    role: ParticipantRole
    joined_at: dt.datetime
    left_at: Optional[dt.datetime]
    is_muted: bool
    is_video_on: bool
    is_removed: bool
    is_admitted: bool


class JoinResponse(BaseModel):
    participant: ParticipantOut
    meeting: MeetingOut
    # Secret for this participant; required by the WebSocket and host actions.
    participant_token: str


class HostActionRequest(BaseModel):
    """Who performs a host action: the participant id plus its secret token."""

    participant_id: int
    participant_token: str


class ChatMessageOut(ORMModel):
    id: int
    participant_id: int
    sender_name: str
    content: str
    sent_at: dt.datetime


class ParticipantList(BaseModel):
    participants: List[ParticipantOut]
