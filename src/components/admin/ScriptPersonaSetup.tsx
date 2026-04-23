"use client";

import { ChangeEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  FileText,
  Flame,
  Gauge,
  Megaphone,
  PenLine,
  Radio,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { AdminHeader, AdminSidebar } from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/Button";
import { Badge, Card, ProgressBar } from "@/components/ui/ui-components";

const CAMPAIGN_DRAFT_KEY = "echoai_campaign_draft";

type CampaignDraft = {
  name: string;
  product: string;
  audience: string;
  goal: string;
  status?: string;
  persona?: string;
  scriptName?: string;
  scriptText?: string;
  updatedAt?: string;
};

type PersonaColor = "primary" | "secondary" | "tertiary";

const personas: Array<{ name: string; tone: string; color: PersonaColor; posture: string }> = [
  {
    name: "Professional",
    tone: "Clear, measured, enterprise-safe",
    color: "primary",
    posture: "Confident, calm, conversion-aware",
  },
  {
    name: "Friendly",
    tone: "Warm, conversational, rapport-first",
    color: "secondary",
    posture: "Warm, helpful, relationship-aware",
  },
  {
    name: "Empathetic",
    tone: "Calm, reassuring, objection-aware",
    color: "tertiary",
    posture: "Patient, supportive, trust-aware",
  },
];

const fallbackDraft: CampaignDraft = {
  name: "Q3 Support Automation Pilot",
  product: "AI-managed support and sales calls",
  audience: "BPO owners with 50+ agents",
  goal: "Qualify prospects for a 90-day pilot",
  status: "Draft",
};

const defaultScriptText =
  "Hi, this is EchoAI calling on behalf of your operations team. I noticed your support queue has been scaling quickly, and I wanted to understand where automation could reduce manual workload.\n\nIf the customer raises a price concern, validate the concern first, then offer a 90-day pilot instead of discounting immediately.\n\nThe goal is to qualify urgency, identify current pain points, and route high-intent leads into the follow-up workflow.";

function FieldBlock({
  label,
  value,
  onChange,
  lines = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  lines?: number;
}) {
  const inputClass =
    "w-full rounded-[13px] border border-white/[0.08] bg-[#191c28] px-4 py-3 text-[13px] leading-6 text-white/84 outline-none transition-colors placeholder:text-white/28 focus:border-[#b9b7ff]/40";

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">{label}</span>
      {lines > 1 ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={lines}
          className={`${inputClass} min-h-[104px] resize-none`}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      )}
    </label>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  action,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] border border-white/10 bg-white/[0.04] text-[#c9ccff]">
          {icon}
        </span>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/36">{eyebrow}</div>
          <h2 className="mt-1 font-headline text-[24px] font-semibold leading-tight tracking-[-0.03em] text-white">
            {title}
          </h2>
        </div>
      </div>
      {action}
    </div>
  );
}

