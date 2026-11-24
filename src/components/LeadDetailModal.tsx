import { useEffect, useState } from "react";
import { Calendar, Clock, History, Loader2, Phone, Save } from "lucide-react";
import { CURRENCY, STAFF, TREATMENTS } from "../config";
import {
  APPOINTMENT_STATUSES,
  AppointmentStatus,
  FOLLOW_UP_STATUSES,
  FollowUpStatus,
  Lead,
  UpdateLeadPayload,
} from "../types/lead";
import {
  buildWhatsAppUrl,
  formatDuration,
  formatReceivedDisplay,
  formatRelativeTimeAgo,
  fromLocalDateTimeInputValue,
  getQuickFollowUpDate,
  isLeadOverdue,
  toLocalDateTimeInputValue,
} from "../lib/leadUtils";
import { cn } from "../lib/utils";
import { useLeadActivityQuery, useUpdateLeadMutation } from "../hooks/useLeads";
import {
  MissedBadge,
  OverdueBadge,
  SourceBadge,
  UnassignedBadge,
} from "./LeadBadges";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { Textarea } from "./ui/textarea";

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStaff: string;
}

const STATUS_BUTTON_STYLES: Record<
  FollowUpStatus,
  { active: string; inactive: string }
> = {
  New: {
    active: "bg-blue-600 text-white border-blue-600 shadow-xs",
    inactive: "bg-white text-slate-700 border-slate-200 hover:bg-blue-50/70",
  },
  "Called back": {
    active: "bg-amber-500 text-white border-amber-500 shadow-xs",
    inactive: "bg-white text-slate-700 border-slate-200 hover:bg-amber-50/70",
  },
  Booked: {
    active: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
    inactive: "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50/70",
  },
  "Not interested": {
    active: "bg-slate-700 text-white border-slate-700 shadow-xs",
    inactive: "bg-white text-slate-700 border-slate-200 hover:bg-slate-100",
  },
};

const UNASSIGNED_VALUE = "__UNASSIGNED__";
const CUSTOM_TREATMENT_VALUE = "__CUSTOM__";

