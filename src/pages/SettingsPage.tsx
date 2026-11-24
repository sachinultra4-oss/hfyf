import { useState } from "react";
import { Bell, BellOff, Lock, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  APP_PIN,
  CURRENCY,
  DEFAULT_COUNTRY_CODE,
  NEW_LEAD_ALERT_MIN,
  REFRESH_MS,
} from "../config";
import { isDemoMode } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

interface SettingsPageProps {
  currentStaff: string;
  browserAlertsEnabled: boolean;
  onToggleBrowserAlerts: (enabled: boolean) => void;
  onSwitchStaff: () => void;
  onLock: () => void;
}

export function SettingsPage({
  currentStaff,
  browserAlertsEnabled,
  onToggleBrowserAlerts,
  onSwitchStaff,
  onLock,
}: SettingsPageProps) {
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const notificationsSupported = typeof Notification !== "undefined";

  const handleEnableAlerts = async () => {
    if (!notificationsSupported) {
      toast.error("Browser notifications are not supported in this browser.");
      return;
    }

    if (browserAlertsEnabled && permission === "granted") {
      onToggleBrowserAlerts(false);
      toast.info("Browser alerts turned off.");
      return;
    }

    if (permission === "granted") {
      onToggleBrowserAlerts(true);
      toast.success("Alerts enabled while app is open.");
      return;
    }

    if (permission === "denied") {
      toast.error(
        "Notifications are blocked in your browser settings. Please allow them for this site."
      );
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        onToggleBrowserAlerts(true);
        toast.success("Alerts enabled while app is open.");
        new Notification("Lead Tracker", {
          body: "Alerts are active while Lead Tracker is open.",
        });
      } else {
        onToggleBrowserAlerts(false);
        toast.info("Notification permission was not granted.");
      }
    } catch {
      toast.error("Could not request notification permission.");
    }
  };

  const alertsActive = browserAlertsEnabled && permission === "granted";

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Alerts, active staff profile, and clinic configuration
        </p>
      </div>

      {/* Browser Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {alertsActive ? (
              <Bell className="h-5 w-5 text-blue-600" />
            ) : (
              <BellOff className="h-5 w-5 text-slate-400" />
            )}
            <span>In-browser alerts</span>
          </CardTitle>
          <CardDescription>
            Receive a notification when new leads arrive or follow-ups become
            overdue. Alerts only work while the app is open in a browser tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-700">
              Status:{" "}
              <span className="font-semibold">
                {!notificationsSupported
                  ? "Unsupported in this browser"
                  : permission === "denied"
                  ? "Blocked by browser"
                  : alertsActive
                  ? "Enabled while app is open"
                  : "Off"}
              </span>
            </div>

            <Button
              type="button"
              variant={alertsActive ? "outline" : "default"}
              onClick={handleEnableAlerts}
              disabled={!notificationsSupported}
            >
              {alertsActive
                ? "Disable alerts"
                : "Enable alerts while app is open"}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Note: Because Lead Tracker runs without a background push server,
            desktop/mobile notifications are delivered only while this app stays open.
          </p>
        </CardContent>
      </Card>

      {/* Staff & Session */}
      <Card>
        <CardHeader>
          <CardTitle>Staff &amp; Security</CardTitle>
          <CardDescription>
            Staff selection attributes edits and notes in the Activity log.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div>
              <div className="text-xs text-slate-500">Active staff member</div>
              <div className="text-base font-semibold text-slate-900">
                {currentStaff}
              </div>
            </div>
            <Button type="button" variant="outline" onClick={onSwitchStaff}>
              <UserCheck className="h-4 w-4 text-blue-600" />
              Switch
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onLock}
            className="w-full sm:w-auto border-red-200 text-red-700 hover:bg-red-50"
          >
            <Lock className="h-4 w-4" />
            Lock App
          </Button>
        </CardContent>
      </Card>

      {/* Config Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>
            Edit values directly in{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
              src/config.ts
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Data source</div>
            <div className="mt-0.5 font-semibold text-slate-900">
              {isDemoMode() ? "Demo mode" : "Google Apps Script"}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Auto-refresh</div>
            <div className="mt-0.5 font-semibold text-slate-900 tabular-nums">
              Every {Math.round(REFRESH_MS / 1000)}s
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">New lead alert</div>
            <div className="mt-0.5 font-semibold text-slate-900 tabular-nums">
              After {NEW_LEAD_ALERT_MIN} mins
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Country code / Currency</div>
            <div className="mt-0.5 font-semibold text-slate-900 tabular-nums">
              +{DEFAULT_COUNTRY_CODE} · {CURRENCY} · PIN {APP_PIN.replace(/./g, "•")}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
