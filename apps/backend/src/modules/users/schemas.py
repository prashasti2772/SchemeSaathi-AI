import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from src.modules.users.models import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    role: UserRole = UserRole.CITIZEN

    @field_validator("full_name")
    @classmethod
    def nonblank_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Enter your full name")
        return value

    @field_validator("password")
    @classmethod
    def nonblank_password(cls, value):
        if not value.strip():
            raise ValueError("Enter a password containing visible characters")
        return value


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    mobile: str | None = None
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10, max_length=128)

    @field_validator("new_password")
    @classmethod
    def nonblank_password(cls, value):
        return UserCreate.nonblank_password(value)
