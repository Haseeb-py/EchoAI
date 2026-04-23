"use client";

import { FormEvent, useMemo, useState } from "react";
import { Download, FileText, MoreHorizontal, RefreshCw, Send, Table } from "lucide-react";
import {
  AdminFormField,
  AdminMessage,
  AdminPanel,
  AdminScreenShell,
  AdminSelectField,
  AdminStatCard,
  SectionTitle,
} from "@/components/admin/AdminScreenShell";
import { Badge } from "@/components/ui/ui-components";

type ReportFormat = "PDF" | "CSV";
type ReportStatus = "Ready" | "Scheduled" | "Draft";
type ReportType = "Campaigns" | "Users" | "Leads" | "Security";

type ReportJob = {
  id: number;
  name: string;
  type: ReportFormat;
  status: ReportStatus;
  scope: string;
  reportType: ReportType;
  dateRange: string;
};

const formatOptions = ["All Formats", "PDF", "CSV"] as const;
const statusOptions = ["All Statuses", "Ready", "Scheduled", "Draft"] as const;
const reportTypeOptions = ["Campaigns", "Users", "Leads", "Security"] as const;
const dateRangeOptions = ["Last 7 Days", "Last 30 Days", "Quarter to Date", "All Time"] as const;

const initialReports: ReportJob[] = [
  { id: 1, name: "Campaign Performance Report", type: "PDF", status: "Ready", scope: "All campaigns", reportType: "Campaigns", dateRange: "Last 30 Days" },
  { id: 2, name: "Agent Activity Export", type: "CSV", status: "Ready", scope: "All users", reportType: "Users", dateRange: "Last 7 Days" },
  { id: 3, name: "Lead Scoring Audit", type: "CSV", status: "Scheduled", scope: "CRM records", reportType: "Leads", dateRange: "Quarter to Date" },
  { id: 4, name: "Security Access Log", type: "PDF", status: "Draft", scope: "Admin security", reportType: "Security", dateRange: "Last 30 Days" },
];

