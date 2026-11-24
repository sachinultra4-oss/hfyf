import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  IndianRupee,
  Percent,
  PhoneMissed,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CURRENCY } from "../config";
import { LEAD_SOURCES, Lead, LeadSource } from "../types/lead";
import {
  formatLocalDateKey,
  formatRelativeSeconds,
  isLeadDueToday,
  isLeadOverdue,
  isSameLocalDay,
  isSameLocalMonth,
} from "../lib/leadUtils";
import { cn } from "../lib/utils";
import { FullErrorCard } from "../components/ErrorStates";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

interface DashboardPageProps {
  leads: Lead[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  dataUpdatedAt: number;
  onRefresh: () => void;
}

const SOURCE_BAR_COLORS: Record<LeadSource, string> = {
  Call: "#0284C7",
  Instagram: "#DB2777",
  Website: "#4F46E5",
  WhatsApp: "#0D9488",
  "Google Listing": "#EA580C",
  Other: "#64748B",
};

export function DashboardPage({
  leads,
  isLoading,
  isFetching,
  isError,
  error,
  dataUpdatedAt,
  onRefresh,
}: DashboardPageProps) {
  const navigate = useNavigate();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const list = leads ?? [];
    const today = new Date();

    const todaysLeads = list.filter(
      (l) => l.receivedDate && isSameLocalDay(l.receivedDate, today)
    ).length;
    const missedCalls = list.filter((l) => l.isMissed).length;
    const stillNew = list.filter((l) => l.followUp === "New").length;

    const overdueCount = list.filter((l) => isLeadOverdue(l, today)).length;
    const dueTodayCount = list.filter((l) => isLeadDueToday(l, today)).length;

    const leadsThisMonth = list.filter(
      (l) => l.receivedDate && isSameLocalMonth(l.receivedDate, today)
    );

    const bookedThisMonth = list.filter((l) => {
      if (l.followUp !== "Booked") return false;
      const refDate = l.appointmentDate ?? l.receivedDate;
      return refDate ? isSameLocalMonth(refDate, today) : false;
    }).length;

    const visitedThisMonthLeads = list.filter((l) => {
      if (l.appointmentStatus !== "Visited") return false;
      const refDate = l.appointmentDate ?? l.lastUpdatedDate ?? l.receivedDate;
      return refDate ? isSameLocalMonth(refDate, today) : false;
    });

    const revenueThisMonth = visitedThisMonthLeads.reduce(
      (sum, l) => sum + (l.revenue ?? 0),
      0
    );

    const convertedThisMonth = leadsThisMonth.filter(
      (l) => l.followUp === "Booked" || l.appointmentStatus === "Visited"
    ).length;

    const conversionRate =
      leadsThisMonth.length > 0
        ? Math.round((convertedThisMonth / leadsThisMonth.length) * 100)
        : 0;

    return {
      total: list.length,
      todaysLeads,
      missedCalls,
      stillNew,
      overdueCount,
      dueTodayCount,
      bookedThisMonth,
      visitedThisMonth: visitedThisMonthLeads.length,
      revenueThisMonth,
      conversionRate,
      leadsThisMonthCount: leadsThisMonth.length,
    };
  }, [leads]);

  const sourceChartData = useMemo(() => {
    const list = leads ?? [];
    const counts = new Map<LeadSource, number>();
    for (const s of LEAD_SOURCES) counts.set(s, 0);
    for (const lead of list) {
      counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1);
    }
    return LEAD_SOURCES.map((source) => ({
      source,
      shortName: source === "Google Listing" ? "Google" : source,
      count: counts.get(source) ?? 0,
      color: SOURCE_BAR_COLORS[source],
    }));
  }, [leads]);

  const dailyChartData = useMemo(() => {
    const list = leads ?? [];
    const countsByDay = new Map<string, number>();

    for (const lead of list) {
      if (!lead.receivedDate) continue;
      const key = formatLocalDateKey(lead.receivedDate);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const days: { dateKey: string; label: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 29; offset >= 0; offset--) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      const dateKey = formatLocalDateKey(d);
      const label = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
      }).format(d);
      days.push({
        dateKey,
        label,
        count: countsByDay.get(dateKey) ?? 0,
      });
    }

    return days;
  }, [leads]);

  if (isLoading && !leads) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
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

  const updatedText = formatRelativeSeconds(
    dataUpdatedAt > 0 ? dataUpdatedAt : null,
    nowMs
  );

  return (
    <div className="space-y-5">
      {/* Top Status & Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Clinic Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 tabular-nums">
            {updatedText}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="min-h-[44px]"
        >
          <RefreshCw
            className={cn("h-4 w-4", isFetching && "animate-spin text-blue-600")}
          />
          <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
        </Button>
      </div>

      {/* Primary 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs sm:text-sm font-medium">Total leads</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {stats.total}
            </div>
            <div className="mt-1 text-xs text-slate-500">All recorded enquiries</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs sm:text-sm font-medium">Today&apos;s leads</span>
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {stats.todaysLeads}
            </div>
            <div className="mt-1 text-xs text-slate-500">Received today</div>
          </CardContent>
        </Card>

        <button
          type="button"
          onClick={() => navigate("/leads?missed=1")}
          className={cn(
            "text-left rounded-xl border p-4 sm:p-5 shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 active:scale-[0.99]",
            stats.missedCalls > 0
              ? "border-red-200 bg-red-50/70 hover:bg-red-50"
              : "border-slate-200/90 bg-white hover:bg-slate-50"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs sm:text-sm font-medium",
                stats.missedCalls > 0 ? "text-red-700" : "text-slate-500"
              )}
            >
              Missed calls
            </span>
            <PhoneMissed
              className={cn(
                "h-4 w-4",
                stats.missedCalls > 0 ? "text-red-600" : "text-slate-400"
              )}
            />
          </div>
          <div
            className={cn(
              "mt-2 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums",
              stats.missedCalls > 0 ? "text-red-700" : "text-slate-900"
            )}
          >
            {stats.missedCalls}
          </div>
          <div
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-xs font-medium",
              stats.missedCalls > 0 ? "text-red-700" : "text-blue-600"
            )}
          >
            <span>View missed</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/leads?followup=New")}
          className="text-left rounded-xl border border-blue-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:bg-blue-50/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs sm:text-sm font-medium">Still &quot;New&quot;</span>
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-blue-700 tabular-nums">
            {stats.stillNew}
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600">
            <span>Needs follow-up</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </button>
      </div>

      {/* Follow-up Reminder Cards: Overdue & Due Today */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => navigate("/follow-ups")}
          className={cn(
            "text-left rounded-xl border p-4 sm:p-5 shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 active:scale-[0.99]",
            stats.overdueCount > 0
              ? "border-red-300 bg-red-50 hover:bg-red-100/70"
              : "border-slate-200/90 bg-white hover:bg-slate-50"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs sm:text-sm font-semibold",
                stats.overdueCount > 0 ? "text-red-700" : "text-slate-600"
              )}
            >
              Overdue follow-ups
            </span>
            <AlertTriangle
              className={cn(
                "h-4 w-4",
                stats.overdueCount > 0 ? "text-red-600" : "text-slate-400"
              )}
            />
          </div>
          <div
            className={cn(
              "mt-2 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums",
              stats.overdueCount > 0 ? "text-red-700" : "text-slate-900"
            )}
          >
            {stats.overdueCount}
          </div>
          <div
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-xs font-medium",
              stats.overdueCount > 0 ? "text-red-700" : "text-slate-500"
            )}
          >
            <span>Open Follow-ups</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/follow-ups")}
          className={cn(
            "text-left rounded-xl border p-4 sm:p-5 shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 active:scale-[0.99]",
            stats.dueTodayCount > 0
              ? "border-amber-300 bg-amber-50/80 hover:bg-amber-50"
              : "border-slate-200/90 bg-white hover:bg-slate-50"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs sm:text-sm font-semibold",
                stats.dueTodayCount > 0 ? "text-amber-800" : "text-slate-600"
              )}
            >
              Due today
            </span>
            <CalendarClock
              className={cn(
                "h-4 w-4",
                stats.dueTodayCount > 0 ? "text-amber-600" : "text-slate-400"
              )}
            />
          </div>
          <div
            className={cn(
              "mt-2 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums",
              stats.dueTodayCount > 0 ? "text-amber-800" : "text-slate-900"
            )}
          >
            {stats.dueTodayCount}
          </div>
          <div
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-xs font-medium",
              stats.dueTodayCount > 0 ? "text-amber-800" : "text-slate-500"
            )}
          >
            <span>Open Follow-ups</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </button>
      </div>

      {/* Monthly Clinic Bookings & Revenue Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs sm:text-sm font-medium">Booked this month</span>
              <CalendarCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {stats.bookedThisMonth}
            </div>
            <div className="mt-1 text-xs text-slate-500">Scheduled &amp; visited</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs sm:text-sm font-medium">Visited this month</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700 tabular-nums">
              {stats.visitedThisMonth}
            </div>
            <div className="mt-1 text-xs text-slate-500">Completed visits</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs sm:text-sm font-medium">Revenue this month</span>
              <IndianRupee className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
              {CURRENCY}
              {stats.revenueThisMonth.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 text-xs text-slate-500">From visited patients</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs sm:text-sm font-medium">Conversion rate</span>
              <Percent className="h-4 w-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-blue-700 tabular-nums">
              {stats.conversionRate}%
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Of {stats.leadsThisMonthCount} leads this month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Leads by source</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sourceChartData}
                  margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 12, fill: "#475569" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#F1F5F9" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                      fontSize: "13px",
                    }}
                    formatter={(value) => [`${value ?? 0} leads`, "Count"]}
                    labelFormatter={(_label, payload) =>
                      payload?.[0]?.payload?.source ?? _label
                    }
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {sourceChartData.map((entry) => (
                      <Cell key={entry.source} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Leads per day (Last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dailyChartData}
                  margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                      boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                      fontSize: "13px",
                    }}
                    formatter={(value) => [`${value ?? 0} leads`, "Leads"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: "#2563EB", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
