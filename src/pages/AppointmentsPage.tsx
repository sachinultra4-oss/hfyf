import { useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  Phone,
  UserX,
} from "lucide-react";
import { CURRENCY } from "../config";
import { Lead } from "../types/lead";
import {
  buildWhatsAppUrl,
  downloadAppointmentIcs,
  formatLocalDateKey,
  formatTimeOnly,
  isSameLocalDay,
} from "../lib/leadUtils";
import { cn } from "../lib/utils";
import { useUpdateLeadMutation } from "../hooks/useLeads";
import { FullErrorCard } from "../components/ErrorStates";
import {
  AppointmentStatusBadge,
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

interface AppointmentsPageProps {
  leads: Lead[] | undefined;
  currentStaff: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  onRefresh: () => void;
}

interface DayGroup {
  dateKey: string;
  label: string;
  isToday: boolean;
  items: Lead[];
}

export function AppointmentsPage({
  leads,
  currentStaff,
  isLoading,
  isFetching,
  isError,
  error,
  onRefresh,
}: AppointmentsPageProps) {
  const [selectedLeadRow, setSelectedLeadRow] = useState<number | null>(null);
  const [visitLead, setVisitLead] = useState<Lead | null>(null);
  const [visitRevenue, setVisitRevenue] = useState("");

  const updateMutation = useUpdateLeadMutation();

  const dayGroups = useMemo<DayGroup[]>(() => {
    const list = leads ?? [];
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);

    const end14Days = new Date(startToday);
    end14Days.setDate(end14Days.getDate() + 13);
    end14Days.setHours(23, 59, 59, 999);

    const upcoming = list
      .filter((l) => {
        if (l.followUp !== "Booked" || !l.appointmentDate) return false;
        return (
          l.appointmentDate.getTime() >= startToday.getTime() &&
          l.appointmentDate.getTime() <= end14Days.getTime()
        );
      })
      .sort(
        (a, b) =>
          (a.appointmentDate?.getTime() ?? 0) -
          (b.appointmentDate?.getTime() ?? 0)
      );

    const map = new Map<string, DayGroup>();

    for (const lead of upcoming) {
      const d = lead.appointmentDate!;
      const dateKey = formatLocalDateKey(d);
      let group = map.get(dateKey);
      if (!group) {
        const isToday = isSameLocalDay(d, now);
        const tomorrow = new Date(startToday);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = isSameLocalDay(d, tomorrow);

        const formattedDate = new Intl.DateTimeFormat("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }).format(d);

        group = {
          dateKey,
          label: isToday
            ? `Today · ${formattedDate}`
            : isTomorrow
            ? `Tomorrow · ${formattedDate}`
            : formattedDate,
          isToday,
          items: [],
        };
        map.set(dateKey, group);
      }
      group.items.push(lead);
    }

    return Array.from(map.values());
  }, [leads]);

  const selectedLead = useMemo(() => {
    if (selectedLeadRow === null || !leads) return null;
    return leads.find((l) => l.row === selectedLeadRow) ?? null;
  }, [leads, selectedLeadRow]);

  const openMarkVisited = (lead: Lead) => {
    setVisitRevenue(lead.revenue !== null ? String(lead.revenue) : "");
    setVisitLead(lead);
  };

  const confirmVisited = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitLead) return;
    const trimmed = visitRevenue.trim();
    const parsedRev = trimmed === "" ? "" : Number(trimmed);

    updateMutation.mutate(
      {
        row: visitLead.row,
        actor: currentStaff || "Staff",
        appointmentStatus: "Visited",
        ...(parsedRev === "" || (Number.isFinite(parsedRev) && parsedRev >= 0)
          ? { revenue: parsedRev }
          : {}),
      },
      {
        onSuccess: () => {
          setVisitLead(null);
        },
      }
    );
  };

  const markNoShow = (lead: Lead) => {
    updateMutation.mutate({
      row: lead.row,
      actor: currentStaff || "Staff",
      appointmentStatus: "No-show",
    });
  };

  if (isLoading && !leads) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Appointments
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Upcoming clinic schedule for the next 14 days
        </p>
      </div>

      {dayGroups.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">
            No upcoming appointments
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
            Mark a lead as &quot;Booked&quot; and set an appointment date to see it on
            your 14-day agenda.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {dayGroups.map((group) => (
            <section
              key={group.dateKey}
              className={cn(
                "space-y-3",
                group.isToday &&
                  "rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 sm:p-4"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2
                  className={cn(
                    "text-sm sm:text-base font-bold",
                    group.isToday ? "text-blue-800" : "text-slate-800"
                  )}
                >
                  {group.label}
                </h2>
                <span className="text-xs font-medium text-slate-500 tabular-nums">
                  {group.items.length}{" "}
                  {group.items.length === 1 ? "visit" : "visits"}
                </span>
              </div>

              <div className="space-y-2.5">
                {group.items.map((lead) => {
                  const waUrl = buildWhatsAppUrl(lead.phone);
                  const timeStr = formatTimeOnly(lead.appointmentDate);

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
                      className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs hover:bg-slate-50/70 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-blue-700 tabular-nums">
                              {timeStr}
                            </span>
                            <span className="text-base font-semibold text-slate-900 truncate">
                              {lead.name || "Unknown"}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <SourceBadge source={lead.source} />
                            {lead.appointmentStatus && (
                              <AppointmentStatusBadge
                                status={lead.appointmentStatus}
                              />
                            )}
                            {lead.treatment && (
                              <span className="text-xs font-medium text-slate-600">
                                · {lead.treatment}
                              </span>
                            )}
                            {lead.revenue !== null &&
                              lead.appointmentStatus === "Visited" && (
                                <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                                  · {CURRENCY}
                                  {lead.revenue.toLocaleString("en-IN")}
                                </span>
                              )}
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
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <WhatsAppIcon className="h-4 w-4" />
                              WhatsApp
                            </a>
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadAppointmentIcs(lead);
                          }}
                          className="min-h-[44px]"
                        >
                          <CalendarPlus className="h-4 w-4 text-slate-600" />
                          Add to calendar
                        </Button>

                        {lead.appointmentStatus !== "Visited" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={updateMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              openMarkVisited(lead);
                            }}
                            className="min-h-[44px] border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Mark visited
                          </Button>
                        )}

                        {lead.appointmentStatus !== "No-show" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={updateMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              markNoShow(lead);
                            }}
                            className="min-h-[44px] border-red-200 text-red-700 hover:bg-red-50"
                          >
                            <UserX className="h-4 w-4" />
                            No-show
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Mark Visited + Revenue Dialog */}
      <Dialog
        open={visitLead !== null}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) setVisitLead(null);
        }}
      >
        <DialogContent responsiveSheet className="p-0 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Mark Patient Visited</DialogTitle>
            <DialogDescription>
              {visitLead
                ? `Record visit and optional revenue for ${
                    visitLead.name || visitLead.phone
                  }.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={confirmVisited} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="visit-revenue-input"
                className="block text-sm font-medium text-slate-700"
              >
                Revenue collected (optional)
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                  {CURRENCY}
                </span>
                <Input
                  id="visit-revenue-input"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={visitRevenue}
                  onChange={(e) => setVisitRevenue(e.target.value)}
                  placeholder="0"
                  disabled={updateMutation.isPending}
                  className="pl-8 font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVisitLead(null)}
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm Visited
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
