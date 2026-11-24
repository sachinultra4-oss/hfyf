import { DEFAULT_COUNTRY_CODE, NEW_LEAD_ALERT_MIN } from "../config";
import {
  APPOINTMENT_STATUSES,
  ActivityItem,
  AppointmentStatus,
  FOLLOW_UP_STATUSES,
  FollowUpStatus,
  LEAD_SOURCES,
  Lead,
  LeadSource,
  RawActivityItem,
  RawApiLead,
} from "../types/lead";

export function normalizeSource(raw: string | undefined | null): LeadSource {
  const val = (raw ?? "").trim().toLowerCase();
  if (!val) return "Other";
  const found = LEAD_SOURCES.find((s) => s.toLowerCase() === val);
  if (found) return found;
  if (val.includes("insta") || val === "ig") return "Instagram";
  if (val.includes("whats") || val === "wa") return "WhatsApp";
  if (val.includes("google") || val === "gbp" || val === "gmb") return "Google Listing";
  if (val.includes("web") || val.includes("form") || val.includes("site")) return "Website";
  if (val.includes("call") || val.includes("phone")) return "Call";
  return "Other";
}

export function normalizeFollowUp(raw: string | undefined | null): FollowUpStatus {
  const val = (raw ?? "").trim().toLowerCase();
  if (!val) return "New";
  const found = FOLLOW_UP_STATUSES.find((s) => s.toLowerCase() === val);
  if (found) return found;
  if (val.includes("book")) return "Booked";
  if (val.includes("call") || val.includes("contact")) return "Called back";
  if (val.includes("not") || val.includes("uninterest") || val.includes("closed")) {
    return "Not interested";
  }
  return "New";
}

export function normalizeAppointmentStatus(
  raw: string | undefined | null
): AppointmentStatus {
  const val = (raw ?? "").trim().toLowerCase();
  if (!val) return "";
  const found = APPOINTMENT_STATUSES.find((s) => s.toLowerCase() === val);
  if (found) return found;
  if (val.includes("visit") || val.includes("done") || val.includes("complete")) {
    return "Visited";
  }
  if (val.includes("no") && val.includes("show")) return "No-show";
  if (val.includes("sched") || val.includes("confirm")) return "Scheduled";
  return "";
}

export function parseReceivedDate(raw: string | undefined | null): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO format (e.g. 2026-11-23T11:05:00.000Z or 2026-11-23 16:35:00)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const normalizedIso =
      trimmed.includes(" ") && !trimmed.includes("T")
        ? trimmed.replace(" ", "T")
        : trimmed;
    const d = new Date(normalizedIso);
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Handle DD/MM/YYYY or MM/DD/YYYY with optional time (24h or 12h AM/PM)
  const dmyMatch = trimmed.match(
    /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?$/i
  );
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    let hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const meridiem = dmyMatch[7]?.toLowerCase();

    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    let day = p1;
    let month = p2;
    if (p2 > 12 && p1 <= 12) {
      month = p1;
      day = p2;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const candidate = new Date(year, month - 1, day, hour, minute, second);
      if (!Number.isNaN(candidate.getTime())) return candidate;
    }
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

export function formatReceivedDisplay(raw: string, parsedDate: Date | null): string {
  if (!parsedDate) {
    return raw.trim() || "—";
  }
  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(parsedDate);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsedDate);
  return `${datePart}, ${timePart}`;
}

export function formatTimeOnly(parsedDate: Date | null): string {
  if (!parsedDate) return "—";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsedDate);
}

