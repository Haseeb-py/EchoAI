import os
import platform
import sys

# Work around Python 3.14 WMI hang inside platform.machine() on Windows.
if sys.platform.startswith("win") and os.getenv("SQLALCHEMY_PLATFORM_PATCH", "1") == "1":
    platform.machine = lambda: os.getenv("PROCESSOR_ARCHITECTURE", "AMD64")

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from app.models.user import User  # noqa: E402, F401
from app.models.script import Script  # noqa: E402, F401
from app.models.persona import Persona  # noqa: E402, F401
from app.models.campaign import Campaign  # noqa: E402, F401
