import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BellRing,
  CalendarCheck,
  LayoutDashboard,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import { isDemoMode } from "../lib/api";
import { formatRelativeSeconds } from "../lib/leadUtils";
import { cn } from "../lib/utils";
import { InlineErrorBanner } from "./ErrorStates";
import { Button } from "./ui/button";

interface AppShellProps {
  children: React.ReactNode;
  currentStaff: string;
  followUpAlertCount: number;
  dataUpdatedAt: number;
  isFetching: boolean;
  isError: boolean;
  hasData: boolean;
  errorMessage?: string;
  onRefresh: () => void;
  onLock: () => void;
  onSwitchStaff: () => void;
  onOpenAddLead: () => void;
}

export function AppShell({
  children,
  currentStaff,
  followUpAlertCount,
  dataUpdatedAt,
  isFetching,
  isError,
  hasData,
  errorMessage,
  onRefresh,
  onLock,
  onSwitchStaff,
  onOpenAddLead,
}: AppShellProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const location = useLocation();
  const demo = isDemoMode();

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const updatedLabel = formatRelativeSeconds(
    dataUpdatedAt > 0 ? dataUpdatedAt : null,
    nowMs
  );

  const showFloatingAdd =
    location.pathname === "/" || location.pathname === "/leads";

  const isMoreRoute =
    location.pathname === "/more" ||
    location.pathname === "/analytics" ||
    location.pathname === "/team" ||
    location.pathname === "/settings";

  return (
    <div className="min-h-screen bg-[#F5F8FC] text-slate-900 flex flex-col">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 h-14 md:h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-3.5 sm:px-6">
          {/* Brand + Desktop Nav */}
          <div className="flex items-center gap-5 min-w-0">
            <NavLink
              to="/"
              className="text-base md:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            >
              Lead Tracker
            </NavLink>

            <nav className="hidden lg:flex items-center gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/leads"
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                Leads
              </NavLink>
              <NavLink
                to="/follow-ups"
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                <span>Follow-ups</span>
                {followUpAlertCount > 0 && (
                  <span className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white tabular-nums">
                    {followUpAlertCount > 99 ? "99+" : followUpAlertCount}
                  </span>
                )}
              </NavLink>
              <NavLink
                to="/appointments"
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                Appointments
              </NavLink>
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                Analytics
              </NavLink>
              <NavLink
                to="/team"
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                Team
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )
                }
              >
                Settings
              </NavLink>
            </nav>
          </div>

          {/* Right Controls: Staff Switch, Last updated, Refresh, Add, Lock */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span
              className="hidden xl:inline-block text-xs text-slate-500 tabular-nums whitespace-nowrap mr-1"
              title="Auto-refreshes every 60 seconds"
            >
              {updatedLabel}
            </span>

            <button
              type="button"
              onClick={onSwitchStaff}
              title="Switch active staff member"
              className="inline-flex min-h-[40px] max-w-[130px] sm:max-w-[170px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <UserCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{currentStaff}</span>
              <span className="hidden sm:inline text-xs text-blue-600 shrink-0">
                Switch
              </span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isFetching}
              aria-label="Refresh leads"
              title="Refresh leads"
              className="inline-flex min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px] items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw
                className={cn("h-4 w-4", isFetching && "animate-spin text-blue-600")}
              />
            </button>

            <Button
              type="button"
              size="sm"
              onClick={onOpenAddLead}
              className="hidden md:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>

            <button
              type="button"
              onClick={onLock}
              aria-label="Lock app"
              title="Lock app"
              className="inline-flex min-h-[44px] min-w-[44px] md:min-h-[40px] md:px-3 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Lock className="h-4 w-4 text-slate-500" />
              <span className="hidden md:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-24 lg:px-6 lg:py-6 space-y-4">
        {demo && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-2.5 text-xs sm:text-sm text-blue-900 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-semibold">Demo mode</span>
              <span className="mx-1.5 text-blue-400">·</span>
              <span>
                Previewing sample clinic leads. Paste your Apps Script URL and key in{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs">
                  src/config.ts
                </code>{" "}
                to connect your Google Sheet.
              </span>
            </div>
          </div>
        )}

        {isError && hasData && (
          <InlineErrorBanner
            message={errorMessage}
            onRetry={onRefresh}
            isRetrying={isFetching}
          />
        )}

        {children}
      </main>

      {/* Mobile Floating "+" Add Button (only on Dashboard and Leads) */}
      {showFloatingAdd && (
        <button
          type="button"
          onClick={onOpenAddLead}
          aria-label="Add new lead"
          className="md:hidden fixed right-4 bottom-[calc(4.35rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Bottom Tab Bar (5 items on mobile/tablet) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe"
      >
        <div className="grid h-[56px] grid-cols-5">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                "flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors px-1",
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard
                  className={cn("h-5 w-5", isActive && "stroke-[2.25]")}
                />
                <span className="truncate max-w-full">Dashboard</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/leads"
            className={({ isActive }) =>
              cn(
                "flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors px-1",
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Users className={cn("h-5 w-5", isActive && "stroke-[2.25]")} />
                <span className="truncate max-w-full">Leads</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/follow-ups"
            className={({ isActive }) =>
              cn(
                "relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors px-1",
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <BellRing
                    className={cn("h-5 w-5", isActive && "stroke-[2.25]")}
                  />
                  {followUpAlertCount > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white tabular-nums">
                      {followUpAlertCount > 99 ? "99+" : followUpAlertCount}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-full">Follow-ups</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/appointments"
            className={({ isActive }) =>
              cn(
                "flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors px-1",
                isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <CalendarCheck
                  className={cn("h-5 w-5", isActive && "stroke-[2.25]")}
                />
                <span className="truncate max-w-full">Appts</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/more"
            className={cn(
              "flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors px-1",
              isMoreRoute ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <MoreHorizontal
              className={cn("h-5 w-5", isMoreRoute && "stroke-[2.25]")}
            />
            <span className="truncate max-w-full">More</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
