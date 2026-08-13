from typing import Literal

from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    status: str

    class Config:
        from_attributes = True


class UserAdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["agent", "supervisor", "admin"] = "agent"
    status: Literal["active", "inactive", "locked"] = "active"


class UserAdminUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    role: Literal["agent", "supervisor", "admin"] | None = None
    status: Literal["active", "inactive", "locked"] | None = None


class PasswordResetResponse(BaseModel):
    temporary_password: str
