import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Download,
  Inbox,
  Phone,
  PhoneMissed,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { STAFF } from "../config";
import {
  APPOINTMENT_STATUSES,
  AppointmentStatus,
  FOLLOW_UP_STATUSES,
  FollowUpStatus,
  LEAD_SOURCES,
  Lead,
  LeadSource,
} from "../types/lead";
import {
  buildWhatsAppUrl,
  exportLeadsToCsv,
  formatReceivedDisplay,
  isLeadNeedsAttention,
  isLeadOverdue,
  isSameLocalDay,
  matchesLeadSearch,
} from "../lib/leadUtils";
import { cn } from "../lib/utils";
import { FullErrorCard } from "../components/ErrorStates";
import {
  AppointmentStatusBadge,
  FollowUpBadge,
  MissedBadge,
  NeedsAttentionBadge,
  OverdueBadge,
  SourceBadge,
  UnassignedBadge,
} from "../components/LeadBadges";
import { LeadDetailModal } from "../components/LeadDetailModal";
import { WhatsAppIcon } from "../components/WhatsAppIcon";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";

interface LeadsPageProps {
  leads: Lead[] | undefined;
  currentStaff: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  onRefresh: () => void;
  onOpenAddLead: () => void;
}

type DateRangeFilter = "all" | "today" | "7d" | "30d" | "custom";

