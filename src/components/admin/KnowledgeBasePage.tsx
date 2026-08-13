"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  FileText,
  Filter,
  HelpCircle,
  MessageSquareWarning,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { AdminHeader, AdminSidebar } from "@/components/admin/AdminNavigation";
import { AdminFormField, AdminMessage, AdminPanel, AdminSelectField, AdminStatCard } from "@/components/admin/AdminScreenShell";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/ui-components";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type KnowledgeCategory = "Product Info" | "FAQ" | "Objection" | "Pricing" | "Policy";
type KnowledgeStatus = "Draft" | "Published" | "Needs Review";

type KnowledgeItem = {
  id: string;
  campaignId: string | null;
  title: string;
  category: KnowledgeCategory;
  status: KnowledgeStatus;
  campaign: string;
  summary: string;
  updatedAt: string;
};

const categories: KnowledgeCategory[] = ["Product Info", "FAQ", "Objection", "Pricing", "Policy"];
const statuses: KnowledgeStatus[] = ["Draft", "Published", "Needs Review"];
type KnowledgeApiRecord = {
  id: string;
  campaign_id: string | null;
  title: string;
  category: string;
  content: string;
  status: "draft" | "published" | "needs_review";
  updated_at: string;
};

type CampaignRecord = { id: string; name: string; status: string };

function toUiStatus(status: KnowledgeApiRecord["status"]): KnowledgeStatus {
  return status === "published" ? "Published" : status === "needs_review" ? "Needs Review" : "Draft";
}

function toApiStatus(status: KnowledgeStatus): KnowledgeApiRecord["status"] {
  return status === "Published" ? "published" : status === "Needs Review" ? "needs_review" : "draft";
}

function toKnowledgeItem(record: KnowledgeApiRecord): KnowledgeItem {
  return {
    id: record.id,
    campaignId: record.campaign_id,
    title: record.title,
    category: categories.includes(record.category as KnowledgeCategory) ? record.category as KnowledgeCategory : "FAQ",
    status: toUiStatus(record.status),
    campaign: record.campaign_id || "All Campaigns",
    summary: record.content,
    updatedAt: new Date(record.updated_at).toLocaleDateString(),
  };
}

