from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserOut


class SignupPayload(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    companyName: str | None = Field(default=None, max_length=160)
    companyDescription: str | None = Field(default=None, max_length=400)
    email: EmailStr
    phoneNumber: str | None = Field(default=None, max_length=40)
    country: str | None = Field(default=None, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    role: str = "agent"


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
