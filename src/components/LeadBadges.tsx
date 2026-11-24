import { AppointmentStatus, FollowUpStatus, LeadSource } from "../types/lead";
import { cn } from "../lib/utils";

const SOURCE_STYLES: Record<LeadSource, string> = {
  Call: "bg-sky-50 text-sky-700 border-sky-200/80",
  Instagram: "bg-pink-50 text-pink-700 border-pink-200/80",
  Website: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  WhatsApp: "bg-teal-50 text-teal-700 border-teal-200/80",
  "Google Listing": "bg-orange-50 text-orange-700 border-orange-200/80",
  Other: "bg-slate-100 text-slate-700 border-slate-200",
};

const FOLLOWUP_STYLES: Record<FollowUpStatus, string> = {
  New: "bg-blue-50 text-blue-700 border-blue-200/80",
  "Called back": "bg-amber-50 text-amber-800 border-amber-200/80",
  Booked: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  "Not interested": "bg-slate-100 text-slate-600 border-slate-200",
};

const APPOINTMENT_STYLES: Record<Exclude<AppointmentStatus, "">, string> = {
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200/80",
  Visited: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  "No-show": "bg-red-50 text-red-700 border-red-200/80",
};

export function SourceBadge({
  source,
  className,
}: {
  source: LeadSource;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0",
        SOURCE_STYLES[source],
        className
      )}
    >
      {source}
    </span>
  );
}

export function FollowUpBadge({
  status,
  className,
}: {
  status: FollowUpStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0",
        FOLLOWUP_STYLES[status],
        className
      )}
    >
      {status}
    </span>
  );
}

export function MissedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 whitespace-nowrap shrink-0",
        className
      )}
    >
      Missed
    </span>
  );
}

export function OverdueBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-red-300 bg-red-600 px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap shrink-0",
        className
      )}
    >
      Overdue
    </span>
  );
}

export function NeedsAttentionBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 whitespace-nowrap shrink-0",
        className
      )}
    >
      Needs attention
    </span>
  );
}

export function UnassignedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0",
        className
      )}
    >
      Unassigned
    </span>
  );
}

export function AppointmentStatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap shrink-0",
        APPOINTMENT_STYLES[status],
        className
      )}
    >
      {status}
    </span>
  );
}