const categoryIcons = {
  "Product Info": <Package size={16} strokeWidth={2.1} aria-hidden="true" />,
  FAQ: <HelpCircle size={16} strokeWidth={2.1} aria-hidden="true" />,
  Objection: <MessageSquareWarning size={16} strokeWidth={2.1} aria-hidden="true" />,
  Pricing: <Tag size={16} strokeWidth={2.1} aria-hidden="true" />,
  Policy: <ShieldCheck size={16} strokeWidth={2.1} aria-hidden="true" />,
};

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<KnowledgeCategory | "All">("All");
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatus | "All">("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [publishedOnly, setPublishedOnly] = useState(false);
  const [message, setMessage] = useState("Loading knowledge base from the backend.");
  const [form, setForm] = useState({
    title: "",
    category: "Product Info" as KnowledgeCategory,
    status: "Draft" as KnowledgeStatus,
    campaign: "All Campaigns",
    summary: "",
  });

  const loadItems = async () => {
    try {
      const token = getStoredAuthToken();
      const [records, campaignRecords] = await Promise.all([
        apiGet<KnowledgeApiRecord[]>("/api/knowledge", token),
        apiGet<CampaignRecord[]>("/api/admin/campaigns", token),
      ]);
      const nextItems = records.map(toKnowledgeItem);
      setItems(nextItems);
      setCampaigns(campaignRecords);
      setSelectedItemId((current) => current || nextItems[0]?.id || null);
      setMessage(nextItems.length ? "Knowledge base loaded from the backend." : "No knowledge entries yet. Create one to make it available for review or retrieval.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load the knowledge base.");
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesPublishedRule = !publishedOnly || item.status === "Published";
      const matchesQuery =
        !searchText ||
        [item.title, item.category, item.status, item.campaign, item.summary].some((value) =>
          value.toLowerCase().includes(searchText)
        );

      return matchesCategory && matchesStatus && matchesPublishedRule && matchesQuery;
    });
  }, [categoryFilter, items, publishedOnly, query, statusFilter]);

  const publishedCount = items.filter((item) => item.status === "Published").length;
  const reviewCount = items.filter((item) => item.status === "Needs Review").length;
  const draftCount = items.filter((item) => item.status === "Draft").length;
  const campaignStatusById = useMemo(() => new Map(campaigns.map((campaign) => [campaign.id, campaign.status])), [campaigns]);
  const isHistoricalScope = (campaignId: string | null) => campaignId !== null && ["completed", "archived"].includes(campaignStatusById.get(campaignId) || "");
  const availableCampaigns = useMemo(
    () => campaigns.filter((campaign) => !["completed", "archived"].includes(campaign.status)),
    [campaigns],
  );

  const resetForm = () => {
    setEditingId(null);
    setOpenMenuId(null);
    setForm({
      title: "",
      category: "Product Info",
      status: "Draft",
      campaign: "All Campaigns",
      summary: "",
    });
  };

  const submitKnowledgeItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = form.title.trim();
    const cleanSummary = form.summary.trim();
    const cleanCampaign = form.campaign.trim();

    if (!cleanTitle || !cleanSummary || !cleanCampaign) {
      setMessage("Please enter title, campaign scope, and knowledge content before saving.");
      return;
    }
    if (cleanCampaign !== "All Campaigns" && isHistoricalScope(cleanCampaign)) {
      setMessage("Knowledge for a completed or archived campaign is read-only. Create revised guidance in a new active campaign.");
      return;
    }

    const payload = { title: cleanTitle, category: form.category, status: toApiStatus(form.status), content: cleanSummary, campaign_id: cleanCampaign === "All Campaigns" ? null : cleanCampaign };
    try {
      const saved = editingId
        ? await apiPut<KnowledgeApiRecord>(`/api/knowledge/${editingId}`, payload, getStoredAuthToken())
        : await apiPost<KnowledgeApiRecord>("/api/knowledge", payload, getStoredAuthToken());
      const nextItem = toKnowledgeItem(saved);
      setItems((current) => editingId ? current.map((item) => item.id === editingId ? nextItem : item) : [nextItem, ...current]);
      setSelectedItemId(nextItem.id);
      setMessage(`${cleanTitle} has been ${editingId ? "updated" : "added"}.`);
      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save the knowledge item.");
    }
  };

  const editItem = (item: KnowledgeItem) => {
    if (isHistoricalScope(item.campaignId)) {
      setMessage("This knowledge belongs to completed or archived campaign history and is read-only.");
      return;
    }
    setSelectedItemId(item.id);
    setOpenMenuId(null);
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category,
      status: item.status,
      campaign: item.campaign,
      summary: item.summary,
    });
    setMessage(`Editing ${item.title}.`);
  };

  const deleteItem = async (id: string) => {
    const item = items.find((current) => current.id === id);
    if (item && isHistoricalScope(item.campaignId)) {
      setMessage("This knowledge belongs to completed or archived campaign history and cannot be deleted.");
      return;
    }
    try {
      await apiDelete(`/api/knowledge/${id}`, getStoredAuthToken());
      const remainingItems = items.filter((item) => item.id !== id);
      setItems(remainingItems);
      setOpenMenuId(null);
      if (editingId === id) resetForm();
      if (selectedItemId === id) setSelectedItemId(remainingItems[0]?.id ?? null);
      setMessage("Knowledge item deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete the knowledge item.");
    }
  };

  const updateStatus = async (id: string, status: KnowledgeStatus) => {
    const item = items.find((current) => current.id === id);
    if (item && isHistoricalScope(item.campaignId)) {
      setMessage("This knowledge belongs to completed or archived campaign history and cannot be changed.");
      return;
    }
    try {
      const saved = await apiPut<KnowledgeApiRecord>(`/api/knowledge/${id}`, { status: toApiStatus(status) }, getStoredAuthToken());
      const nextItem = toKnowledgeItem(saved);
      setItems((current) => current.map((item) => item.id === id ? nextItem : item));
      setOpenMenuId(null);
      setMessage(`Knowledge item marked as ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update knowledge status.");
    }
  };

  const duplicateItem = async (item: KnowledgeItem) => {
    if (isHistoricalScope(item.campaignId)) {
      setMessage("This knowledge belongs to completed or archived campaign history. Create new guidance in an active campaign instead.");
      return;
    }
    try {
      const saved = await apiPost<KnowledgeApiRecord>("/api/knowledge", { title: `${item.title} Copy`, category: item.category, status: "draft", content: item.summary, campaign_id: item.campaign === "All Campaigns" ? null : item.campaign }, getStoredAuthToken());
      const nextItem = toKnowledgeItem(saved);
      setItems((current) => [nextItem, ...current]);
      setSelectedItemId(nextItem.id);
      setOpenMenuId(null);
      setMessage(`${item.title} duplicated as a draft item.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to duplicate the knowledge item.");
    }
  };

  const handleStatFilter = (status: KnowledgeStatus | "All") => {
    setStatusFilter(status);
    setMessage(status === "All" ? "Showing all knowledge items." : `Filtering knowledge items by ${status}.`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080A13] text-white">
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_24%_12%,rgba(118,107,255,0.14),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(242,167,250,0.08),transparent_30%),#0D0F1A]">
        <AdminSidebar activeKey="knowledge" />

        <main className="flex-1">
          <AdminHeader contextLabel="Knowledge" primaryActionLabel="Open M7 Setup" primaryActionHref="/admin/setup" showInviteAction={false} />

          <section className="px-5 pb-8 pt-5 md:px-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
                  Admin Knowledge / AI Context Control
                </div>
                <h1 className="mt-2 max-w-[820px] font-headline text-[50px] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
                  Knowledge Base
                </h1>
                <p className="mt-4 max-w-[760px] text-[14px] leading-7 text-white/56">
                  Manage product facts, FAQs, objection answers, pricing notes, and policies that the AI can use during calls.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPublishedOnly((current) => !current);
                  setMessage(!publishedOnly ? "AI context rule now shows only published knowledge." : "AI context rule now shows all knowledge items again.");
                }}
                className="rounded-[16px] border border-white/[0.06] bg-[#111420] px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">AI Context Rule</div>
                <div className="mt-2 text-[14px] font-semibold text-white">Published items are ready for campaign use</div>
                <div className="mt-2 text-[12px] text-white/44">{publishedOnly ? "Published-only mode is active" : "Click to focus on AI-ready knowledge only"}</div>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <button type="button" onClick={() => handleStatFilter("All")} className="text-left">
                <AdminStatCard label="Total Items" value={String(items.length).padStart(2, "0")} accent="text-[#b9b7ff]" icon={<BookOpen size={17} strokeWidth={2.1} aria-hidden="true" />} />
              </button>
              <button type="button" onClick={() => handleStatFilter("Published")} className="text-left">
                <AdminStatCard label="Published" value={String(publishedCount).padStart(2, "0")} accent="text-[#a7f3c4]" icon={<CheckCircle2 size={17} strokeWidth={2.1} aria-hidden="true" />} />
              </button>
              <button type="button" onClick={() => handleStatFilter("Needs Review")} className="text-left">
                <AdminStatCard label="Needs Review" value={String(reviewCount).padStart(2, "0")} accent="text-[#f6c56f]" icon={<Sparkles size={17} strokeWidth={2.1} aria-hidden="true" />} />
              </button>
              <button type="button" onClick={() => handleStatFilter("Draft")} className="text-left">
                <AdminStatCard label="Drafts" value={String(draftCount).padStart(2, "0")} accent="text-[#f3a8ff]" icon={<FileText size={17} strokeWidth={2.1} aria-hidden="true" />} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.72fr_1.28fr]">
              <AdminPanel glow>
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-[14px] border border-[#b9b7ff]/24 bg-[#b9b7ff]/12 text-[#d9dcff]">
                    <BookOpen size={19} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">
                      {editingId ? "Edit Knowledge" : "Add Knowledge"}
                    </div>
                    <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">
                      {editingId ? "Update AI context" : "Create knowledge item"}
                    </h2>
                  </div>
                </div>

                <form onSubmit={submitKnowledgeItem} className="space-y-4">
                  <AdminFormField label="Title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
                  <AdminSelectField label="Category" value={form.category} options={categories} onChange={(category) => setForm((current) => ({ ...current, category }))} />

                  <label className="block">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Status</span>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {statuses.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, status }))}
                          className={[
                            "rounded-[12px] border px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors",
                            form.status === status
                              ? "border-[#b9b7ff]/36 bg-[#b9b7ff]/16 text-[#d9dcff]"
                              : "border-white/[0.08] bg-white/[0.025] text-white/52 hover:bg-white/[0.05]",
                          ].join(" ")}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Campaign Scope</span>
                    <select
                      value={form.campaign}
                      onChange={(event) => setForm((current) => ({ ...current, campaign: event.target.value }))}
                      className="w-full rounded-[13px] border border-white/[0.08] bg-[#191c28] px-4 py-3 text-[13px] leading-6 text-white/84 outline-none focus:border-[#b9b7ff]/40"
                    >
                      <option value="All Campaigns" className="bg-[#191c28]">All Campaigns (global knowledge)</option>
                      {availableCampaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id} className="bg-[#191c28]">
                          {campaign.name} ({campaign.status})
                        </option>
                      ))}
                    </select>
                  </label>
                  <AdminFormField label="Knowledge Content" value={form.summary} onChange={(value) => setForm((current) => ({ ...current, summary: value }))} lines={5} />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      className="!h-12 flex-1 !rounded-[12px] !bg-[#b9b7ff] !text-[13px] !font-semibold !uppercase !tracking-[0.12em] !text-[#20264b]"
                      leftIcon={editingId ? <Pencil size={15} strokeWidth={2.2} aria-hidden="true" /> : <Plus size={15} strokeWidth={2.2} aria-hidden="true" />}
                    >
                      {editingId ? "Update Item" : "Add Item"}
                    </Button>
                    {editingId ? (
                      <Button type="button" variant="outlined" className="!h-12 !rounded-[12px]" onClick={resetForm}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </form>

                <AdminMessage>{message}</AdminMessage>
              </AdminPanel>

              <AdminPanel>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Knowledge Library</div>
                    <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">AI-ready content</h2>
                  </div>

                  <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                    <label className="relative min-w-[260px] flex-1 lg:flex-none">
                      <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" aria-hidden="true" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search knowledge..."
                        className="w-full rounded-[10px] border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#b9b7ff]/36"
                      />
                    </label>
                    <label className="relative min-w-[190px]">
                      <Filter size={14} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" aria-hidden="true" />
                      <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value as KnowledgeCategory | "All")}
                        className="w-full rounded-[10px] border border-white/10 bg-white/[0.05] py-2.5 pl-9 pr-4 text-[13px] text-white outline-none focus:border-[#b9b7ff]/36"
                      >
                        <option value="All" className="bg-[#191c28]">All Categories</option>
                        {categories.map((category) => (
                          <option key={category} value={category} className="bg-[#191c28]">
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="relative min-w-[190px]">
                      <Filter size={14} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" aria-hidden="true" />
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as KnowledgeStatus | "All")}
                        className="w-full rounded-[10px] border border-white/10 bg-white/[0.05] py-2.5 pl-9 pr-4 text-[13px] text-white outline-none focus:border-[#b9b7ff]/36"
                      >
                        <option value="All" className="bg-[#191c28]">All Statuses</option>
                        {statuses.map((status) => (
                          <option key={status} value={status} className="bg-[#191c28]">
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={[
                        "rounded-[16px] border bg-white/[0.025] p-4 transition-colors",
                        selectedItemId === item.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] hover:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setSelectedItemId(item.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#b9b7ff]/12 text-[#d9dcff]">
                              {categoryIcons[item.category]}
                            </span>
                            <h3 className="font-headline text-[22px] font-semibold leading-tight tracking-[-0.03em] text-white">{item.title}</h3>
                            <Badge color={categoryColor(item.category)} className="!uppercase !tracking-[0.1em]">
                              {item.category}
                            </Badge>
                            <Badge color={statusColor(item.status)} className="!uppercase !tracking-[0.1em]">
                              {item.status}
                            </Badge>
                          </div>
                          <p className="mt-3 text-[13px] leading-6 text-white/58">{item.summary}</p>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-white/42">
                            <span>Campaign: {item.campaign}</span>
                            <span>Updated: {item.updatedAt}</span>
                            <span>{item.status === "Published" ? "AI-ready" : "Not AI-ready yet"}</span>
                          </div>
                          {isHistoricalScope(item.campaignId) ? <div className="mt-2 text-[11px] text-[#f8dc9b]">Historical campaign knowledge is read-only.</div> : null}
                        </button>

                        <div className="flex flex-wrap gap-2">
                          <StatusButton label="Publish" disabled={item.status === "Published" || isHistoricalScope(item.campaignId)} onClick={() => updateStatus(item.id, "Published")} />
                          <StatusButton label="Review" disabled={item.status === "Needs Review" || isHistoricalScope(item.campaignId)} onClick={() => updateStatus(item.id, "Needs Review")} />
                          <button
                            type="button"
                            onClick={() => editItem(item)}
                            disabled={isHistoricalScope(item.campaignId)}
                            className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Edit ${item.title}`}
                          >
                            <Pencil size={14} strokeWidth={2.1} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            disabled={isHistoricalScope(item.campaignId)}
                            className="grid h-9 w-9 place-items-center rounded-[10px] border border-red-400/15 bg-red-500/10 text-red-200 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 size={14} strokeWidth={2.1} aria-hidden="true" />
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId((current) => (current === item.id ? null : item.id))}
                              className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/[0.06]"
                              aria-label={`More actions for ${item.title}`}
                              aria-expanded={openMenuId === item.id}
                            >
                              <MoreHorizontal size={14} strokeWidth={2.1} aria-hidden="true" />
                            </button>

                            {openMenuId === item.id ? (
                              <div className="absolute right-0 top-11 z-40 w-[220px] rounded-[14px] border border-white/10 bg-[#171b28]/98 p-2 shadow-[0_18px_40px_rgba(6,7,14,0.45)] backdrop-blur-xl">
                                <MenuAction
                                  icon={<BookOpen size={14} strokeWidth={2} aria-hidden="true" />}
                                  label="View details"
                                  onClick={() => {
                                    setSelectedItemId(item.id);
                                    setOpenMenuId(null);
                                    setMessage(`Showing details for ${item.title}.`);
                                  }}
                                />
                                <MenuAction icon={<Pencil size={14} strokeWidth={2} aria-hidden="true" />} label="Edit item" onClick={() => editItem(item)} />
                                <MenuAction icon={<Copy size={14} strokeWidth={2} aria-hidden="true" />} label="Duplicate item" onClick={() => duplicateItem(item)} />
                                <div className="my-1 h-px bg-white/[0.08]" />
                                <MenuAction icon={<CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />} label="Mark published" onClick={() => updateStatus(item.id, "Published")} />
                                <MenuAction icon={<Sparkles size={14} strokeWidth={2} aria-hidden="true" />} label="Mark for review" onClick={() => updateStatus(item.id, "Needs Review")} />
                                <MenuAction icon={<FileText size={14} strokeWidth={2} aria-hidden="true" />} label="Move to draft" onClick={() => updateStatus(item.id, "Draft")} />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AdminPanel>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function categoryColor(category: KnowledgeCategory) {
  if (category === "FAQ") return "secondary";
  if (category === "Objection" || category === "Pricing") return "tertiary";
  if (category === "Policy") return "neutral";
  return "primary";
}

function statusColor(status: KnowledgeStatus) {
  if (status === "Published") return "success";
  if (status === "Needs Review") return "tertiary";
  return "neutral";
}

function StatusButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/68 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
    >
      {label}
    </button>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-white/78 hover:bg-white/[0.05] hover:text-white"
    >
      {icon}
      {label}
    </button>
  );
}