export function LeadDetailModal({
  lead,
  open,
  onOpenChange,
  currentStaff,
}: LeadDetailModalProps) {
  const [name, setName] = useState("");
  const [followUp, setFollowUp] = useState<FollowUpStatus>("New");
  const [assignedTo, setAssignedTo] = useState("");
  const [nextFollowUpInput, setNextFollowUpInput] = useState("");
  const [appointmentDateInput, setAppointmentDateInput] = useState("");
  const [appointmentStatus, setAppointmentStatus] =
    useState<AppointmentStatus>("");
  const [treatmentSelect, setTreatmentSelect] = useState("");
  const [customTreatment, setCustomTreatment] = useState("");
  const [revenueInput, setRevenueInput] = useState("");
  const [notes, setNotes] = useState("");

  const updateMutation = useUpdateLeadMutation();
  const activityQuery = useLeadActivityQuery(lead?.row, open && Boolean(lead));

  useEffect(() => {
    if (lead && open) {
      setName(lead.name);
      setFollowUp(lead.followUp);
      setAssignedTo(lead.assignedTo);
      setNextFollowUpInput(toLocalDateTimeInputValue(lead.nextFollowUpDate));
      setAppointmentDateInput(toLocalDateTimeInputValue(lead.appointmentDate));
      setAppointmentStatus(lead.appointmentStatus);

      const t = lead.treatment.trim();
      if (!t) {
        setTreatmentSelect("");
        setCustomTreatment("");
      } else if (TREATMENTS.includes(t)) {
        setTreatmentSelect(t);
        setCustomTreatment("");
      } else {
        setTreatmentSelect(CUSTOM_TREATMENT_VALUE);
        setCustomTreatment(t);
      }

      setRevenueInput(lead.revenue !== null ? String(lead.revenue) : "");
      setNotes(lead.notes);
    }
  }, [lead, open]);

  if (!lead) return null;

  const waUrl = buildWhatsAppUrl(lead.phone);
  const formattedReceived = formatReceivedDisplay(
    lead.receivedRaw,
    lead.receivedDate
  );
  const overdue = isLeadOverdue(lead);
  const lastUpdatedText =
    lead.updatedBy && lead.lastUpdatedDate
      ? `Last updated by ${lead.updatedBy}, ${formatRelativeTimeAgo(
          lead.lastUpdatedDate
        )}`
      : lead.updatedBy
      ? `Last updated by ${lead.updatedBy}`
      : "";

  const effectiveTreatment =
    treatmentSelect === CUSTOM_TREATMENT_VALUE
      ? customTreatment.trim()
      : treatmentSelect;

  const handleSelectFollowUp = (status: FollowUpStatus) => {
    setFollowUp(status);
    if (status === "Booked" && !appointmentStatus) {
      setAppointmentStatus("Scheduled");
    }
  };

  const applyQuickFollowUp = (
    preset: "today_evening" | "tomorrow" | "in_3_days" | "next_week"
  ) => {
    const d = getQuickFollowUpDate(preset);
    setNextFollowUpInput(toLocalDateTimeInputValue(d));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: UpdateLeadPayload = {
      row: lead.row,
      actor: currentStaff || "Staff",
    };

    const trimmedName = name.trim();
    if (trimmedName !== lead.name) {
      payload.name = trimmedName;
    }

    if (followUp !== lead.followUp) {
      payload.followup = followUp;
    }

    if (assignedTo !== lead.assignedTo) {
      payload.assignedTo = assignedTo;
    }

    const origNextInput = toLocalDateTimeInputValue(lead.nextFollowUpDate);
    if (nextFollowUpInput !== origNextInput) {
      payload.nextFollowup = fromLocalDateTimeInputValue(nextFollowUpInput);
    }

    const trimmedNotes = notes.trim();
    if (trimmedNotes !== lead.notes.trim()) {
      payload.notes = trimmedNotes;
    }

    if (followUp === "Booked") {
      const origApptInput = toLocalDateTimeInputValue(lead.appointmentDate);
      if (appointmentDateInput !== origApptInput) {
        payload.appointmentDate =
          fromLocalDateTimeInputValue(appointmentDateInput);
      }
      if (appointmentStatus !== lead.appointmentStatus) {
        payload.appointmentStatus = appointmentStatus;
      }
      if (effectiveTreatment !== lead.treatment) {
        payload.treatment = effectiveTreatment;
      }

      if (appointmentStatus === "Visited") {
        const parsedRev =
          revenueInput.trim() === "" ? "" : Number(revenueInput.trim());
        const origRev = lead.revenue !== null ? lead.revenue : "";
        if (
          parsedRev === "" ||
          (typeof parsedRev === "number" && Number.isFinite(parsedRev) && parsedRev >= 0)
        ) {
          if (parsedRev !== origRev) {
            payload.revenue = parsedRev;
          }
        }
      }
    }

    updateMutation.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent responsiveSheet className="p-0 overflow-hidden">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={lead.source} />
            {lead.isMissed && <MissedBadge />}
            {overdue && <OverdueBadge />}
            {!lead.assignedTo && <UnassignedBadge />}
            {lead.callStatus && !lead.isMissed && (
              <span className="text-xs font-medium text-slate-500">
                {lead.callStatus}
              </span>
            )}
          </div>
          <DialogTitle className="pt-1">
            {lead.name || "Unknown Lead"}
          </DialogTitle>
          <DialogDescription className="space-y-1 text-xs text-slate-500">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formattedReceived}
              </span>
              {lead.durationSec > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Duration {formatDuration(lead.durationSec)}
                  </span>
                </>
              )}
            </span>
            {lastUpdatedText && (
              <span className="block text-xs text-slate-500">
                {lastUpdatedText}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">
            {/* Phone & Quick Contact Actions */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="text-xs font-medium text-slate-500">Phone number</div>
              <div className="mt-1 font-mono text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
                {lead.phone || "—"}
              </div>
              {lead.phone && (
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <Button asChild variant="outline" className="w-full">
                    <a href={`tel:${lead.phone}`}>
                      <Phone className="h-4 w-4 text-blue-600" />
                      Call
                    </a>
                  </Button>
                  {waUrl ? (
                    <Button asChild variant="whatsapp" className="w-full">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Button disabled variant="secondary" className="w-full">
                      WhatsApp
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Editable Name & Assigned To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="lead-detail-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Patient / Contact Name
                </label>
                <Input
                  id="lead-detail-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name (optional)"
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Assigned to
                </label>
                <Select
                  value={assignedTo || UNASSIGNED_VALUE}
                  onValueChange={(val) =>
                    setAssignedTo(val === UNASSIGNED_VALUE ? "" : val)
                  }
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                    {STAFF.map((member) => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Editable Follow-up Status */}
            <div className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">
                Follow-up status
              </span>
              <div className="grid grid-cols-2 gap-2">
                {FOLLOW_UP_STATUSES.map((status) => {
                  const isActive = followUp === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => handleSelectFollowUp(status)}
                      className={cn(
                        "min-h-[46px] rounded-xl border px-3 py-2 text-sm font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                        isActive
                          ? STATUS_BUTTON_STYLES[status].active
                          : STATUS_BUTTON_STYLES[status].inactive
                      )}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next Follow-up Date-Time + Quick Chips */}
            <div className="space-y-2">
              <label
                htmlFor="lead-next-followup"
                className="block text-sm font-medium text-slate-700"
              >
                Next follow-up
              </label>
              <Input
                id="lead-next-followup"
                type="datetime-local"
                value={nextFollowUpInput}
                onChange={(e) => setNextFollowUpInput(e.target.value)}
                disabled={updateMutation.isPending}
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() => applyQuickFollowUp("today_evening")}
                  className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 cursor-pointer"
                >
                  Today evening
                </button>
                <button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() => applyQuickFollowUp("tomorrow")}
                  className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() => applyQuickFollowUp("in_3_days")}
                  className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 cursor-pointer"
                >
                  In 3 days
                </button>
                <button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() => applyQuickFollowUp("next_week")}
                  className="min-h-[36px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 cursor-pointer"
                >
                  Next week
                </button>
                {nextFollowUpInput && (
                  <button
                    type="button"
                    disabled={updateMutation.isPending}
                    onClick={() => setNextFollowUpInput("")}
                    className="min-h-[36px] rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-medium text-red-700 hover:bg-red-100 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Booking Section (shown when status is Booked) */}
            {followUp === "Booked" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span>Booking Details</span>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="lead-appt-date"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Appointment date &amp; time
                  </label>
                  <Input
                    id="lead-appt-date"
                    type="datetime-local"
                    value={appointmentDateInput}
                    onChange={(e) => setAppointmentDateInput(e.target.value)}
                    disabled={updateMutation.isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-700">
                    Appointment status
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {APPOINTMENT_STATUSES.map((st) => {
                      const active = appointmentStatus === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={updateMutation.isPending}
                          onClick={() => setAppointmentStatus(st)}
                          className={cn(
                            "min-h-[44px] rounded-xl border px-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer",
                            active
                              ? st === "No-show"
                                ? "bg-red-600 text-white border-red-600"
                                : st === "Visited"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Treatment
                  </label>
                  <Select
                    value={treatmentSelect || "__NONE__"}
                    onValueChange={(val) =>
                      setTreatmentSelect(val === "__NONE__" ? "" : val)
                    }
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select treatment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__NONE__">Select treatment...</SelectItem>
                      {TREATMENTS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_TREATMENT_VALUE}>
                        Custom treatment...
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {treatmentSelect === CUSTOM_TREATMENT_VALUE && (
                    <Input
                      value={customTreatment}
                      onChange={(e) => setCustomTreatment(e.target.value)}
                      placeholder="Type treatment name"
                      disabled={updateMutation.isPending}
                      className="mt-2"
                    />
                  )}
                </div>

                {appointmentStatus === "Visited" && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor="lead-revenue"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Revenue
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                        {CURRENCY}
                      </span>
                      <Input
                        id="lead-revenue"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={revenueInput}
                        onChange={(e) => setRevenueInput(e.target.value)}
                        placeholder="0"
                        disabled={updateMutation.isPending}
                        className="pl-8 font-mono tabular-nums"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Editable Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="lead-detail-notes"
                className="block text-sm font-medium text-slate-700"
              >
                Notes
              </label>
              <Textarea
                id="lead-detail-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add clinic notes, preferred slot, or follow-up details..."
                rows={3}
                disabled={updateMutation.isPending}
              />
            </div>

            {/* Activity Timeline */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <History className="h-4 w-4 text-slate-500" />
                <span>Activity</span>
              </div>

              {activityQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : activityQuery.isError ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  History unavailable
                </p>
              ) : !activityQuery.data || activityQuery.data.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No activity recorded for this lead yet.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {activityQuery.data.map((item, idx) => (
                    <li
                      key={`${item.timeRaw}-${idx}`}
                      className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800">
                          {item.actor || "Staff"}
                        </span>
                        <span className="text-slate-500 tabular-nums shrink-0">
                          {formatReceivedDisplay(item.timeRaw, item.timeDate)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-600">
                        {item.details || item.action}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-3.5 pb-safe flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              className="flex-1 sm:flex-none"
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
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
