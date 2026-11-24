// Paste your deployed Google Apps Script Web App URL (ending in /exec).
// Keep this placeholder to preview the app in Demo mode with sample clinic leads.
export const APPS_SCRIPT_URL = "PASTE_APPS_SCRIPT_URL_HERE";

// Paste the secret key configured in your Google Apps Script to authorize requests.
export const SECRET_KEY = "PASTE_SECRET_KEY_HERE";

// Numeric PIN required to unlock the Lead Tracker in each browser session.
export const APP_PIN = "1234";

// Default country dialing code (digits only, no +) used to format local numbers starting with 0 for WhatsApp links.
export const DEFAULT_COUNTRY_CODE = "91";

// Background auto-refresh interval in milliseconds (60000 = 60 seconds).
export const REFRESH_MS = 60000;

// Editable list of clinic team members for lead assignment and activity attribution.
export const STAFF = ["Reception", "Dr. Sultan", "Assistant"];

// Editable list of clinic treatments shown in the Booking section for Booked leads.
export const TREATMENTS = ["Consultation", "Therapy session", "Follow-up visit", "Other"];

// Minutes before an untouched "New" lead is flagged as needing attention.
export const NEW_LEAD_ALERT_MIN = 30;

// Currency symbol displayed next to clinic revenue amounts.
export const CURRENCY = "₹";