export function LeadsPage({
  leads,
  currentStaff,
  isLoading,
  isFetching,
  isError,
  error,
  onRefresh,
  onOpenAddLead,
}: LeadsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [followUpFilter, setFollowUpFilter] = useState<string>(
    () => searchParams.get("followup") || "all"
  );
  const [appointmentFilter, setAppointmentFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [missedOnly, setMissedOnly] = useState<boolean>(
    () => searchParams.get("missed") === "1"
  );
  const [overdueOnly, setOverdueOnly] = useState<boolean>(
    () => searchParams.get("overdue") === "1"
  );
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [selectedLeadRow, setSelectedLeadRow] = useState<number | null>(null);

  useEffect(() => {
    const paramMissed = searchParams.get("missed") === "1";
    const paramOverdue = searchParams.get("overdue") === "1";
    const paramFollowUp = searchParams.get("followup");
    if (paramMissed) setMissedOnly(true);
    if (paramOverdue) setOverdueOnly(true);
    if (
      paramFollowUp &&
      FOLLOW_UP_STATUSES.includes(paramFollowUp as FollowUpStatus)
    ) {
      setFollowUpFilter(paramFollowUp);
    }
  }, [searchParams]);

  const selectedLead = useMemo(() => {
    if (selectedLeadRow === null || !leads) return null;
    return leads.find((l) => l.row === selectedLeadRow) ?? null;
  }, [leads, selectedLeadRow]);

  const filteredLeads = useMemo(() => {
    const list = leads ?? [];
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    return list.filter((lead) => {
      if (missedOnly && !lead.isMissed) return false;
      if (overdueOnly && !isLeadOverdue(lead, now)) return false;

      if (sourceFilter !== "all" && lead.source !== (sourceFilter as LeadSource)) {
        return false;
      }
      if (
        followUpFilter !== "all" &&
        lead.followUp !== (followUpFilter as FollowUpStatus)
      ) {
        return false;
      }
      if (
        appointmentFilter !== "all" &&
        lead.appointmentStatus !== (appointmentFilter as AppointmentStatus)
      ) {
        return false;
      }

      if (assignmentFilter === "me") {
        if (lead.assignedTo !== currentStaff) return false;
      } else if (assignmentFilter === "unassigned") {
        if (lead.assignedTo !== "") return false;
      } else if (assignmentFilter !== "all") {
        if (lead.assignedTo !== assignmentFilter) return false;
      }

      if (dateRange !== "all") {
        if (!lead.receivedDate) return false;
        const d = lead.receivedDate;

        if (dateRange === "today") {
          if (!isSameLocalDay(d, now)) return false;
        } else if (dateRange === "7d") {
          const cutoff = new Date(startOfToday);
          cutoff.setDate(cutoff.getDate() - 6);
          if (d < cutoff) return false;
        } else if (dateRange === "30d") {
          const cutoff = new Date(startOfToday);
          cutoff.setDate(cutoff.getDate() - 29);
          if (d < cutoff) return false;
        } else if (dateRange === "custom") {
          if (customStart) {
            const [y, m, day] = customStart.split("-").map(Number);
            const startDate = new Date(y, m - 1, day, 0, 0, 0, 0);
            if (d < startDate) return false;
          }
          if (customEnd) {
            const [y, m, day] = customEnd.split("-").map(Number);
            const endDate = new Date(y, m - 1, day, 23, 59, 59, 999);
            if (d > endDate) return false;
          }
        }
      }

      if (!matchesLeadSearch(lead, searchQuery)) return false;

      return true;
    });
  }, [
    leads,
    missedOnly,
    overdueOnly,
    sourceFilter,
    followUpFilter,
    appointmentFilter,
    assignmentFilter,
    currentStaff,
    dateRange,
    customStart,
    customEnd,
    searchQuery,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    sourceFilter !== "all" ||
    followUpFilter !== "all" ||
    appointmentFilter !== "all" ||
    assignmentFilter !== "all" ||
    missedOnly ||
    overdueOnly ||
    dateRange !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSourceFilter("all");
    setFollowUpFilter("all");
    setAppointmentFilter("all");
    setAssignmentFilter("all");
    setMissedOnly(false);
    setOverdueOnly(false);
    setDateRange("all");
    setCustomStart("");
    setCustomEnd("");
    if (searchParams.toString()) {
      setSearchParams({}, { replace: true });
    }
  };

  if (isLoading && !leads) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError && !leads) {
    return (
      <FullErrorCard
        message={error?.message}
        onRetry={onRefresh}
        isRetrying={isFetching}
      />
    );
  }

  const totalCount = leads?.length ?? 0;
  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Page Title & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Leads
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 tabular-nums">
            Showing {filteredLeads.length} of {totalCount}{" "}
            {totalCount === 1 ? "lead" : "leads"}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filteredLeads.length === 0}
          onClick={() => exportLeadsToCsv(filteredLeads)}
          className="min-h-[44px]"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by phone or name..."
            aria-label="Search leads by phone or name"
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger aria-label="Filter by source">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
            <SelectTrigger aria-label="Filter by follow-up status">
              <SelectValue placeholder="All follow-up statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All follow-up statuses</SelectItem>
              {FOLLOW_UP_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
            <SelectTrigger aria-label="Filter by assignment">
              <SelectValue placeholder="All team members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team members</SelectItem>
              <SelectItem value="me">Assigned to me ({currentStaff})</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {STAFF.map((member) => (
                <SelectItem key={member} value={member}>
                  Assigned: {member}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={appointmentFilter} onValueChange={setAppointmentFilter}>
            <SelectTrigger aria-label="Filter by appointment status">
              <SelectValue placeholder="All appointments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All appointments</SelectItem>
              {APPOINTMENT_STATUSES.map((st) => (
                <SelectItem key={st} value={st}>
                  Appt: {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={dateRange}
            onValueChange={(val) => setDateRange(val as DateRangeFilter)}
          >
            <SelectTrigger aria-label="Filter by date range">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMissedOnly((prev) => !prev)}
              className={cn(
                "inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer",
                missedOnly
                  ? "border-red-600 bg-red-600 text-white shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-red-50/70 hover:text-red-700 hover:border-red-200"
              )}
            >
              <PhoneMissed className="h-4 w-4 shrink-0" />
              <span className="truncate">Missed</span>
            </button>

            <button
              type="button"
              onClick={() => setOverdueOnly((prev) => !prev)}
              className={cn(
                "inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer",
                overdueOnly
                  ? "border-red-600 bg-red-600 text-white shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-red-50/70 hover:text-red-700 hover:border-red-200"
              )}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="truncate">Overdue only</span>
            </button>
          </div>
        </div>

        {/* Custom Date Range Pickers */}
        {dateRange === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="space-y-1">
              <label
                htmlFor="filter-start-date"
                className="block text-xs font-medium text-slate-600"
              >
                From date
              </label>
              <Input
                id="filter-start-date"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="filter-end-date"
                className="block text-xs font-medium text-slate-600"
              >
                To date
              </label>
              <Input
                id="filter-end-date"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Clear filters bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters active
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="min-h-[36px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Empty States */}
      {totalCount === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Inbox className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">
            No leads yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            No leads yet. New calls, DMs and form submissions will show up here.
          </p>
          <Button type="button" onClick={onOpenAddLead} className="mt-5">
            <Plus className="h-4 w-4" />
            Add First Lead
          </Button>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Search className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">
            No leads match your filters
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            Try adjusting your search query, source, status, assignment, or date range.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={clearAllFilters}
            className="mt-5"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile Stacked Cards (< md) */}
          <div className="md:hidden space-y-3">
            {filteredLeads.map((lead) => {
              const waUrl = buildWhatsAppUrl(lead.phone);
              const receivedDisplay = formatReceivedDisplay(
                lead.receivedRaw,
                lead.receivedDate
              );
              const overdue = isLeadOverdue(lead, now);
              const needsAttention = isLeadNeedsAttention(lead, now);
              const isAlertRow = lead.isMissed || overdue;

              return (
                <div
                  key={lead.row}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedLeadRow(lead.row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedLeadRow(lead.row);
                    }
                  }}
                  className={cn(
                    "w-full rounded-xl border p-4 shadow-xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                    isAlertRow
                      ? "border-red-200 border-l-4 border-l-red-600 bg-red-50/85 hover:bg-red-50"
                      : "border-slate-200/90 bg-white hover:bg-slate-50/80"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-slate-900 truncate">
                        {lead.name || "Unknown"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
                        {receivedDisplay}
                        {lead.assignedTo && (
                          <span className="ml-1.5 text-slate-600">
                            · {lead.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                    <FollowUpBadge status={lead.followUp} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <a
                      href={lead.phone ? `tel:${lead.phone}` : undefined}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 -ml-2 font-mono text-sm font-semibold text-blue-700 hover:bg-blue-50/80 tabular-nums"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{lead.phone || "—"}</span>
                    </a>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Message ${lead.name || lead.phone} on WhatsApp`}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 active:scale-[0.98] transition-all shrink-0"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <SourceBadge source={lead.source} />
                    {lead.isMissed && <MissedBadge />}
                    {overdue && <OverdueBadge />}
                    {needsAttention && !overdue && <NeedsAttentionBadge />}
                    {!lead.assignedTo && <UnassignedBadge />}
                    {lead.appointmentStatus && (
                      <AppointmentStatusBadge status={lead.appointmentStatus} />
                    )}
                    {!lead.isMissed && lead.callStatus && (
                      <span className="text-xs text-slate-500">
                        {lead.callStatus}
                      </span>
                    )}
                  </div>

                  {lead.notes && (
                    <p className="mt-2.5 text-sm text-slate-600 line-clamp-2 break-words">
                      {lead.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 pl-4 pr-3 whitespace-nowrap">Received</th>
                    <th className="py-3 px-3 whitespace-nowrap">Phone</th>
                    <th className="py-3 px-3 whitespace-nowrap">Name</th>
                    <th className="py-3 px-3 whitespace-nowrap">Source</th>
                    <th className="py-3 px-3 whitespace-nowrap">Status / Flags</th>
                    <th className="py-3 px-3 whitespace-nowrap">Assigned</th>
                    <th className="py-3 px-3 whitespace-nowrap">Follow-up</th>
                    <th className="py-3 pl-3 pr-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => {
                    const waUrl = buildWhatsAppUrl(lead.phone);
                    const receivedDisplay = formatReceivedDisplay(
                      lead.receivedRaw,
                      lead.receivedDate
                    );
                    const overdue = isLeadOverdue(lead, now);
                    const needsAttention = isLeadNeedsAttention(lead, now);
                    const isAlertRow = lead.isMissed || overdue;

                    return (
                      <tr
                        key={lead.row}
                        onClick={() => setSelectedLeadRow(lead.row)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isAlertRow
                            ? "bg-red-50/85 hover:bg-red-100/70"
                            : "hover:bg-slate-50"
                        )}
                      >
                        <td
                          className={cn(
                            "py-3.5 pl-4 pr-3 text-xs text-slate-600 whitespace-nowrap tabular-nums",
                            isAlertRow && "border-l-4 border-l-red-600 pl-3"
                          )}
                        >
                          {receivedDisplay}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {lead.phone ? (
                              <a
                                href={`tel:${lead.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-mono text-sm font-medium text-blue-700 hover:underline tabular-nums"
                              >
                                {lead.phone}
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Open in WhatsApp"
                                aria-label={`Message ${lead.phone} on WhatsApp`}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shrink-0"
                              >
                                <WhatsAppIcon className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-medium text-slate-900 max-w-[150px] truncate">
                          {lead.name || (
                            <span className="text-slate-400 font-normal">
                              Unknown
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <SourceBadge source={lead.source} />
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex flex-wrap items-center gap-1">
                            {lead.isMissed && <MissedBadge />}
                            {overdue && <OverdueBadge />}
                            {needsAttention && !overdue && <NeedsAttentionBadge />}
                            {lead.appointmentStatus && (
                              <AppointmentStatusBadge
                                status={lead.appointmentStatus}
                              />
                            )}
                            {!lead.isMissed &&
                              !overdue &&
                              !needsAttention &&
                              !lead.appointmentStatus && (
                                <span className="text-xs text-slate-600">
                                  {lead.callStatus || "—"}
                                </span>
                              )}
                          </div>
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap text-xs">
                          {lead.assignedTo ? (
                            <span className="font-medium text-slate-700">
                              {lead.assignedTo}
                            </span>
                          ) : (
                            <UnassignedBadge />
                          )}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <FollowUpBadge status={lead.followUp} />
                        </td>

                        <td className="py-3.5 pl-3 pr-4 text-xs text-slate-600 max-w-[240px]">
                          <p className="line-clamp-2 break-words">
                            {lead.notes || "—"}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Lead Detail Sheet/Dialog */}
      <LeadDetailModal
        lead={selectedLead}
        open={selectedLead !== null}
        currentStaff={currentStaff}
        onOpenChange={(open) => {
          if (!open) setSelectedLeadRow(null);
        }}
      />
    </div>
  );
}
