import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Clock,
  Download,
  PhoneMissed,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CURRENCY } from "../config";
import { LEAD_SOURCES, Lead, LeadSource } from "../types/lead";
import { formatLocalDateKey, quoteCsvField } from "../lib/leadUtils";
import { cn } from "../lib/utils";
import { useLeadActivityQuery } from "../hooks/useLeads";
import { FullErrorCard } from "../components/ErrorStates";
import { SourceBadge } from "../components/LeadBadges";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";

interface AnalyticsPageProps {
  leads: Lead[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  onRefresh: () => void;
}

type RangePreset = "7d" | "30d" | "90d" | "custom";

function computePeriodBounds(
  preset: RangePreset,
  customStart: string,
  customEnd: string
): { start: Date; end: Date; prevStart: Date; prevEnd: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let label = "Last 30 days";

  if (preset === "7d") {
    start.setDate(start.getDate() - 6);
    label = "Last 7 days";
  } else if (preset === "30d") {
    start.setDate(start.getDate() - 29);
    label = "Last 30 days";
  } else if (preset === "90d") {
    start.setDate(start.getDate() - 89);
    label = "Last 90 days";
  } else {
    if (customStart) {
      const [y, m, d] = customStart.split("-").map(Number);
      start = new Date(y, m - 1, d, 0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 29);
    }
    if (customEnd) {
      const [y, m, d] = customEnd.split("-").map(Number);
      end.setFullYear(y, m - 1, d);
      end.setHours(23, 59, 59, 999);
    }
    if (end.getTime() < start.getTime()) {
      end.setTime(start.getTime() + 86399999);
    }
    label = `${formatLocalDateKey(start)} to ${formatLocalDateKey(end)}`;
  }

  const spanMs = Math.max(86400000, end.getTime() - start.getTime() + 1);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - spanMs + 1);

  return { start, end, prevStart, prevEnd, label };
}

function DeltaBadge({
  current,
  previous,
  show,
  suffix = "",
}: {
  current: number;
  previous: number;
  show: boolean;
  suffix?: string;
}) {
  if (!show) return null;
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-slate-400">No change</span>;
  }
  const diff = current - previous;
  const pct =
    previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        isUp ? "text-emerald-700" : isDown ? "text-red-600" : "text-slate-500"
      )}
    >
      {isUp && <ArrowUpRight className="h-3.5 w-3.5" />}
      {isDown && <ArrowDownRight className="h-3.5 w-3.5" />}
      <span>
        {isUp ? "+" : ""}
        {suffix ? `${diff}${suffix}` : `${pct}%`} vs prev
      </span>
    </span>
  );
}