export function formatRelativeTimeAgo(
  date: Date | null,
  nowMs: number = Date.now()
): string {
  if (!date) return "";
  const diffSec = Math.floor((nowMs - date.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} ${mins === 1 ? "min" : "mins"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatReceivedDisplay("", date);
}

export function mapRawLead(raw: RawApiLead): Lead {
  const receivedRaw = raw.Received != null ? String(raw.Received) : "";
  const phone = raw.Phone != null ? String(raw.Phone) : "";
  const source = normalizeSource(raw.Source);
  const callStatus = raw["Call Status"] != null ? String(raw["Call Status"]).trim() : "";
  const durationParsed = Number(raw["Duration (sec)"]);
  const durationSec =
    Number.isFinite(durationParsed) && durationParsed >= 0 ? durationParsed : 0;

  const nextFollowUpRaw =
    raw["Next Follow-up"] != null ? String(raw["Next Follow-up"]).trim() : "";
  const appointmentDateRaw =
    raw["Appointment Date"] != null ? String(raw["Appointment Date"]).trim() : "";
  const lastUpdatedRaw =
    raw["Last Updated"] != null ? String(raw["Last Updated"]).trim() : "";

  const revenueRaw = raw.Revenue;
  const revenueParsed =
    revenueRaw !== undefined && revenueRaw !== null && String(revenueRaw).trim() !== ""
      ? Number(revenueRaw)
      : NaN;
  const revenue =
    Number.isFinite(revenueParsed) && revenueParsed >= 0 ? revenueParsed : null;

  return {
    row: Number(raw.row),
    receivedRaw,
    receivedDate: parseReceivedDate(receivedRaw),
    phone,
    name: raw.Name != null ? String(raw.Name).trim() : "",
    source,
    callStatus,
    durationSec,
    followUp: normalizeFollowUp(raw["Follow-up"]),
    notes: raw.Notes != null ? String(raw.Notes) : "",
    isMissed: source === "Call" && callStatus.toLowerCase().includes("missed"),
    nextFollowUpRaw,
    nextFollowUpDate: parseReceivedDate(nextFollowUpRaw),
    assignedTo: raw["Assigned To"] != null ? String(raw["Assigned To"]).trim() : "",
    appointmentDateRaw,
    appointmentDate: parseReceivedDate(appointmentDateRaw),
    appointmentStatus: normalizeAppointmentStatus(raw["Appointment Status"]),
    treatment: raw.Treatment != null ? String(raw.Treatment).trim() : "",
    revenue,
    lastUpdatedRaw,
    lastUpdatedDate: parseReceivedDate(lastUpdatedRaw),
    updatedBy: raw["Updated By"] != null ? String(raw["Updated By"]).trim() : "",
  };
}

export function mapRawActivityItem(raw: RawActivityItem): ActivityItem {
  const timeRaw = raw.Time != null ? String(raw.Time) : "";
  return {
    timeRaw,
    timeDate: parseReceivedDate(timeRaw),
    row: Number(raw.Row),
    actor: raw.Actor != null ? String(raw.Actor).trim() : "Staff",
    action: raw.Action != null ? String(raw.Action).trim() : "",
    details: raw.Details != null ? String(raw.Details).trim() : "",
  };
}

export function isLeadOverdue(lead: Lead, now: Date = new Date()): boolean {
  if (!lead.nextFollowUpDate) return false;
  if (lead.followUp === "Booked" || lead.followUp === "Not interested") return false;
  return lead.nextFollowUpDate.getTime() < now.getTime();
}

export function isLeadDueToday(lead: Lead, now: Date = new Date()): boolean {
  if (!lead.nextFollowUpDate) return false;
  if (lead.followUp === "Booked" || lead.followUp === "Not interested") return false;
  if (isLeadOverdue(lead, now)) return false;
  return isSameLocalDay(lead.nextFollowUpDate, now);
}

export function isLeadUpcoming7Days(lead: Lead, now: Date = new Date()): boolean {
  if (!lead.nextFollowUpDate) return false;
  if (lead.followUp === "Booked" || lead.followUp === "Not interested") return false;
  if (isLeadOverdue(lead, now)) return false;
  if (isSameLocalDay(lead.nextFollowUpDate, now)) return false;

  const endWindow = new Date(now);
  endWindow.setHours(23, 59, 59, 999);
  endWindow.setDate(endWindow.getDate() + 7);
  return lead.nextFollowUpDate.getTime() <= endWindow.getTime();
}

export function isLeadNeedsAttention(lead: Lead, now: Date = new Date()): boolean {
  if (lead.followUp !== "New") return false;
  if (lead.updatedBy.trim() !== "") return false;
  const callLower = lead.callStatus.toLowerCase();
  const notesLower = lead.notes.toLowerCase();
  if (callLower.includes("spam") || notesLower.includes("spam")) return false;
  if (!lead.receivedDate) return false;
  const ageMs = now.getTime() - lead.receivedDate.getTime();
  return ageMs > NEW_LEAD_ALERT_MIN * 60 * 1000;
}

export function toLocalDateTimeInputValue(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function fromLocalDateTimeInputValue(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

export function getQuickFollowUpDate(
  preset: "today_evening" | "tomorrow" | "in_3_days" | "next_week",
  now: Date = new Date()
): Date {
  const target = new Date(now);
  target.setSeconds(0, 0);

  if (preset === "today_evening") {
    target.setHours(18, 0, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setTime(now.getTime() + 60 * 60 * 1000);
      target.setMinutes(0, 0, 0);
    }
    return target;
  }

  if (preset === "tomorrow") {
    target.setDate(target.getDate() + 1);
    target.setHours(10, 0, 0, 0);
    return target;
  }

  if (preset === "in_3_days") {
    target.setDate(target.getDate() + 3);
    target.setHours(10, 0, 0, 0);
    return target;
  }

  target.setDate(target.getDate() + 7);
  target.setHours(10, 0, 0, 0);
  return target;
}

export function buildWhatsAppUrl(
  phone: string,
  countryCode: string = DEFAULT_COUNTRY_CODE
): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const cleanCC = countryCode.replace(/\D/g, "");
  let waNumber = digits;

  if (cleanCC && !waNumber.startsWith(cleanCC)) {
    if (waNumber.startsWith("0")) {
      waNumber = cleanCC + waNumber.replace(/^0+/, "");
    } else if (waNumber.length <= 10) {
      waNumber = cleanCC + waNumber;
    }
  }

  return `https://wa.me/${waNumber}`;
}

export function matchesLeadSearch(lead: Lead, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  const qLower = q.toLowerCase();

  if (lead.name.toLowerCase().includes(qLower)) {
    return true;
  }

  if (lead.phone.toLowerCase().includes(qLower)) {
    return true;
  }

  const qDigits = q.replace(/\D/g, "");
  if (qDigits.length > 0) {
    const phoneDigits = lead.phone.replace(/\D/g, "");
    const phoneNoLeadingZero = phoneDigits.replace(/^0+/, "");
    const qNoLeadingZero = qDigits.replace(/^0+/, "");

    if (phoneDigits.includes(qDigits)) return true;
    if (qNoLeadingZero.length > 0 && phoneNoLeadingZero.includes(qNoLeadingZero)) {
      return true;
    }
  }

  return false;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameLocalMonth(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
  );
}

export function formatLocalDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  if (mins === 0) return `${rem}s`;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
}

export function countDigits(val: string): number {
  return val.replace(/\D/g, "").length;
}

export function quoteCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function exportLeadsToCsv(leads: Lead[]): void {
  const headers = [
    "Received",
    "Phone",
    "Name",
    "Source",
    "Call Status",
    "Duration (sec)",
    "Follow-up",
    "Next Follow-up",
    "Assigned To",
    "Appointment Date",
    "Appointment Status",
    "Treatment",
    "Revenue",
    "Last Updated",
    "Updated By",
    "Notes",
  ];

  const rows = leads.map((lead) => {
    const formattedReceived = formatReceivedDisplay(
      lead.receivedRaw,
      lead.receivedDate
    );
    const formattedNextFollowUp = lead.nextFollowUpRaw
      ? formatReceivedDisplay(lead.nextFollowUpRaw, lead.nextFollowUpDate)
      : "";
    const formattedApptDate = lead.appointmentDateRaw
      ? formatReceivedDisplay(lead.appointmentDateRaw, lead.appointmentDate)
      : "";
    const formattedLastUpdated = lead.lastUpdatedRaw
      ? formatReceivedDisplay(lead.lastUpdatedRaw, lead.lastUpdatedDate)
      : "";

    const safePhone = lead.phone.replace(/"/g, "");
    const excelPhoneFormula = safePhone ? `="${safePhone}"` : "";

    return [
      quoteCsvField(formattedReceived),
      quoteCsvField(excelPhoneFormula),
      quoteCsvField(lead.name || "Unknown"),
      quoteCsvField(lead.source),
      quoteCsvField(lead.callStatus),
      quoteCsvField(String(lead.durationSec)),
      quoteCsvField(lead.followUp),
      quoteCsvField(formattedNextFollowUp),
      quoteCsvField(lead.assignedTo || "Unassigned"),
      quoteCsvField(formattedApptDate),
      quoteCsvField(lead.appointmentStatus),
      quoteCsvField(lead.treatment),
      quoteCsvField(lead.revenue !== null ? String(lead.revenue) : ""),
      quoteCsvField(formattedLastUpdated),
      quoteCsvField(lead.updatedBy),
      quoteCsvField(lead.notes),
    ].join(",");
  });

  const csvContent =
    "\uFEFF" + [headers.map(quoteCsvField).join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const today = formatLocalDateKey(new Date());

  const link = document.createElement("a");
  link.href = url;
  link.download = `leads-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatIcsUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}T` +
    `${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}Z`
  );
}

function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function downloadAppointmentIcs(lead: Lead): void {
  if (!lead.appointmentDate) return;
  const start = lead.appointmentDate;
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const now = new Date();
  const title = `Clinic Appointment: ${lead.name || lead.phone}`;
  const descriptionLines = [
    `Patient: ${lead.name || "Unknown"}`,
    `Phone: ${lead.phone}`,
    lead.treatment ? `Treatment: ${lead.treatment}` : "",
    lead.notes ? `Notes: ${lead.notes}` : "",
  ].filter(Boolean);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lead Tracker//Clinic Appointments//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:lead-${lead.row}-${start.getTime()}@leadtracker.local`,
    `DTSTAMP:${formatIcsUtc(now)}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines.join("\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `appointment-${lead.row}-${formatLocalDateKey(start)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatRelativeSeconds(
  timestampMs: number | null,
  nowMs: number
): string {
  if (!timestampMs) return "Not yet updated";
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (diffSec < 5) return "Updated just now";
  if (diffSec < 60) return `Last updated ${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins === 1) return "Last updated 1 min ago";
  return `Last updated ${mins} mins ago`;
}