export default function ScriptPersonaSetup() {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [campaignName, setCampaignName] = useState(fallbackDraft.name);
  const [productName, setProductName] = useState(fallbackDraft.product);
  const [campaignGoal, setCampaignGoal] = useState(fallbackDraft.goal);
  const [targetSegment, setTargetSegment] = useState(fallbackDraft.audience);
  const [selectedPersona, setSelectedPersona] = useState("Professional");
  const [scriptName, setScriptName] = useState("enterprise_outbound_v2.txt");
  const [scriptText, setScriptText] = useState(defaultScriptText);
  const [status, setStatus] = useState("Draft");
  const [feedback, setFeedback] = useState("Campaign setup is editable. Changes stay in this browser until backend integration.");

  useEffect(() => {
    const storedDraft = localStorage.getItem(CAMPAIGN_DRAFT_KEY);
    if (!storedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(storedDraft) as Partial<CampaignDraft>;
      setCampaignName(parsed.name || fallbackDraft.name);
      setProductName(parsed.product || fallbackDraft.product);
      setCampaignGoal(parsed.goal || fallbackDraft.goal);
      setTargetSegment(parsed.audience || fallbackDraft.audience);
      setSelectedPersona(parsed.persona || "Professional");
      setScriptName(parsed.scriptName || "enterprise_outbound_v2.txt");
      setScriptText(parsed.scriptText || defaultScriptText);
      setStatus(parsed.status || "Draft");
    } catch {
      setFeedback("Saved draft could not be loaded, so M7 is using the default campaign setup.");
    }
  }, []);

  const selectedPersonaConfig = personas.find((persona) => persona.name === selectedPersona) || personas[0];
  const hasScript = Boolean(scriptName.trim() && scriptText.trim());
  const hasPersona = Boolean(selectedPersona.trim());
  const hasContext = Boolean(productName.trim() && campaignGoal.trim() && targetSegment.trim());
  const canActivate = hasScript && hasPersona && hasContext;

  const readiness = [
    { label: "Script assigned", value: hasScript ? scriptName : "Upload or write a script", done: hasScript },
    { label: "Persona selected", value: hasPersona ? selectedPersona : "Select an AI persona", done: hasPersona },
    { label: "Campaign context", value: hasContext ? productName : "Complete product, goal, and audience", done: hasContext },
    { label: "Activation gate", value: canActivate ? "Ready for agent launch" : "Finish required setup first", done: canActivate },
  ];

  const readinessScore = Math.round((readiness.filter((item) => item.done).length / readiness.length) * 100);

  const scriptSections = useMemo(
    () => [
      { title: "Opening", status: hasScript ? "Ready" : "Missing", progress: hasScript ? 100 : 20 },
      { title: "Discovery", status: hasScript ? "Ready" : "Missing", progress: hasScript ? 88 : 20 },
      { title: "Price Objection", status: scriptText.toLowerCase().includes("price") ? "Counter-script" : "Needs copy", progress: scriptText.toLowerCase().includes("price") ? 74 : 38 },
      { title: "Trust Objection", status: scriptText.toLowerCase().includes("trust") ? "Ready" : "Needs review", progress: scriptText.toLowerCase().includes("trust") ? 82 : 52 },
    ],
    [hasScript, scriptText]
  );

  const saveDraft = (nextStatus = status) => {
    localStorage.setItem(
      CAMPAIGN_DRAFT_KEY,
      JSON.stringify({
        name: campaignName.trim() || fallbackDraft.name,
        product: productName.trim(),
        audience: targetSegment.trim(),
        goal: campaignGoal.trim(),
        status: nextStatus,
        persona: selectedPersona,
        scriptName,
        scriptText,
        updatedAt: new Date().toISOString(),
      })
    );
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setScriptName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const fileText = typeof reader.result === "string" ? reader.result : "";
      setScriptText(fileText || defaultScriptText);
      setFeedback(`${file.name} loaded into the script editor.`);
    };
    reader.readAsText(file);
  };

  const moveToDraft = () => {
    setStatus("Draft");
    saveDraft("Draft");
    setFeedback("Campaign moved to draft. You can safely continue editing setup details.");
  };

  const activateCampaign = () => {
    if (!canActivate) {
      setFeedback("Activation is locked until script, persona, and campaign context are complete.");
      return;
    }

    setStatus("Active");
    saveDraft("Active");
    setFeedback("Campaign activated locally. Backend activation can be connected in the next integration phase.");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080A13] text-white">
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_24%_12%,rgba(118,107,255,0.14),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(242,167,250,0.08),transparent_30%),#0D0F1A]">
        <AdminSidebar activeKey="setup" />

        <main className="flex-1">
          <AdminHeader
            contextLabel="Script Setup"
            primaryActionLabel="Back to Campaigns"
            primaryActionHref="/admin/campaigns"
            showInviteAction={false}
          />

          <section className="px-5 pb-8 pt-5 md:px-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
                  Admin Configuration / Mockup M7
                </div>
                <h1 className="mt-2 max-w-[760px] font-headline text-[50px] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
                  Script & Persona Setup
                </h1>
                <p className="mt-4 max-w-[720px] text-[14px] leading-7 text-white/56">
                  Configure the campaign script, AI tone, and activation context before agents can launch AI-managed call sessions.
                </p>
                <p className="mt-3 max-w-[720px] rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] leading-5 text-white/54" aria-live="polite">
                  {feedback}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outlined"
                  size="md"
                  onClick={moveToDraft}
                  className="!rounded-[10px] !border-white/15 !bg-white/[0.03] !text-[13px] !font-semibold !tracking-[0.08em]"
                >
                  Move to Draft
                </Button>
                <Button
                  type="button"
                  size="md"
                  disabled={!canActivate}
                  onClick={activateCampaign}
                  className="!rounded-[10px] !bg-[#b9b7ff] !text-[13px] !font-semibold !tracking-[0.08em] !text-[#20264b]"
                  leftIcon={<Radio size={15} strokeWidth={2.2} aria-hidden="true" />}
                >
                  Activate Campaign
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.16fr_0.84fr]">
              <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
                <SectionHeader
                  icon={<UploadCloud size={18} strokeWidth={2.1} aria-hidden="true" />}
                  eyebrow="Step 01"
                  title="Upload and manage sales scripts"
                  action={
                    <>
                      <input ref={uploadInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileUpload} />
                      <Button
                        type="button"
                        variant="outlined"
                        size="sm"
                        onClick={() => uploadInputRef.current?.click()}
                        className="!h-9 !rounded-[10px] !text-[11px] !uppercase !tracking-[0.12em]"
                      >
                        Upload Script
                      </Button>
                    </>
                  }
                />

                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-[16px] border border-dashed border-[#8f92ff]/28 bg-[#171a28] p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-[#8f92ff]/22 bg-[#777dff]/12 text-[#cfd2ff]">
                        <FileText size={20} strokeWidth={2.1} aria-hidden="true" />
                      </span>
                      <div>
                        <div className="break-all text-[16px] font-semibold text-white">{scriptName || "No script selected"}</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.13em] text-white/38">
                          Text script / {scriptSections.length} sections
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {scriptSections.map((section) => (
                        <div key={section.title} className="rounded-[13px] border border-white/[0.06] bg-white/[0.025] p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[13px] font-medium text-white/86">{section.title}</span>
                            <span className="text-[10px] uppercase tracking-[0.12em] text-white/38">{section.status}</span>
                          </div>
                          <ProgressBar value={section.progress} color={section.progress > 80 ? "primary" : section.progress > 60 ? "secondary" : "tertiary"} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-white/[0.06] bg-[#151824] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Script Editor Preview</div>
                      <Badge color={hasScript ? "success" : "neutral"} className="!text-[10px] !uppercase !tracking-[0.1em]">
                        {hasScript ? "Editable" : "Empty"}
                      </Badge>
                    </div>
                    <textarea
                      value={scriptText}
                      onChange={(event) => setScriptText(event.target.value)}
                      rows={12}
                      className="min-h-[260px] w-full resize-none rounded-[14px] border border-white/[0.06] bg-[#111420] p-4 text-[13px] leading-6 text-white/76 outline-none transition-colors placeholder:text-white/28 focus:border-[#b9b7ff]/36"
                      placeholder="Write or upload the call script here..."
                    />
                  </div>
                </div>
              </Card>

              <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
                <SectionHeader
                  icon={<Bot size={18} strokeWidth={2.1} aria-hidden="true" />}
                  eyebrow="Step 02"
                  title="Select AI persona"
                />

                <div className="space-y-3">
                  {personas.map((persona) => {
                    const isActive = selectedPersona === persona.name;

                    return (
                      <button
                        key={persona.name}
                        type="button"
                        onClick={() => {
                          setSelectedPersona(persona.name);
                          setFeedback(`${persona.name} persona selected for this campaign.`);
                        }}
                        className={[
                          "flex w-full items-center justify-between rounded-[15px] border px-4 py-4 text-left transition-all",
                          isActive
                            ? "border-[#8f92ff]/35 bg-[#282d4a] shadow-[0_0_18px_rgba(143,146,255,0.16)]"
                            : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.04]",
                        ].join(" ")}
                      >
                        <span>
                          <span className="block text-[16px] font-semibold text-white">{persona.name}</span>
                          <span className="mt-1 block text-[12px] text-white/48">{persona.tone}</span>
                        </span>
                        <Badge color={persona.color} className="!text-[10px] !uppercase !tracking-[0.1em]">
                          {isActive ? "Active" : "Option"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-[16px] border border-white/[0.06] bg-[radial-gradient(circle_at_80%_20%,rgba(122,211,216,0.16),transparent_40%),#151824] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">
                    <Radio size={14} strokeWidth={2.1} aria-hidden="true" />
                    Voice posture
                  </div>
                  <div className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#d9dcff]">
                    {selectedPersonaConfig.posture}
                  </div>
                  <p className="mt-3 text-[12px] leading-6 text-white/50">
                    Persona tone is applied per campaign and used by the AI during discovery and objection handling.
                  </p>
                </div>
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr_0.78fr]">
              <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
                <SectionHeader
                  icon={<Megaphone size={18} strokeWidth={2.1} aria-hidden="true" />}
                  eyebrow="Step 03"
                  title="Campaign context"
                />

                <div className="space-y-4">
                  <FieldBlock label="Product Name" value={productName} onChange={setProductName} />
                  <FieldBlock label="Campaign Goal" value={campaignGoal} onChange={setCampaignGoal} lines={2} />
                  <FieldBlock label="Target Segment" value={targetSegment} onChange={setTargetSegment} lines={2} />
                </div>
              </Card>

              <Card className="!rounded-[18px] !border-white/[0.06] !bg-[#111420] !p-5">
                <SectionHeader
                  icon={<PenLine size={18} strokeWidth={2.1} aria-hidden="true" />}
                  eyebrow="Step 04"
                  title="Assign script to campaign"
                  action={<Badge color={hasScript ? "success" : "neutral"} className="!text-[10px] !uppercase !tracking-[0.1em]">{hasScript ? "1 Script Linked" : "No Script"}</Badge>}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[16px] border border-white/[0.06] bg-[#151824] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Selected Campaign</div>
                    <div className="mt-3 font-headline text-[32px] font-semibold leading-tight tracking-[-0.04em] text-white">
                      {campaignName}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge color="primary">{selectedPersona} Persona</Badge>
                      <Badge color="secondary">Outbound</Badge>
                      <Badge color="neutral">English Only</Badge>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-white/[0.06] bg-[#151824] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Linked Script</div>
                    <div className="mt-3 flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-[#b9b7ff]/14 text-[#d6d8ff]">
                        <FileText size={17} strokeWidth={2.1} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="break-all text-[15px] font-semibold leading-6 text-white">
                          {scriptName || "No script linked yet"}
                        </div>
                        <div className="mt-1 text-[12px] leading-5 text-white/45">
                          Opening, discovery, price objection, and trust objection sections
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outlined"
                      size="sm"
                      onClick={() => uploadInputRef.current?.click()}
                      className="mt-6 !h-9 !rounded-[10px] !text-[11px] !uppercase !tracking-[0.12em]"
                    >
                      Select Different Script
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="!rounded-[18px] !border-[#8f92ff]/16 !bg-[radial-gradient(circle_at_80%_18%,rgba(185,183,255,0.16),transparent_44%),#111420] !p-5">
                <SectionHeader
                  icon={<ShieldCheck size={18} strokeWidth={2.1} aria-hidden="true" />}
                  eyebrow="Activation Gate"
                  title="Launch readiness"
                />

                <div className="space-y-3">
                  {readiness.map((item) => (
                    <div key={item.label} className="flex items-start gap-3 rounded-[13px] border border-white/[0.06] bg-white/[0.025] p-3">
                      <span className={item.done ? "text-[#a7f3c4]" : "text-[#f6c56f]"}>
                        {item.done ? (
                          <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden="true" />
                        ) : (
                          <Flame size={16} strokeWidth={2.2} aria-hidden="true" />
                        )}
                      </span>
                      <span>
                        <span className="block text-[12px] font-semibold uppercase tracking-[0.12em] text-white/44">{item.label}</span>
                        <span className="mt-0.5 block text-[13px] text-white/78">{item.value}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[15px] border border-[#f6c56f]/18 bg-[#f6c56f]/8 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f8dc9b]">
                    <Gauge size={14} strokeWidth={2.1} aria-hidden="true" />
                    Readiness score
                  </div>
                  <div className="mt-2 text-[42px] font-semibold leading-none tracking-[-0.04em] text-white">{readinessScore}%</div>
                  <p className="mt-2 text-[12px] leading-5 text-white/50">
                    {canActivate ? "Everything required is ready for activation." : "Complete each required setup block to unlock activation."}
                  </p>
                </div>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
