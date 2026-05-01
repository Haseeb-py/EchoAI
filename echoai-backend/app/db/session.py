import os
import platform
import sys

# Work around Python 3.14 WMI hang inside platform.machine() on Windows.
if sys.platform.startswith("win") and os.getenv("SQLALCHEMY_PLATFORM_PATCH", "1") == "1":
	platform.machine = lambda: os.getenv("PROCESSOR_ARCHITECTURE", "AMD64")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
