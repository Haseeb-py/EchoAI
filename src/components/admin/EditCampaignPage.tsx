"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { AdminFormField, AdminMessage, AdminPanel, AdminScreenShell } from "@/components/admin/AdminScreenShell";
import { apiGet, apiPut } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

const defaultDraft = {
  name: "",
  product: "",
  audience: "",
  goal: "",
};

type CampaignRecord = {
  id: string;
  name: string;
  product: string;
  audience: string;
  goal?: string;
  context?: string;
  status: string;
};

export default function EditCampaignPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = typeof params.campaignId === "string" ? params.campaignId : "";
  const [draft, setDraft] = useState(defaultDraft);
  const [status, setStatus] = useState("Draft");
  const [message, setMessage] = useState("Update campaign details and save your changes.");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCampaign() {
      try {
        const token = getStoredAuthToken();
        const campaign = await apiGet<CampaignRecord>(`/api/admin/campaigns/${campaignId}`, token);
        if (cancelled) {
          return;
        }

        setDraft({
          name: campaign.name || "",
          product: campaign.product || "",
          audience: campaign.audience || "",
          goal: campaign.goal || campaign.context || "",
        });
        setStatus(campaign.status ? campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) : "Draft");
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Unable to load campaign.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (campaignId) {
      loadCampaign();
    }

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const updateField = (key: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveChanges = async () => {
    if (!draft.name.trim() || !draft.product.trim() || !draft.audience.trim() || !draft.goal.trim()) {
      setMessage("Complete all fields before saving.");
      return;
    }

    setSaving(true);
    try {
      const token = getStoredAuthToken();
      await apiPut(`/api/admin/campaigns/${campaignId}`, {
        name: draft.name.trim(),
        product: draft.product.trim(),
        audience: draft.audience.trim(),
        goal: draft.goal.trim(),
      }, token);
      setMessage("Campaign updated successfully.");
      router.push("/admin/campaigns");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminScreenShell
      activeKey="campaigns"
      contextLabel="Campaign Editor"
      eyebrow="Admin / Campaigns"
      title="Edit Campaign"
      description="Update the campaign container details for name, product, audience, and goal."
    >
      <AdminPanel className="max-w-[720px]">
        {loading ? (
          <AdminMessage>Loading campaign data...</AdminMessage>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 text-[12px] text-white/60">
              <span>Status: {status}</span>
              <button
                type="button"
                onClick={() => router.push("/admin/campaigns")}
                className="inline-flex items-center gap-2 rounded-[10px] border border-white/12 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80 hover:bg-white/[0.06]"
              >
                <X size={14} strokeWidth={2.1} aria-hidden="true" />
                Cancel
              </button>
            </div>

            <AdminFormField label="Campaign Name" value={draft.name} onChange={(value) => updateField("name", value)} />
            <AdminFormField label="Product / Service" value={draft.product} onChange={(value) => updateField("product", value)} />
            <AdminFormField label="Target Audience" value={draft.audience} onChange={(value) => updateField("audience", value)} />
            <AdminFormField label="Campaign Goal" value={draft.goal} onChange={(value) => updateField("goal", value)} lines={3} />

            <button
              type="button"
              onClick={saveChanges}
              disabled={saving}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#b9b7ff] px-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#20264b] hover:bg-[#c8c6ff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} strokeWidth={2.1} aria-hidden="true" />
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <AdminMessage>{message}</AdminMessage>
          </div>
        )}
      </AdminPanel>
    </AdminScreenShell>
  );
}