export default function ReportsExportsPage() {
  const [reports, setReports] = useState<ReportJob[]>(initialReports);
  const [selectedReportId, setSelectedReportId] = useState<number>(initialReports[0].id);
  const [formatFilter, setFormatFilter] = useState<(typeof formatOptions)[number]>("All Formats");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("All Statuses");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [message, setMessage] = useState("Reports are interactive in the frontend session. Generate, schedule, export, and duplicate jobs from this screen.");
  const [builder, setBuilder] = useState({
    name: "",
    reportType: "Campaigns" as ReportType,
    format: "PDF" as ReportFormat,
    scope: "All campaigns",
    dateRange: "Last 30 Days",
  });

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesFormat = formatFilter === "All Formats" || report.type === formatFilter;
      const matchesStatus = statusFilter === "All Statuses" || report.status === statusFilter;
      return matchesFormat && matchesStatus;
    });
  }, [formatFilter, reports, statusFilter]);

  const selectedReport = reports.find((report) => report.id === selectedReportId) || reports[0];
  const readyCount = reports.filter((report) => report.status === "Ready").length;
  const scheduledCount = reports.filter((report) => report.status === "Scheduled").length;
  const pdfCount = reports.filter((report) => report.type === "PDF").length;
  const csvCount = reports.filter((report) => report.type === "CSV").length;

  const updateReport = (id: number, updates: Partial<ReportJob>, nextMessage: string) => {
    setReports((currentReports) => currentReports.map((report) => (report.id === id ? { ...report, ...updates } : report)));
    setOpenMenuId(null);
    setMessage(nextMessage);
  };

  const createReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = builder.name.trim();
    const cleanScope = builder.scope.trim();

    if (!cleanName || !cleanScope) {
      setMessage("Please enter report name and scope before creating a custom report.");
      return;
    }

    const newReport: ReportJob = {
      id: Date.now(),
      name: cleanName,
      type: builder.format,
      status: "Draft",
      scope: cleanScope,
      reportType: builder.reportType,
      dateRange: builder.dateRange,
    };

    setReports((currentReports) => [newReport, ...currentReports]);
    setSelectedReportId(newReport.id);
    setBuilder({
      name: "",
      reportType: "Campaigns",
      format: "PDF",
      scope: "All campaigns",
      dateRange: "Last 30 Days",
    });
    setMessage(`${cleanName} created as a draft report job.`);
  };

  const duplicateReport = (report: ReportJob) => {
    const newReport: ReportJob = {
      ...report,
      id: Date.now(),
      name: `${report.name} Copy`,
      status: "Draft",
    };
    setReports((currentReports) => [newReport, ...currentReports]);
    setSelectedReportId(newReport.id);
    setOpenMenuId(null);
    setMessage(`${report.name} duplicated as a draft export job.`);
  };

  return (
    <AdminScreenShell
      activeKey="reports"
      contextLabel="Reports"
      eyebrow="Admin Reports / Export Center"
      title="Reports & Exports"
      description="Prepare campaign, lead, user, security, and performance exports for admin review and project reporting."
    >
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
        <AdminPanel className="!p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">Export Filters</div>
              <div className="mt-1 text-[14px] font-semibold text-white">Filter export jobs by format and delivery state</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormatFilter("All Formats");
                setStatusFilter("All Statuses");
                setSelectedReportId(reports[0]?.id ?? initialReports[0].id);
                setMessage("Report filters reset to the default frontend view.");
              }}
              className="inline-flex h-10 items-center rounded-[10px] border border-white/10 bg-white/[0.03] px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70 hover:bg-white/[0.06]"
            >
              Reset View
            </button>
          </div>
        </AdminPanel>
        <AdminSelectField label="Format Filter" value={formatFilter} options={formatOptions} onChange={setFormatFilter} />
        <AdminSelectField label="Status Filter" value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => setStatusFilter("Ready")} className="text-left">
          <AdminStatCard label="Ready Exports" value={String(readyCount).padStart(2, "0")} accent="text-[#a7f3c4]" icon={<Download size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <button type="button" onClick={() => setStatusFilter("Scheduled")} className="text-left">
          <AdminStatCard label="Scheduled" value={String(scheduledCount).padStart(2, "0")} accent="text-[#f6c56f]" icon={<RefreshCw size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <button type="button" onClick={() => setFormatFilter("PDF")} className="text-left">
          <AdminStatCard label="PDF Reports" value={String(pdfCount).padStart(2, "0")} accent="text-[#b9b7ff]" icon={<FileText size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
        <button type="button" onClick={() => setFormatFilter("CSV")} className="text-left">
          <AdminStatCard label="CSV Exports" value={String(csvCount).padStart(2, "0")} accent="text-[#8fdde0]" icon={<Table size={17} strokeWidth={2.1} aria-hidden="true" />} />
        </button>
      </div>

      <AdminMessage>
        {`${message} Showing ${filteredReports.length} jobs. Format filter: ${formatFilter}. Status filter: ${statusFilter}.`}
      </AdminMessage>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <AdminPanel>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <SectionTitle eyebrow="Export Jobs" title="Available reports" />
            {selectedReport ? (
              <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-[12px] text-white/54">
                Selected: <span className="font-semibold text-white/84">{selectedReport.name}</span>
              </div>
            ) : null}
          </div>
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className={[
                  "rounded-[15px] border p-4 transition-colors",
                  selectedReportId === report.id ? "border-[#b9b7ff]/24 bg-[#b9b7ff]/8" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReportId(report.id);
                      setMessage(`${report.name} selected for export review.`);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-white">{report.name}</div>
                      <Badge color={report.status === "Ready" ? "success" : report.status === "Scheduled" ? "tertiary" : "neutral"}>{report.status}</Badge>
                      <Badge color={report.type === "PDF" ? "primary" : "secondary"}>{report.type}</Badge>
                    </div>
                    <div className="mt-1 text-[12px] text-white/44">
                      {report.scope} / {report.reportType} / {report.dateRange}
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateReport(report.id, { status: "Ready" }, `${report.name} prepared for export.`)}
                      className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.03] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/68 hover:bg-white/[0.06]"
                    >
                      <Download size={14} strokeWidth={2.1} aria-hidden="true" />
                      Export
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId((current) => (current === report.id ? null : report.id))}
                        className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                        aria-label={`More actions for ${report.name}`}
                        aria-expanded={openMenuId === report.id}
                      >
                        <MoreHorizontal size={15} strokeWidth={2.1} aria-hidden="true" />
                      </button>

                      {openMenuId === report.id ? (
                        <div className="absolute right-0 top-11 z-40 w-[220px] rounded-[14px] border border-white/10 bg-[#171b28]/98 p-2 shadow-[0_18px_40px_rgba(6,7,14,0.45)] backdrop-blur-xl">
                          <ReportMenuAction label="Mark Ready" onClick={() => updateReport(report.id, { status: "Ready" }, `${report.name} marked Ready.`)} />
                          <ReportMenuAction label="Schedule Job" onClick={() => updateReport(report.id, { status: "Scheduled" }, `${report.name} scheduled for export.`)} />
                          <ReportMenuAction label="Move to Draft" onClick={() => updateReport(report.id, { status: "Draft" }, `${report.name} moved back to draft.`)} />
                          <ReportMenuAction label="Duplicate Report" onClick={() => duplicateReport(report)} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel glow>
          <SectionTitle eyebrow="Generate" title="Custom report" />
          <form onSubmit={createReport} className="space-y-4">
            <AdminFormField label="Report Name" value={builder.name} onChange={(value) => setBuilder((current) => ({ ...current, name: value }))} />
            <AdminSelectField label="Report Type" value={builder.reportType} options={reportTypeOptions} onChange={(value) => setBuilder((current) => ({ ...current, reportType: value }))} />
            <AdminSelectField label="Export Format" value={builder.format} options={["PDF", "CSV"] as const} onChange={(value) => setBuilder((current) => ({ ...current, format: value }))} />
            <AdminFormField label="Scope" value={builder.scope} onChange={(value) => setBuilder((current) => ({ ...current, scope: value }))} />
            <AdminSelectField label="Date Range" value={builder.dateRange} options={dateRangeOptions} onChange={(value) => setBuilder((current) => ({ ...current, dateRange: value }))} />
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#b9b7ff] text-[13px] font-semibold uppercase tracking-[0.12em] text-[#20264b] hover:bg-[#c8c6ff]"
            >
              <Send size={15} strokeWidth={2.2} aria-hidden="true" />
              Generate Report
            </button>
          </form>
        </AdminPanel>
      </div>
    </AdminScreenShell>
  );
}

function ReportMenuAction({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-white/78 hover:bg-white/[0.05] hover:text-white"
    >
      {label}
    </button>
  );
}
