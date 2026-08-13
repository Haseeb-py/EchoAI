"""Deprecated compatibility alias for the canonical ``app.main`` entry point.

Use ``uvicorn app.main:app --reload`` for all new development. Keeping this
module avoids breaking historical commands without registering routes twice.
"""

from app.main import app
