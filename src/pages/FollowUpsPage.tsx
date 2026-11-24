import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Loader2,
  Phone,
} from "lucide-react";
import { Lead } from "../types/lead";
import {
  buildWhatsAppUrl,
  formatReceivedDisplay,
  fromLocalDateTimeInputValue,
  getQuickFollowUpDate,
  isLeadDueToday,
  isLeadNeedsAttention,
  isLeadOverdue,
  isLeadUpcoming7Days,
  toLocalDateTimeInputValue,
} from "../lib/leadUtils";
import { cn } from "../lib/utils";
import { useUpdateLeadMutation } from "../hooks/useLeads";
import { FullErrorCard } from "../components/ErrorStates";
import {
  NeedsAttentionBadge,
  OverdueBadge,
  SourceBadge,
} from "../components/LeadBadges";
import { LeadDetailModal } from "../components/LeadDetailModal";
import { WhatsAppIcon } from "../components/WhatsAppIcon";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";

interface FollowUpsPageProps {
  leads: Lead[] | undefined;
  currentStaff: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  onRefresh: () => void;
}

export function FollowUpsPage({
  leads,
  currentStaff,
  isLoading,
  isFetching,
  isError,
  error,
  onRefresh,
}: FollowUpsPageProps) {
  const [selectedLeadRow, setSelectedLeadRow] = useState<number | null>(null);
  const [callbackLead, setCallbackLead] = useState<Lead | null>(null);
  const [callbackNextDate, setCallbackNextDate] = useState("");

  const updateMutation = useUpdateLeadMutation();

  const { overdue, dueToday, upcoming7Days, needsAttention } = useMemo(() => {
    const list = leads ?? [];
    const now = new Date();

    const sortByDueAsc = (a: Lead, b: Lead) =>
      (a.nextFollowUpDate?.getTime() ?? 0) - (b.nextFollowUpDate?.getTime() ?? 0);

    const overdueList = list.filter((l) => isLeadOverdue(l, now)).sort(sortByDueAsc);
    const dueTodayList = list
      .filter((l) => isLeadDueToday(l, now))
      .sort(sortByDueAsc);
    const upcomingList = list
      .filter((l) => isLeadUpcoming7Days(l, now))
      .sort(sortByDueAsc);
    const attentionList = list.filter(
      (l) => isLeadNeedsAttention(l, now) && !isLeadOverdue(l, now)
    );

    return {
      overdue: overdueList,
      dueToday: dueTodayList,
      upcoming7Days: upcomingList,
      needsAttention: attentionList,
    };
  }, [leads]);

  const selectedLead = useMemo(() => {
    if (selectedLeadRow === null || !leads) return null;
    return leads.find((l) => l.row === selectedLeadRow) ?? null;
  }, [leads, selectedLeadRow]);

  const openMarkCalledBack = (lead: Lead) => {
    const defaultNext = getQuickFollowUpDate("tomorrow");
    setCallbackNextDate(toLocalDateTimeInputValue(defaultNext));
    setCallbackLead(lead);
  };

  const confirmCalledBack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackLead) return;

    updateMutation.mutate(
      {
        row: callbackLead.row,
        actor: currentStaff || "Staff",
        followup: "Called back",
        nextFollowup: fromLocalDateTimeInputValue(callbackNextDate),
      },
      {
        onSuccess: () => {
          setCallbackLead(null);
        },
      }
    );
  };

  if (isLoading && !leads) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
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

  const renderFollowUpCard = (
    lead: Lead,
    tone: "overdue" | "today" | "upcoming" | "attention"
  ) => {
    const waUrl = buildWhatsAppUrl(lead.phone);
    const dueText = lead.nextFollowUpDate
      ? formatReceivedDisplay(lead.nextFollowUpRaw, lead.nextFollowUpDate)
      : formatReceivedDisplay(lead.receivedRaw, lead.receivedDate);

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
          "rounded-xl border p-4 shadow-xs transition-colors cursor-pointer text-left",
          tone === "overdue" &&
            "border-red-200 border-l-4 border-l-red-600 bg-red-50/85 hover:bg-red-50",
          tone === "today" &&
            "border-amber-200 border-l-4 border-l-amber-500 bg-amber-50/70 hover:bg-amber-50",
          tone === "upcoming" &&
            "border-slate-200/90 bg-white hover:bg-slate-50",
          tone === "attention" &&
            "border-amber-200 bg-amber-50/40 hover:bg-amber-50/70"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-900 truncate">
              {lead.name || "Unknown"}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <SourceBadge source={lead.source} />
              {tone === "overdue" && <OverdueBadge />}
              {tone === "attention" && <NeedsAttentionBadge />}
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  tone === "overdue"
                    ? "text-red-700"
                    : tone === "today"
                    ? "text-amber-800"
                    : "text-slate-500"
                )}
              >
                {tone === "attention" ? `Received ${dueText}` : `Due ${dueText}`}
              </span>
            </div>
          </div>

          <a
            href={lead.phone ? `tel:${lead.phone}` : undefined}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-sm font-semibold text-blue-700 hover:underline tabular-nums shrink-0"
          >
            {lead.phone || "—"}
          </a>
        </div>

        {lead.notes && (
          <p className="mt-2 text-xs sm:text-sm text-slate-600 line-clamp-2 break-words">
            {lead.notes}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {lead.phone && (
            <Button
              asChild
              size="sm"
              variant="outline"
              onClick={(e) => e.stopPropagation()}
              className="min-h-[44px]"
            >
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4 text-blue-600" />
                Call
              </a>
            </Button>
          )}

          {waUrl && (
            <Button
              asChild
              size="sm"
              variant="whatsapp"
              onClick={(e) => e.stopPropagation()}
              className="min-h-[44px]"
            >
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openMarkCalledBack(lead);
            }}
            className="min-h-[44px] flex-1 sm:flex-none bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
          >
            <Check className="h-4 w-4" />
            Mark called back
          </Button>
        </div>
      </div>
    );
  };

  const allEmpty =
    overdue.length === 0 &&
    dueToday.length === 0 &&
    upcoming7Days.length === 0 &&
    needsAttention.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Follow-ups
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Overdue callbacks, today&apos;s reminders, and upcoming 7-day schedule
        </p>
      </div>

      {allEmpty ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">
            All caught up
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            No overdue or scheduled follow-ups right now. Set a next follow-up date on
            any lead to see it here.
          </p>
        </div>
      ) : (
        <>
          {/* Overdue Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-base font-bold">
                  Overdue ({overdue.length})
                </h2>
              </div>
            </div>
            {overdue.length === 0 ? (
              <p className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-500">
                No overdue follow-ups.
              </p>
            ) : (
              <div className="space-y-2.5">
                {overdue.map((lead) => renderFollowUpCard(lead, "overdue"))}
              </div>
            )}
          </section>

          {/* Due Today Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
              <CalendarClock className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold">
                Due today ({dueToday.length})
              </h2>
            </div>
            {dueToday.length === 0 ? (
              <p className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-500">
                No follow-ups scheduled for today.
              </p>
            ) : (
              <div className="space-y-2.5">
                {dueToday.map((lead) => renderFollowUpCard(lead, "today"))}
              </div>
            )}
          </section>

          {/* Upcoming 7 Days Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-800">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold">
                Upcoming 7 days ({upcoming7Days.length})
              </h2>
            </div>
            {upcoming7Days.length === 0 ? (
              <p className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-500">
                Nothing scheduled in the next 7 days.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcoming7Days.map((lead) => renderFollowUpCard(lead, "upcoming"))}
              </div>
            )}
          </section>

          {/* Needs Attention (Untouched New Leads) */}
          {needsAttention.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <Bell className="h-5 w-5 text-amber-600" />
                <h2 className="text-base font-bold">
                  Needs attention ({needsAttention.length})
                </h2>
              </div>
              <div className="space-y-2.5">
                {needsAttention.map((lead) => renderFollowUpCard(lead, "attention"))}
              </div>
            </section>
          )}
        </>
      )}

      {/* One-tap Mark Called Back Dialog */}
      <Dialog
        open={callbackLead !== null}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) setCallbackLead(null);
        }}
      >
        <DialogContent responsiveSheet className="p-0 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Mark Called Back</DialogTitle>
            <DialogDescription>
              {callbackLead
                ? `Set the next follow-up date for ${
                    callbackLead.name || callbackLead.phone
                  }.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={confirmCalledBack} className="p-5 space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="callback-next-date"
                className="block text-sm font-medium text-slate-700"
              >
                Next follow-up date &amp; time
              </label>
              <Input
                id="callback-next-date"
                type="datetime-local"
                value={callbackNextDate}
                onChange={(e) => setCallbackNextDate(e.target.value)}
                disabled={updateMutation.isPending}
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(
                  [
                    ["Today evening", "today_evening"],
                    ["Tomorrow", "tomorrow"],
                    ["In 3 days", "in_3_days"],
                    ["Next week", "next_week"],
                  ] as const
                ).map(([label, preset]) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={() =>
                      setCallbackNextDate(
                        toLocalDateTimeInputValue(getQuickFollowUpDate(preset))
                      )
                    }
                    className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
                {callbackNextDate && (
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={() => setCallbackNextDate("")}
                    className="min-h-[36px] rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-700 hover:bg-red-100 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCallbackLead(null)}
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Called Back
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full Lead Detail Modal */}
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
