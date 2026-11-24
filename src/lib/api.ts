import { APPS_SCRIPT_URL, SECRET_KEY } from "../config";
import {
  ActivityItem,
  AddLeadPayload,
  Lead,
  RawActivityItem,
  RawApiLead,
  UpdateLeadPayload,
} from "../types/lead";
import { mapRawActivityItem, mapRawLead } from "./leadUtils";
import {
  mockAddLead,
  mockFetchActivity,
  mockFetchLeads,
  mockUpdateLead,
} from "./mockData";

const REQUEST_TIMEOUT_MS = 15000;

export function isDemoMode(): boolean {
  const url = APPS_SCRIPT_URL.trim();
  return !url || url === "PASTE_APPS_SCRIPT_URL_HERE";
}

function buildUrl(params: Record<string, string>): string {
  const url = new URL(APPS_SCRIPT_URL.trim());
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

async function fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out after 15 seconds. Please check your connection.");
    }
    throw new Error(
      "Can't reach the lead database. Check your internet connection or the Apps Script URL/key in src/config.ts."
    );
  } finally {
    window.clearTimeout(timer);
  }
}

async function parseAppsScriptJson<T extends { ok?: boolean; error?: string; message?: string }>(
  res: Response
): Promise<T> {
  if (!res.ok) {
    throw new Error(`Server returned HTTP ${res.status}. Check your Apps Script deployment.`);
  }

  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(
      "Received an invalid response from Apps Script (expected JSON). Verify the Web App URL and permissions."
    );
  }

  if (!data || data.ok === false) {
    throw new Error(
      data?.error ||
        data?.message ||
        "Apps Script rejected the request. Check SECRET_KEY in src/config.ts."
    );
  }

  return data;
}

export async function fetchLeads(): Promise<Lead[]> {
  if (isDemoMode()) {
    const raw = await mockFetchLeads();
    return raw.map(mapRawLead);
  }

  const endpoint = buildUrl({
    action: "list",
    key: SECRET_KEY.trim(),
  });

  const res = await fetchWithTimeout(endpoint, { method: "GET" });
  const data = await parseAppsScriptJson<{
    ok: boolean;
    leads?: RawApiLead[];
    error?: string;
    message?: string;
  }>(res);

  if (!Array.isArray(data.leads)) {
    throw new Error("Apps Script response is missing the leads array.");
  }

  return data.leads.map(mapRawLead);
}

export async function updateLead(payload: UpdateLeadPayload): Promise<void> {
  if (isDemoMode()) {
    await mockUpdateLead(payload);
    return;
  }

  const endpoint = buildUrl({
    action: "update",
    key: SECRET_KEY.trim(),
  });

  // Only include fields that were explicitly passed as changed
  const body: Record<string, unknown> = {
    row: payload.row,
    actor: payload.actor,
  };
  if (payload.followup !== undefined) body.followup = payload.followup;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.nextFollowup !== undefined) body.nextFollowup = payload.nextFollowup;
  if (payload.assignedTo !== undefined) body.assignedTo = payload.assignedTo;
  if (payload.appointmentDate !== undefined) {
    body.appointmentDate = payload.appointmentDate;
  }
  if (payload.appointmentStatus !== undefined) {
    body.appointmentStatus = payload.appointmentStatus;
  }
  if (payload.treatment !== undefined) body.treatment = payload.treatment;
  if (payload.revenue !== undefined) body.revenue = payload.revenue;

  const res = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  await parseAppsScriptJson<{ ok: boolean; error?: string; message?: string }>(res);
}

export async function addLead(payload: AddLeadPayload): Promise<void> {
  if (isDemoMode()) {
    await mockAddLead(payload);
    return;
  }

  const endpoint = buildUrl({
    key: SECRET_KEY.trim(),
  });

  const body: Record<string, unknown> = {
    phone: payload.phone,
    name: payload.name,
    source: payload.source,
    status: payload.status,
    duration: payload.duration,
    notes: payload.notes,
  };
  if (payload.actor) body.actor = payload.actor;

  const res = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  await parseAppsScriptJson<{ ok: boolean; error?: string; message?: string }>(res);
}

export async function fetchLeadActivity(row?: number): Promise<ActivityItem[]> {
  if (isDemoMode()) {
    const raw = await mockFetchActivity(row);
    return raw.map(mapRawActivityItem);
  }

  const params: Record<string, string> = {
    action: "activity",
    key: SECRET_KEY.trim(),
  };
  if (row !== undefined) {
    params.row = String(row);
  }

  const endpoint = buildUrl(params);
  const res = await fetchWithTimeout(endpoint, { method: "GET" });
  const data = await parseAppsScriptJson<{
    ok: boolean;
    items?: RawActivityItem[];
    error?: string;
    message?: string;
  }>(res);

  if (!Array.isArray(data.items)) {
    throw new Error("Activity response is missing items.");
  }

  return data.items.map(mapRawActivityItem);
}
