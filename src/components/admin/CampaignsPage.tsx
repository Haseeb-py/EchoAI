"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, Megaphone, Pencil, Radio, SlidersHorizontal, Trash2 } from "lucide-react";
import { AdminHeader, AdminSidebar } from "@/components/admin/AdminNavigation";
import { Badge, Card, ProgressBar } from "@/components/ui/ui-components";
import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

const CAMPAIGN_DRAFT_KEY = "echoai_campaign_draft";

type CampaignDraftForm = {
  name: string;
  product: string;
  audience: string;
  goal: string;
};

type CampaignRecord = {
  id: string;
  name: string;
  product: string;
  audience: string;
  goal?: string;
  context?: string;
  status: string;
  script_id?: string | null;
  persona_id?: string | null;
};

const fallbackCampaigns: CampaignRecord[] = [];

const lifecycle = [
  "Create campaign draft",
  "Attach lead list and product context",
  "Configure script and persona in M7",
  "Review readiness and activate",
];

export default function CampaignsPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<CampaignDraftForm>({
    name: "Q3 Support Automation Pilot",
    product: "AI-managed support and sales calls",
    audience: "BPO owners with 50+ agents",
    goal: "Qualify prospects for a 90-day pilot",
  });
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(fallbackCampaigns);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const loadCampaigns = useCallback(async () => {
    try {
      const token = getStoredAuthToken();
      const data = await apiGet<CampaignRecord[]>("/api/admin/campaigns", token);
      setCampaigns(data);
      setApiError("");
    } catch (fetchError) {
      setApiError(fetchError instanceof Error ? fetchError.message : "Unable to load campaigns.");
      setCampaigns(fallbackCampaigns);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchCampaigns() {
      if (cancelled) {
        return;
      }

      await loadCampaigns();
    }

    fetchCampaigns();
    return () => {
      cancelled = true;
    };
  }, [loadCampaigns]);

  const campaignCards = useMemo(() => {
    return campaigns.map((campaign) => {
      const hasScript = Boolean(campaign.script_id);
      const hasPersona = Boolean(campaign.persona_id);
      const hasContext = Boolean((campaign.goal || campaign.context || "").trim());
      const setupScore = Math.round(((Number(hasScript) + Number(hasPersona) + Number(hasContext)) / 3) * 100);
      const statusLabel = campaign.status ? campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) : "Draft";

      return {
        ...campaign,
        statusLabel,
        setup: setupScore,
        leads: "-",
        persona: campaign.persona_id ? "Linked" : "Unassigned",
      };
    });
  }, [campaigns]);

  const saveDraftAndContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanedDraft = {
      name: draft.name.trim(),
      product: draft.product.trim(),
      audience: draft.audience.trim(),
      goal: draft.goal.trim(),
      status: "Draft",
      createdAt: new Date().toISOString(),
    };

    if (!cleanedDraft.name || !cleanedDraft.product || !cleanedDraft.audience || !cleanedDraft.goal) {
      setError("Complete all campaign fields before moving to script setup.");
      return;
    }

    try {
      const token = getStoredAuthToken();
      const created = await apiPost<CampaignRecord>("/api/admin/campaigns", {
        name: cleanedDraft.name,
        product: cleanedDraft.product,
        audience: cleanedDraft.audience,
        goal: cleanedDraft.goal,
        status: "draft",
      }, token);

      localStorage.setItem(
        CAMPAIGN_DRAFT_KEY,
        JSON.stringify({
          ...cleanedDraft,
          id: created.id,
          status: created.status || "Draft",
        })
      );
      setError("");
      router.push("/admin/setup");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create campaign.");
    }
  };

  const openExistingCampaign = (campaign: CampaignRecord) => {
    localStorage.setItem(
      CAMPAIGN_DRAFT_KEY,
      JSON.stringify({
        id: campaign.id,
        name: campaign.name,
        product: campaign.product,
        audience: campaign.audience,
        goal: campaign.goal || campaign.context || "",
        status: campaign.status,
        persona: campaign.persona_id ? "Linked" : "",
        createdAt: new Date().toISOString(),
      })
    );
    router.push("/admin/setup");
  };

  const openEditCampaign = (campaignId: string) => {
    router.push(`/admin/campaigns/${campaignId}/edit`);
  };

  const activateCampaign = async (campaignId: string) => {
    try {
      const token = getStoredAuthToken();
      await apiPost(`/api/admin/campaigns/${campaignId}/activate`, undefined, token);
      await loadCampaigns();
    } catch (activateError) {
      setApiError(activateError instanceof Error ? activateError.message : "Unable to activate campaign.");
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this campaign? This cannot be undone.");
    if (!confirmed) {
      return;
    }

    try {
      const token = getStoredAuthToken();
      await apiDelete(`/api/admin/campaigns/${campaignId}`, token);
      await loadCampaigns();
    } catch (deleteError) {
      setApiError(deleteError instanceof Error ? deleteError.message : "Unable to delete campaign.");
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080A13] text-white">
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_24%_12%,rgba(118,107,255,0.14),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(242,167,250,0.08),transparent_30%),#0D0F1A]">
        <AdminSidebar activeKey="campaigns" />

        <main className="flex-1">
          <AdminHeader contextLabel="Campaigns" showPrimaryAction={false} />

          <section className="px-5 pb-8 pt-5 md:px-6">
            <div className="mb-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
                  Admin Campaigns / Lifecycle Control
                </div>
                <h1 className="mt-2 max-w-[760px] font-headline text-[50px] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
                  Campaign Management
                </h1>
                <p className="mt-4 max-w-[720px] text-[14px] leading-7 text-white/56">
                  Create campaign containers first, then open script and persona setup for a selected campaign before activation.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Campaign Records</div>
                    <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">All Campaigns</h2>
                  </div>
                  <Badge color="primary" className="!uppercase !tracking-[0.1em]">{campaignCards.length} Total</Badge>
                </div>

                <div className="space-y-3">
                  {loading ? (
                    <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-4 text-[12px] text-white/60">
                      Loading campaigns...
                    </div>
                  ) : null}
                  {apiError ? (
                    <div className="rounded-[14px] border border-red-400/20 bg-red-500/10 p-4 text-[12px] text-red-200">
                      {apiError}
                    </div>
                  ) : null}
                  {campaignCards.map((campaign) => (
                    <div key={campaign.id} className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-headline text-[21px] font-semibold leading-tight tracking-[-0.03em] text-white">{campaign.name}</h3>
                            <Badge color={campaign.status === "active" ? "success" : "tertiary"} className="!uppercase !tracking-[0.1em]">
                              {campaign.statusLabel}
                            </Badge>
                          </div>
                          <p className="mt-1.5 text-[12px] leading-5 text-white/48">
                            {campaign.product} for {campaign.audience}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openEditCampaign(campaign.id)} className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]" aria-label="Edit campaign">
                            <Pencil size={14} strokeWidth={2.1} aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => deleteCampaign(campaign.id)} className="grid h-9 w-9 place-items-center rounded-[10px] border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" aria-label="Delete campaign">
                            <Trash2 size={14} strokeWidth={2.1} aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <div className="rounded-[11px] border border-white/[0.05] bg-[#151824] p-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/36">Lead List</div>
                          <div className="mt-1 text-[16px] font-semibold text-white">{campaign.leads}</div>
                        </div>
                        <div className="rounded-[11px] border border-white/[0.05] bg-[#151824] p-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/36">Persona</div>
                          <div className="mt-1 text-[16px] font-semibold text-white">{campaign.persona}</div>
                        </div>
                        <div className="rounded-[11px] border border-white/[0.05] bg-[#151824] p-2.5">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/36">Setup</div>
                          <div className="mt-1 text-[16px] font-semibold text-white">{campaign.setup}%</div>
                        </div>
                      </div>

                      <ProgressBar value={campaign.setup} color={campaign.setup > 80 ? "primary" : "tertiary"} className="mt-3" />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openExistingCampaign(campaign)}
                          className="inline-flex h-8 items-center gap-2 rounded-[9px] border border-white/12 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/82 hover:bg-white/[0.06]"
                        >
                          <SlidersHorizontal size={14} strokeWidth={2.1} aria-hidden="true" />
                          Open Setup
                        </button>
                        <button
                          type="button"
                          onClick={() => activateCampaign(campaign.id)}
                          className="inline-flex h-8 items-center gap-2 rounded-[9px] bg-[#b9b7ff] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#20264b] disabled:opacity-50"
                          disabled={campaign.status !== "draft" || campaign.setup < 100}
                        >
                          <Radio size={14} strokeWidth={2.1} aria-hidden="true" />
                          Activate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="space-y-4">
                <Card className="!rounded-[24px] !border-[#b9b7ff]/35 !bg-[radial-gradient(circle_at_84%_16%,rgba(185,183,255,0.28),transparent_42%),radial-gradient(circle_at_18%_8%,rgba(246,197,111,0.1),transparent_34%),linear-gradient(180deg,rgba(23,26,44,0.98),rgba(15,18,31,0.98))] !p-7 shadow-[0_0_0_1px_rgba(185,183,255,0.08),0_24px_70px_rgba(4,5,12,0.46)]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-14 w-14 place-items-center rounded-[17px] border border-[#b9b7ff]/28 bg-[#b9b7ff]/14 text-[#d9dcff] shadow-[0_0_20px_rgba(185,183,255,0.18)]">
                      <Megaphone size={23} strokeWidth={2.1} aria-hidden="true" />
                    </span>
                    <div>
                      <div className="inline-flex rounded-full border border-[#f6c56f]/22 bg-[#f6c56f]/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#f8dc9b]">
                        Step 01 / Required
                      </div>
                      <h2 className="mt-3 font-headline text-[42px] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
                        Create new campaign
                      </h2>
                    </div>
                  </div>
                  <p className="mt-5 max-w-[680px] text-[15px] leading-7 text-white/64">
                    Start here. Create the campaign container first, then continue to script and persona setup for this draft.
                  </p>

                  <form onSubmit={saveDraftAndContinue}>
                    <div className="mt-7 space-y-5">
                      <CampaignField
                        label="Campaign Name"
                        value={draft.name}
                        onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
                      />
                      <CampaignField
                        label="Product / Service"
                        value={draft.product}
                        onChange={(value) => setDraft((current) => ({ ...current, product: value }))}
                      />
                      <CampaignField
                        label="Target Audience"
                        value={draft.audience}
                        onChange={(value) => setDraft((current) => ({ ...current, audience: value }))}
                      />
                      <CampaignField
                        label="Campaign Goal"
                        value={draft.goal}
                        onChange={(value) => setDraft((current) => ({ ...current, goal: value }))}
                      />
                    </div>

                    {error && (
                      <p className="mt-4 rounded-[11px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-[12px] font-medium text-red-200">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-[13px] bg-[#b9b7ff] text-[14px] font-semibold uppercase tracking-[0.13em] text-[#20264b] shadow-[0_0_28px_rgba(185,183,255,0.34)] transition-colors hover:bg-[#c8c6ff]"
                    >
                      Create Campaign & Continue
                      <ArrowRight size={14} strokeWidth={2.1} aria-hidden="true" />
                    </button>
                  </form>
                </Card>

                <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <Clock3 size={18} strokeWidth={2.1} className="text-[#f6c56f]" aria-hidden="true" />
                    <h2 className="font-headline text-[26px] font-semibold tracking-[-0.03em] text-white">Lifecycle</h2>
                  </div>

                  <div className="space-y-3">
                    {lifecycle.map((item, index) => (
                      <div key={item} className="flex items-center gap-3 rounded-[13px] border border-white/[0.06] bg-white/[0.025] p-3">
                        <span className={index < 2 ? "text-[#a7f3c4]" : "text-white/34"}>
                          <CheckCircle2 size={15} strokeWidth={2.1} aria-hidden="true" />
                        </span>
                        <span className="text-[13px] text-white/74">{item}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function CampaignField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-[13px] border border-white/[0.06] bg-[#151824] p-3 transition-colors focus-within:border-[#b9b7ff]/38">
      <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-white/36">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-[13px] leading-6 text-white/84 outline-none placeholder:text-white/24"
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </label>
  );
}
