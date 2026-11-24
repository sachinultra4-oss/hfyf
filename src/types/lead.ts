export const LEAD_SOURCES = [
  "Call",
  "Instagram",
  "Website",
  "WhatsApp",
  "Google Listing",
  "Other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const FOLLOW_UP_STATUSES = [
  "New",
  "Called back",
  "Booked",
  "Not interested",
] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const APPOINTMENT_STATUSES = [
  "Scheduled",
  "Visited",
  "No-show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number] | "";

export interface RawApiLead {
  row: number;
  Received: string;
  Phone: string | number;
  Name: string;
  Source: string;
  "Call Status": string;
  "Duration (sec)": string | number;
  "Follow-up": string;
  Notes: string;
  "Next Follow-up"?: string;
  "Assigned To"?: string;
  "Appointment Date"?: string;
  "Appointment Status"?: string;
  Treatment?: string;
  Revenue?: string | number;
  "Last Updated"?: string;
  "Updated By"?: string;
}

export interface Lead {
  row: number;
  receivedRaw: string;
  receivedDate: Date | null;
  phone: string; // Always preserved as string, never converted to number
  name: string;
  source: LeadSource;
  callStatus: string;
  durationSec: number;
  followUp: FollowUpStatus;
  notes: string;
  isMissed: boolean;
  nextFollowUpRaw: string;
  nextFollowUpDate: Date | null;
  assignedTo: string;
  appointmentDateRaw: string;
  appointmentDate: Date | null;
  appointmentStatus: AppointmentStatus;
  treatment: string;
  revenue: number | null;
  lastUpdatedRaw: string;
  lastUpdatedDate: Date | null;
  updatedBy: string;
}

export interface UpdateLeadPayload {
  row: number;
  actor: string;
  followup?: FollowUpStatus;
  notes?: string;
  name?: string;
  nextFollowup?: string;
  assignedTo?: string;
  appointmentDate?: string;
  appointmentStatus?: AppointmentStatus;
  treatment?: string;
  revenue?: number | "";
}

export interface AddLeadPayload {
  phone: string;
  name: string;
  source: LeadSource;
  status: "Walk-in" | "Manual";
  duration: 0;
  notes: string;
  actor?: string;
}

export interface RawActivityItem {
  Time: string;
  Row: number | string;
  Actor: string;
  Action: string;
  Details: string;
}

export interface ActivityItem {
  timeRaw: string;
  timeDate: Date | null;
  row: number;
  actor: string;
  action: string;
  details: string;
}
