"""ORM models: users, meetings, participants and chat messages."""
import enum
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UTCDateTime, utcnow


class MeetingType(str, enum.Enum):
    instant = "instant"
    scheduled = "scheduled"


class MeetingStatus(str, enum.Enum):
    scheduled = "scheduled"
    live = "live"
    ended = "ended"
    cancelled = "cancelled"


class ParticipantRole(str, enum.Enum):
    host = "host"
    co_host = "co_host"
    attendee = "attendee"


def _enum(enum_cls: type) -> Enum:
    # Store enum *values* as plain strings (portable, readable in the DB file).
    return Enum(enum_cls, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    avatar_color: Mapped[str] = mapped_column(String(7))
    personal_meeting_id: Mapped[str] = mapped_column(String(11), unique=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    hosted_meetings: Mapped[List["Meeting"]] = relationship(back_populates="host")
    participations: Mapped[List["Participant"]] = relationship(back_populates="user")


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_code: Mapped[str] = mapped_column(String(11), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    type: Mapped[MeetingType] = mapped_column(_enum(MeetingType))
    status: Mapped[MeetingStatus] = mapped_column(_enum(MeetingStatus))
    scheduled_start: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    passcode: Mapped[str] = mapped_column(String(10))
    invite_link: Mapped[str] = mapped_column(String(500))
    waiting_room_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mute_on_entry: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    started_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)

    host: Mapped[User] = relationship(back_populates="hosted_meetings")
    participants: Mapped[List["Participant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )
    chat_messages: Mapped[List["ChatMessage"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def host_name(self) -> str:
        return self.host.name

    @property
    def participant_count(self) -> int:
        return len(self.participants)

    # Dashboard queries filter by host + status and sort by start time.
    __table_args__ = (Index("ix_meetings_host_status", "host_id", "status"),)


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    # Null for guests who joined through a link without being a known user.
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    display_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[ParticipantRole] = mapped_column(_enum(ParticipantRole), default=ParticipantRole.attendee)
    joined_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    left_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_video_on: Mapped[bool] = mapped_column(Boolean, default=True)
    is_removed: Mapped[bool] = mapped_column(Boolean, default=False)

    meeting: Mapped[Meeting] = relationship(back_populates="participants")
    user: Mapped[Optional[User]] = relationship(back_populates="participations")
    messages: Mapped[List["ChatMessage"]] = relationship(back_populates="participant", passive_deletes=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    participant_id: Mapped[int] = mapped_column(ForeignKey("participants.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text)
    sent_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    meeting: Mapped[Meeting] = relationship(back_populates="chat_messages")
    participant: Mapped[Participant] = relationship(back_populates="messages")

    @property
    def sender_name(self) -> str:
        return self.participant.display_name