function formatAvgMinutes(mins: number | null): string {
  if (mins === null || !Number.isFinite(mins)) return "—";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function AnalyticsPage({
  leads,
  isLoading,
  isFetching,
  isError,
  error,
  onRefresh,
}: AnalyticsPageProps) {
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return formatLocalDateKey(d);
  });
  const [customEnd, setCustomEnd] = useState(() => formatLocalDateKey(new Date()));
  const [comparePrev, setComparePrev] = useState(true);

  const activityQuery = useLeadActivityQuery(undefined, true);

  const bounds = useMemo(
    () => computePeriodBounds(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  const analytics = useMemo(() => {
    const list = leads ?? [];
    const activityList = activityQuery.data ?? [];

    const firstTouchByRow = new Map<number, Date>();
    for (const item of activityList) {
      if (!item.timeDate || !Number.isFinite(item.row)) continue;
      if (item.action.toLowerCase().includes("added")) continue;
      const existing = firstTouchByRow.get(item.row);
      if (!existing || item.timeDate.getTime() < existing.getTime()) {
        firstTouchByRow.set(item.row, item.timeDate);
      }
    }

    const inRange = (l: Lead, s: Date, e: Date) => {
      if (!l.receivedDate) return false;
      const t = l.receivedDate.getTime();
      return t >= s.getTime() && t <= e.getTime();
    };

    const currentLeads = list.filter((l) => inRange(l, bounds.start, bounds.end));
    const prevLeads = list.filter((l) =>
      inRange(l, bounds.prevStart, bounds.prevEnd)
    );

    const summarize = (subset: Lead[]) => {
      const total = subset.length;
      const calledBack = subset.filter(
        (l) => l.followUp === "Called back" || l.followUp === "Booked"
      ).length;
      const booked = subset.filter((l) => l.followUp === "Booked").length;
      const visited = subset.filter(
        (l) => l.appointmentStatus === "Visited"
      ).length;
      const revenue = subset
        .filter((l) => l.appointmentStatus === "Visited")
        .reduce((acc, l) => acc + (l.revenue ?? 0), 0);
      const conversionPct = total > 0 ? Math.round((booked / total) * 100) : 0;

      return { total, calledBack, booked, visited, revenue, conversionPct };
    };

    const cur = summarize(currentLeads);
    const prev = summarize(prevLeads);

    // Funnel data
    const funnel = [
      {
        stage: "Leads",
        count: cur.total,
        pct: cur.total > 0 ? 100 : 0,
        color: "#2563EB",
      },
      {
        stage: "Called back",
        count: cur.calledBack,
        pct: cur.total > 0 ? Math.round((cur.calledBack / cur.total) * 100) : 0,
        color: "#D97706",
      },
      {
        stage: "Booked",
        count: cur.booked,
        pct: cur.total > 0 ? Math.round((cur.booked / cur.total) * 100) : 0,
        color: "#059669",
      },
      {
        stage: "Visited",
        count: cur.visited,
        pct: cur.total > 0 ? Math.round((cur.visited / cur.total) * 100) : 0,
        color: "#047857",
      },
    ];

    // Source performance
    const sourceRows = LEAD_SOURCES.map((source) => {
      const sub = currentLeads.filter((l) => l.source === source);
      const count = sub.length;
      const booked = sub.filter((l) => l.followUp === "Booked").length;
      const visited = sub.filter(
        (l) => l.appointmentStatus === "Visited"
      ).length;
      const revenue = sub
        .filter((l) => l.appointmentStatus === "Visited")
        .reduce((sum, l) => sum + (l.revenue ?? 0), 0);
      const conversion = count > 0 ? Math.round((booked / count) * 100) : 0;
      return { source, count, booked, visited, conversion, revenue };
    });

    let bestSource: LeadSource | null = null;
    let bestScore = -1;
    for (const row of sourceRows) {
      if (row.count === 0) continue;
      const score = row.conversion * 100000 + row.revenue + row.count;
      if (score > bestScore && row.booked > 0) {
        bestScore = score;
        bestSource = row.source;
      }
    }

    // Hour of day distribution (0-23)
    const hourCounts = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label:
        hour === 0
          ? "12a"
          : hour < 12
          ? `${hour}a`
          : hour === 12
          ? "12p"
          : `${hour - 12}p`,
      count: 0,
    }));
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekdayCounts = weekdayNames.map((day) => ({ day, count: 0 }));

    for (const l of currentLeads) {
      if (!l.receivedDate) continue;
      hourCounts[l.receivedDate.getHours()].count += 1;
      weekdayCounts[l.receivedDate.getDay()].count += 1;
    }

    const peakHour = hourCounts.reduce(
      (best, item) => (item.count > best.count ? item : best),
      hourCounts[0]
    );
    const peakWeekday = weekdayCounts.reduce(
      (best, item) => (item.count > best.count ? item : best),
      weekdayCounts[0]
    );

    // Missed calls recovery
    const missedLeads = currentLeads.filter((l) => l.isMissed);
    const missedCalledBack = missedLeads.filter(
      (l) => l.followUp === "Called back" || l.followUp === "Booked"
    );
    const missedRecoveryPct =
      missedLeads.length > 0
        ? Math.round((missedCalledBack.length / missedLeads.length) * 100)
        : 0;

    const missedTimesMin: number[] = [];
    for (const l of missedCalledBack) {
      if (!l.receivedDate) continue;
      const touch = firstTouchByRow.get(l.row) ?? l.lastUpdatedDate;
      if (!touch) continue;
      const diff = (touch.getTime() - l.receivedDate.getTime()) / 60000;
      if (diff >= 0 && diff < 60 * 24 * 30) {
        missedTimesMin.push(diff);
      }
    }
    const avgMissedCallbackMin =
      missedTimesMin.length > 0
        ? missedTimesMin.reduce((a, b) => a + b, 0) / missedTimesMin.length
        : null;

    // Revenue by month (respecting date range)
    const monthMap = new Map<string, { sortKey: string; month: string; revenue: number }>();
    const treatmentMap = new Map<string, number>();

    for (const l of currentLeads) {
      if (l.appointmentStatus !== "Visited") continue;
      const rev = l.revenue ?? 0;
      const d = l.appointmentDate ?? l.receivedDate;
      if (d) {
        const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
        const monthLabel = new Intl.DateTimeFormat("en-US", {
          month: "short",
          year: "2-digit",
        }).format(d);
        const existing = monthMap.get(sortKey);
        if (existing) {
          existing.revenue += rev;
        } else {
          monthMap.set(sortKey, { sortKey, month: monthLabel, revenue: rev });
        }
      }

      const tKey = l.treatment.trim() || "Unspecified";
      treatmentMap.set(tKey, (treatmentMap.get(tKey) ?? 0) + rev);
    }

    const revenueByMonth = Array.from(monthMap.values()).sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey)
    );
    const revenueByTreatment = Array.from(treatmentMap.entries())
      .map(([treatment, revenue]) => ({ treatment, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      cur,
      prev,
      funnel,
      sourceRows,
      bestSource,
      hourCounts,
      weekdayCounts,
      peakHour,
      peakWeekday,
      missedTotal: missedLeads.length,
      missedCalledBackCount: missedCalledBack.length,
      missedRecoveryPct,
      avgMissedCallbackMin,
      revenueByMonth,
      revenueByTreatment,
    };
  }, [leads, activityQuery.data, bounds]);

  const exportSummaryCsv = () => {
    const lines: string[] = [];
    lines.push(
      [
        quoteCsvField("Section"),
        quoteCsvField("Metric / Category"),
        quoteCsvField("Leads / Count"),
        quoteCsvField("Booked"),
        quoteCsvField("Visited"),
        quoteCsvField("Rate / %"),
        quoteCsvField(`Revenue (${CURRENCY})`),
      ].join(",")
    );

    lines.push(
      [
        quoteCsvField("Period"),
        quoteCsvField(bounds.label),
        quoteCsvField(String(analytics.cur.total)),
        quoteCsvField(String(analytics.cur.booked)),
        quoteCsvField(String(analytics.cur.visited)),
        quoteCsvField(`${analytics.cur.conversionPct}%`),
        quoteCsvField(String(analytics.cur.revenue)),
      ].join(",")
    );

    for (const f of analytics.funnel) {
      lines.push(
        [
          quoteCsvField("Funnel"),
          quoteCsvField(f.stage),
          quoteCsvField(String(f.count)),
          quoteCsvField(""),
          quoteCsvField(""),
          quoteCsvField(`${f.pct}%`),
          quoteCsvField(""),
        ].join(",")
      );
    }

    for (const s of analytics.sourceRows) {
      lines.push(
        [
          quoteCsvField("Source"),
          quoteCsvField(s.source),
          quoteCsvField(String(s.count)),
          quoteCsvField(String(s.booked)),
          quoteCsvField(String(s.visited)),
          quoteCsvField(`${s.conversion}%`),
          quoteCsvField(String(s.revenue)),
        ].join(",")
      );
    }

    lines.push(
      [
        quoteCsvField("Missed Calls"),
        quoteCsvField("Recovery"),
        quoteCsvField(String(analytics.missedTotal)),
        quoteCsvField(String(analytics.missedCalledBackCount)),
        quoteCsvField(""),
        quoteCsvField(`${analytics.missedRecoveryPct}%`),
        quoteCsvField(formatAvgMinutes(analytics.avgMissedCallbackMin)),
      ].join(",")
    );

    for (const t of analytics.revenueByTreatment) {
      lines.push(
        [
          quoteCsvField("Treatment Revenue"),
          quoteCsvField(t.treatment),
          quoteCsvField(""),
          quoteCsvField(""),
          quoteCsvField(""),
          quoteCsvField(""),
          quoteCsvField(String(t.revenue)),
        ].join(",")
      );
    }

    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clinic-analytics-${formatLocalDateKey(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading && !leads) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
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

  return (
    <div className="space-y-5">
      {/* Header & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">{bounds.label}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportSummaryCsv}
          className="min-h-[44px]"
        >
          <Download className="h-4 w-4" />
          Export summary CSV
        </Button>
      </div>

      {/* Date Range & Comparison Controls */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:w-56">
            <Select
              value={preset}
              onValueChange={(val) => setPreset(val as RangePreset)}
            >
              <SelectTrigger aria-label="Select analytics date range">
                <SelectValue placeholder="Last 30 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={() => setComparePrev((prev) => !prev)}
            className={cn(
              "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors cursor-pointer",
              comparePrev
                ? "border-blue-600 bg-blue-50 text-blue-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>Compare to previous period</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs font-semibold",
                comparePrev
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {comparePrev ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        {preset === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label
                htmlFor="analytics-start"
                className="block text-xs font-medium text-slate-600"
              >
                Start date
              </label>
              <Input
                id="analytics-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="analytics-end"
                className="block text-xs font-medium text-slate-600"
              >
                End date
              </label>
              <Input
                id="analytics-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Period Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Leads</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {analytics.cur.total}
            </div>
            <div className="mt-1 min-h-[18px]">
              <DeltaBadge
                current={analytics.cur.total}
                previous={analytics.prev.total}
                show={comparePrev}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Booked</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
              {analytics.cur.booked}
            </div>
            <div className="mt-1 min-h-[18px]">
              <DeltaBadge
                current={analytics.cur.booked}
                previous={analytics.prev.booked}
                show={comparePrev}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Conversion rate</div>
            <div className="mt-1 text-2xl font-bold text-blue-700 tabular-nums">
              {analytics.cur.conversionPct}%
            </div>
            <div className="mt-1 min-h-[18px]">
              <DeltaBadge
                current={analytics.cur.conversionPct}
                previous={analytics.prev.conversionPct}
                show={comparePrev}
                suffix="pp"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Revenue</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {CURRENCY}
              {analytics.cur.revenue.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 min-h-[18px]">
              <DeltaBadge
                current={analytics.cur.revenue}
                previous={analytics.prev.revenue}
                show={comparePrev}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel + Missed Call Recovery */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Lead Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {analytics.funnel.map((step) => (
                <div
                  key={step.stage}
                  className="rounded-lg bg-slate-50 p-2.5 text-center"
                >
                  <div className="text-[11px] font-medium text-slate-500 truncate">
                    {step.stage}
                  </div>
                  <div className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums">
                    {step.count}
                  </div>
                  <div className="text-[11px] font-semibold text-blue-700 tabular-nums">
                    {step.pct}%
                  </div>
                </div>
              ))}
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.funnel}
                  margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 12, fill: "#475569" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      `${value ?? 0} (${item?.payload?.pct ?? 0}%)`,
                      "Count",
                    ]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {analytics.funnel.map((entry) => (
                      <Cell key={entry.stage} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <PhoneMissed className="h-4 w-4 text-red-600" />
              <span>Missed Call Recovery</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-100 bg-red-50/70 p-3.5">
                <div className="text-xs font-medium text-red-700">
                  Total missed calls
                </div>
                <div className="mt-1 text-2xl font-bold text-red-700 tabular-nums">
                  {analytics.missedTotal}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5">
                <div className="text-xs font-medium text-emerald-800">
                  Called back
                </div>
                <div className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
                  {analytics.missedCalledBackCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="text-xs font-medium text-slate-600">
                  Recovery rate
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                  {analytics.missedRecoveryPct}%
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Avg callback time</span>
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                  {formatAvgMinutes(analytics.avgMissedCallbackMin)}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Recovery counts missed calls updated to Called back or Booked within
              the selected range.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Source Performance (Cards on mobile, Table on desktop -> zero horizontal scroll at 375px) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Source Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-2.5">
            {analytics.sourceRows.map((row) => {
              const isBest = analytics.bestSource === row.source;
              return (
                <div
                  key={row.source}
                  className={cn(
                    "rounded-xl border p-3.5 space-y-2",
                    isBest
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-200 bg-slate-50/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <SourceBadge source={row.source} />
                    {isBest && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                        <Award className="h-3 w-3" />
                        Best source
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center pt-1">
                    <div>
                      <div className="text-[11px] text-slate-500">Leads</div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums">
                        {row.count}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Booked</div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums">
                        {row.booked}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Conv %</div>
                      <div className="text-sm font-bold text-blue-700 tabular-nums">
                        {row.conversion}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Revenue</div>
                      <div className="text-sm font-bold text-emerald-700 tabular-nums">
                        {CURRENCY}
                        {row.revenue.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 pr-3">Source</th>
                  <th className="py-2.5 px-3 text-right">Leads</th>
                  <th className="py-2.5 px-3 text-right">Booked</th>
                  <th className="py-2.5 px-3 text-right">Visited</th>
                  <th className="py-2.5 px-3 text-right">Conversion %</th>
                  <th className="py-2.5 pl-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.sourceRows.map((row) => {
                  const isBest = analytics.bestSource === row.source;
                  return (
                    <tr
                      key={row.source}
                      className={isBest ? "bg-emerald-50/50" : undefined}
                    >
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <SourceBadge source={row.source} />
                          {isBest && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                              <Award className="h-3 w-3" />
                              Best
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium tabular-nums">
                        {row.count}
                      </td>
                      <td className="py-3 px-3 text-right font-medium tabular-nums">
                        {row.booked}
                      </td>
                      <td className="py-3 px-3 text-right font-medium tabular-nums">
                        {row.visited}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-700 tabular-nums">
                        {row.conversion}%
                      </td>
                      <td className="py-3 pl-3 text-right font-semibold text-emerald-700 tabular-nums">
                        {CURRENCY}
                        {row.revenue.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* When Do Leads Come In (Hour + Weekday) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>When leads arrive (by hour)</CardTitle>
            <p className="text-xs text-slate-500">
              Peak hour:{" "}
              <span className="font-semibold text-slate-800">
                {analytics.peakHour.label} ({analytics.peakHour.count} leads)
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.hourCounts}
                  margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#64748B" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0} leads`, "Arrivals"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="#2563EB"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Leads by day of week</CardTitle>
            <p className="text-xs text-slate-500">
              Busiest day:{" "}
              <span className="font-semibold text-slate-800">
                {analytics.peakWeekday.day} ({analytics.peakWeekday.count} leads)
              </span>
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.weekdayCounts}
                  margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: "#475569" }}
                    axisLine={{ stroke: "#CBD5E1" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#64748B" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0} leads`, "Leads"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="#0284C7"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Month & Revenue by Treatment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Revenue by month</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.revenueByMonth.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                No visited revenue recorded in this period.
              </p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.revenueByMonth}
                    margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2E8F0"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#475569" }}
                      axisLine={{ stroke: "#CBD5E1" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${CURRENCY}${Number(value ?? 0).toLocaleString("en-IN")}`,
                        "Revenue",
                      ]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#059669"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Revenue by treatment</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.revenueByTreatment.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                No treatment revenue recorded in this period.
              </p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.revenueByTreatment}
                    margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#E2E8F0"
                    />
                    <XAxis
                      dataKey="treatment"
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={{ stroke: "#CBD5E1" }}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${CURRENCY}${Number(value ?? 0).toLocaleString("en-IN")}`,
                        "Revenue",
                      ]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#0D9488"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
