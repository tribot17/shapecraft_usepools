from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy import String, DateTime, func, BigInteger, Text, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    # Align with Neon schema: store UUIDs as text (generated in app)
    user_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(320), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    wallet_address: Mapped[str | None] = mapped_column(String(128), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    message_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    conversation_id: Mapped[str] = mapped_column(String(128))
    user_question: Mapped[str] = mapped_column(Text)
    rewritten_question: Mapped[str | None] = mapped_column(Text, nullable=True)
    intent: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ai_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_conv_user_id", "user_id"),
        Index("ix_conv_conversation_id", "conversation_id"),
        Index("ix_conv_user_conv_created", "user_id", "conversation_id", "created_at"),
    )

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

class IntentType(str, Enum):
    SMALL_TALK = "small_talk"
    FLIGHT_SEARCH = "flight_search"
    HOTEL_SEARCH = "hotel_search"
    RESTAURANT_SEARCH = "restaurant_search"
    ACTIVITY_SEARCH = "activity_search"
    BOOKING = "booking"
    MEMORY_VIEW = "memory_view"
    MEMORY_EDIT = "memory_edit"
    GROUP_PLANNING = "group_planning"
    PAYMENT = "payment"
    FORGET_ME = "forget_me"

class UserPreferences(BaseModel):
    dietary_restrictions: List[str] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    budget_range: Optional[str] = None  # "budget", "moderate", "luxury"
    preferred_cuisines: List[str] = Field(default_factory=list)
    travel_style: Optional[str] = None  # "adventure", "relaxation", "cultural", "business"
    accommodation_type: List[str] = Field(default_factory=list)  # "hotel", "hostel", "apartment"
    frequent_destinations: List[str] = Field(default_factory=list)
    activities_liked: List[str] = Field(default_factory=list)
    activities_disliked: List[str] = Field(default_factory=list)

class UserProfile(BaseModel):
    user_id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    feedback_history: List[Dict[str, Any]] = Field(default_factory=list)

class Message(BaseModel):
    message_id: int
    user_id: int
    text: str
    timestamp: datetime = Field(default_factory=datetime.now)
    is_bot: bool = False
    intent: Optional[IntentType] = None
    rewritten_query: Optional[str] = None

class Conversation(BaseModel):
    chat_id: int
    messages: List[Message] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_group: bool = False
    group_members: List[int] = Field(default_factory=list)

class FlightOption(BaseModel):
    airline: str
    departure_time: str
    arrival_time: str
    duration: str
    price: float
    currency: str
    booking_link: str
    stops: int = 0

class HotelOption(BaseModel):
    name: str
    rating: float
    price_per_night: float
    currency: str
    location: str
    amenities: List[str]
    booking_link: str

class RestaurantOption(BaseModel):
    name: str
    cuisine: str
    price_range: str
    rating: float
    location: str
    description: str
    booking_link: Optional[str] = None

class ActivityOption(BaseModel):
    name: str
    type: str
    duration: str
    price: float
    currency: str
    rating: float
    description: str
    booking_link: str

class TravelSuggestion(BaseModel):
    flights: List[FlightOption] = Field(default_factory=list)
    hotels: List[HotelOption] = Field(default_factory=list)
    restaurants: List[RestaurantOption] = Field(default_factory=list)
    activities: List[ActivityOption] = Field(default_factory=list)
    total_estimated_cost: Optional[float] = None
    currency: str = "USD"

class BookingRequest(BaseModel):
    user_id: int
    chat_id: int
    items: List[Dict[str, Any]]
    total_amount: float
    currency: str
    payment_status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.now)
