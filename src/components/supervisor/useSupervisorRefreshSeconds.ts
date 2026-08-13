"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type Preference = { refresh_seconds: 5 | 15 | 30 | 60 };

export function useSupervisorRefreshSeconds() {
  const [refreshSeconds, setRefreshSeconds] = useState<Preference["refresh_seconds"]>(15);

  useEffect(() => {
    let cancelled = false;
    async function loadPreference() {
      try {
        const preference = await apiGet<Preference>("/api/supervisor/preferences", getStoredAuthToken());
        if (!cancelled) setRefreshSeconds(preference.refresh_seconds);
      } catch {
        // Keep the safe default when the preference service is unavailable.
      }
    }
    void loadPreference();
    return () => { cancelled = true; };
  }, []);

  return refreshSeconds;
}
