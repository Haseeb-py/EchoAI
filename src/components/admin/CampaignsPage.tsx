"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, Copy, Megaphone, PauseCircle, Radio, SlidersHorizontal } from "lucide-react";
import { AdminHeader, AdminSidebar } from "@/components/admin/AdminNavigation";
import { Badge, Card, ProgressBar } from "@/components/ui/ui-components";

const CAMPAIGN_DRAFT_KEY = "echoai_campaign_draft";

type CampaignDraftForm = {
  name: string;
  product: string;
  audience: string;
  goal: string;
};

const campaigns = [
  {
    name: "Q2 BPO Modernization Sprint",
    status: "Draft",
    product: "EchoAI Voice Automation Suite",
    audience: "Mid-market BPO owners",
    setup: 86,
    leads: "1,240",
    persona: "Professional",
  },
  {
    name: "Telecom Renewal Pilot",
    status: "Draft",
    product: "Retention automation",
    audience: "Telecom renewal accounts",
    setup: 42,
    leads: "680",
    persona: "Empathetic",
  },
  {
    name: "SaaS Expansion Calls",
    status: "Active",
    product: "Expansion package",
    audience: "Existing SaaS accounts",
    setup: 100,
    leads: "2,050",
    persona: "Friendly",
  },
];

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

  const saveDraftAndContinue = (event: FormEvent<HTMLFormElement>) => {
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

    localStorage.setItem(CAMPAIGN_DRAFT_KEY, JSON.stringify(cleanedDraft));
    setError("");
    router.push("/admin/setup");
  };

  const openExistingCampaign = (campaign: (typeof campaigns)[number]) => {
    localStorage.setItem(
      CAMPAIGN_DRAFT_KEY,
      JSON.stringify({
        name: campaign.name,
        product: campaign.product,
        audience: campaign.audience,
        goal: campaign.status === "Active" ? "Optimize active calling performance" : "Complete setup before campaign activation",
        status: campaign.status,
        persona: campaign.persona,
        createdAt: new Date().toISOString(),
      })
    );
    router.push("/admin/setup");
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
                  <Badge color="primary" className="!uppercase !tracking-[0.1em]">3 Total</Badge>
                </div>

                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div key={campaign.name} className="rounded-[14px] border border-white/[0.06] bg-white/[0.025] p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-headline text-[21px] font-semibold leading-tight tracking-[-0.03em] text-white">{campaign.name}</h3>
                            <Badge color={campaign.status === "Active" ? "success" : "tertiary"} className="!uppercase !tracking-[0.1em]">
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="mt-1.5 text-[12px] leading-5 text-white/48">
                            {campaign.product} for {campaign.audience}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]" aria-label="Duplicate campaign">
                            <Copy size={14} strokeWidth={2.1} aria-hidden="true" />
                          </button>
                          <button type="button" className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]" aria-label="Pause campaign">
                            <PauseCircle size={14} strokeWidth={2.1} aria-hidden="true" />
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
                          className="inline-flex h-8 items-center gap-2 rounded-[9px] bg-[#b9b7ff] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#20264b] disabled:opacity-50"
                          disabled={campaign.status !== "Draft" || campaign.setup < 100}
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
