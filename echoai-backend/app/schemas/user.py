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
    role: str = "agent"
    status: str = "active"


class UserAdminUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    role: str | None = None
    status: str | None = None


class PasswordResetResponse(BaseModel):
    temporary_password: str
