import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { STAFF } from "./config";
import { AddLeadModal } from "./components/AddLeadModal";
import { AppShell } from "./components/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PinScreen } from "./components/PinScreen";
import { StaffPickerScreen } from "./components/StaffPickerScreen";
import { Toaster } from "./components/ui/sonner";
import { useLeadAlerts, useLeadsQuery } from "./hooks/useLeads";
import { isLeadNeedsAttention, isLeadOverdue } from "./lib/leadUtils";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FollowUpsPage } from "./pages/FollowUpsPage";
import { LeadsPage } from "./pages/LeadsPage";
import { MorePage } from "./pages/MorePage";
import { SettingsPage } from "./pages/SettingsPage";
import { TeamPage } from "./pages/TeamPage";

const SESSION_UNLOCK_KEY = "lead_tracker_unlocked";
const STAFF_STORAGE_KEY = "lead_tracker_staff";
const ALERTS_STORAGE_KEY = "lead_tracker_alerts_enabled";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnReconnect: true,
    },
  },
});

function LeadTrackerApp() {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem(SESSION_UNLOCK_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [currentStaff, setCurrentStaff] = useState<string>(() => {
    try {
      const saved = window.localStorage.getItem(STAFF_STORAGE_KEY) || "";
      return saved;
    } catch {
      return "";
    }
  });

  const [switchingStaff, setSwitchingStaff] = useState(false);

  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState<boolean>(
    () => {
      try {
        return window.localStorage.getItem(ALERTS_STORAGE_KEY) === "true";
      } catch {
        return false;
      }
    }
  );

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [minuteTick, setMinuteTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setMinuteTick(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const appReady = unlocked && Boolean(currentStaff) && !switchingStaff;

  const {
    data: leads,
    isLoading,
    isFetching,
    isError,
    error,
    dataUpdatedAt,
    refetch,
  } = useLeadsQuery(unlocked && Boolean(currentStaff));

  useLeadAlerts(leads, unlocked && Boolean(currentStaff), browserAlertsEnabled);

  const followUpAlertCount = useMemo(() => {
    if (!leads) return 0;
    const now = new Date(minuteTick);
    return leads.filter(
      (l) => isLeadOverdue(l, now) || isLeadNeedsAttention(l, now)
    ).length;
  }, [leads, minuteTick]);

  const handleUnlock = () => {
    try {
      window.sessionStorage.setItem(SESSION_UNLOCK_KEY, "true");
    } catch {
      // Ignore storage errors
    }
    setUnlocked(true);
  };

  const handleLock = () => {
    try {
      window.sessionStorage.removeItem(SESSION_UNLOCK_KEY);
    } catch {
      // Ignore storage errors
    }
    setAddModalOpen(false);
    setSwitchingStaff(false);
    setUnlocked(false);
  };

  const handleSelectStaff = (staffName: string) => {
    try {
      window.localStorage.setItem(STAFF_STORAGE_KEY, staffName);
    } catch {
      // Ignore storage errors
    }
    setCurrentStaff(staffName);
    setSwitchingStaff(false);
  };

  const handleToggleAlerts = (enabled: boolean) => {
    try {
      window.localStorage.setItem(
        ALERTS_STORAGE_KEY,
        enabled ? "true" : "false"
      );
    } catch {
      // Ignore storage errors
    }
    setBrowserAlertsEnabled(enabled);
  };

  if (!unlocked) {
    return <PinScreen onUnlock={handleUnlock} />;
  }

  if (!currentStaff || switchingStaff) {
    return (
      <StaffPickerScreen
        currentStaff={currentStaff || STAFF[0]}
        onSelect={handleSelectStaff}
        onCancel={currentStaff ? () => setSwitchingStaff(false) : undefined}
      />
    );
  }

  if (!appReady) {
    return null;
  }

  return (
    <>
      <AppShell
        currentStaff={currentStaff}
        followUpAlertCount={followUpAlertCount}
        dataUpdatedAt={dataUpdatedAt}
        isFetching={isFetching}
        isError={isError}
        hasData={Boolean(leads)}
        errorMessage={error?.message}
        onRefresh={() => refetch()}
        onLock={handleLock}
        onSwitchStaff={() => setSwitchingStaff(true)}
        onOpenAddLead={() => setAddModalOpen(true)}
      >
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                leads={leads}
                isLoading={isLoading}
                isFetching={isFetching}
                isError={isError}
                error={error}
                dataUpdatedAt={dataUpdatedAt}
                onRefresh={() => refetch()}
              />
            }
          />
          <Route
            path="/leads"
            element={
              <LeadsPage
                leads={leads}
                currentStaff={currentStaff}
                isLoading={isLoading}
                isFetching={isFetching}
                isError={isError}
                error={error}
                onRefresh={() => refetch()}
                onOpenAddLead={() => setAddModalOpen(true)}
              />
            }
          />
          <Route
            path="/follow-ups"
            element={
              <FollowUpsPage
                leads={leads}
                currentStaff={currentStaff}
                isLoading={isLoading}
                isFetching={isFetching}
                isError={isError}
                error={error}
                onRefresh={() => refetch()}
              />
            }
          />
          <Route
            path="/appointments"
            element={
              <AppointmentsPage
                leads={leads}
                currentStaff={currentStaff}
                isLoading={isLoading}
                isFetching={isFetching}
                isError={isError}
                error={error}
                onRefresh={() => refetch()}
              />
            }
          />
          <Route
            path="/more"
            element={
              <MorePage
                currentStaff={currentStaff}
                onSwitchStaff={() => setSwitchingStaff(true)}
                onLock={handleLock}
              />
            }
          />
          <Route
            path="/analytics"
            element={
              <AnalyticsPage
                leads={leads}
                isLoading={isLoading}
                isFetching={isFetching}
                isError={isError}
                error={error}
                onRefresh={() => refetch()}
              />
            }
          />
          <Route
            path="/team"
            element={
              <TeamPage
                leads={leads}
                currentStaff={currentStaff}
                isLoading={isLoading}
                isFetching={isFetching}
                isError={isError}
                error={error}
                onRefresh={() => refetch()}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                currentStaff={currentStaff}
                browserAlertsEnabled={browserAlertsEnabled}
                onToggleBrowserAlerts={handleToggleAlerts}
                onSwitchStaff={() => setSwitchingStaff(true)}
                onLock={handleLock}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>

      <AddLeadModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        currentStaff={currentStaff}
      />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <LeadTrackerApp />
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
