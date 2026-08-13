from typing import Literal

from pydantic import BaseModel


class SupervisorPreferenceUpdate(BaseModel):
    refresh_seconds: Literal[5, 15, 30, 60] = 15
    alert_sounds_enabled: bool = True
    in_app_notifications_enabled: bool = True
    default_landing_route: Literal["/supervisor", "/supervisor/activity", "/supervisor/escalations"] = "/supervisor"
