import { useMemo } from "react";
import { Clock, History, UserCheck, Users } from "lucide-react";
import { STAFF } from "../config";
import { Lead } from "../types/lead";
import { formatReceivedDisplay } from "../lib/leadUtils";
import { useLeadActivityQuery } from "../hooks/useLeads";
import { FullErrorCard } from "../components/ErrorStates";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

interface TeamPageProps {
  leads: Lead[] | undefined;
  currentStaff: string;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  onRefresh: () => void;
}

function formatResponseDuration(avgMinutes: number | null): string {
  if (avgMinutes === null || !Number.isFinite(avgMinutes)) return "—";
  if (avgMinutes < 60) return `${Math.round(avgMinutes)}m`;
  const hrs = Math.floor(avgMinutes / 60);
  const mins = Math.round(avgMinutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function TeamPage({
  leads,
  currentStaff,
  isLoading,
  isFetching,
  isError,
  error,
  onRefresh,
}: TeamPageProps) {
  const activityQuery = useLeadActivityQuery(undefined, true);

  const staffStats = useMemo(() => {
    const list = leads ?? [];
    const activityList = activityQuery.data ?? [];

    // Map each lead row to earliest non-creation activity timestamp (or lastUpdatedDate fallback)
    const firstTouchByRow = new Map<number, Date>();
    for (const item of activityList) {
      if (!item.timeDate || !Number.isFinite(item.row)) continue;
      if (item.action.toLowerCase().includes("added")) continue;
      const existing = firstTouchByRow.get(item.row);
      if (!existing || item.timeDate.getTime() < existing.getTime()) {
        firstTouchByRow.set(item.row, item.timeDate);
      }
    }

    const staffNames = Array.from(
      new Set([
        ...STAFF,
        ...list.map((l) => l.assignedTo).filter(Boolean),
      ])
    );

    const rows = staffNames.map((member) => {
      const assigned = list.filter((l) => l.assignedTo === member);
      const calledBack = assigned.filter(
        (l) => l.followUp === "Called back" || l.followUp === "Booked"
      ).length;
      const booked = assigned.filter((l) => l.followUp === "Booked").length;

      const responseMinutes: number[] = [];
      for (const lead of assigned) {
        if (!lead.receivedDate) continue;
        if (lead.followUp === "New" && !lead.updatedBy) continue;

        const touchDate =
          firstTouchByRow.get(lead.row) ?? lead.lastUpdatedDate;
        if (!touchDate) continue;

        const diffMin =
          (touchDate.getTime() - lead.receivedDate.getTime()) / 60000;
        if (diffMin >= 0 && diffMin < 60 * 24 * 30) {
          responseMinutes.push(diffMin);
        }
      }

      const avgResponseMin =
        responseMinutes.length > 0
          ? responseMinutes.reduce((a, b) => a + b, 0) / responseMinutes.length
          : null;

      return {
        member,
        assignedCount: assigned.length,
        calledBack,
        booked,
        avgResponseMin,
      };
    });

    const unassignedCount = list.filter((l) => !l.assignedTo).length;

    return { rows, unassignedCount };
  }, [leads, activityQuery.data]);

  if (isLoading && !leads) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Team
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Per-staff workload, conversions, and average response time
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 tabular-nums">
          Unassigned leads:{" "}
          <span className="font-bold text-slate-900">
            {staffStats.unassignedCount}
          </span>
        </div>
      </div>

      {/* Staff Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {staffStats.rows.map((row) => {
          const isMe = row.member === currentStaff;
          return (
            <Card
              key={row.member}
              className={isMe ? "border-blue-300 bg-blue-50/20" : undefined}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>{row.member}</span>
                  </CardTitle>
                  {isMe && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      <UserCheck className="h-3 w-3" />
                      You
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <div className="text-xs text-slate-500">Assigned</div>
                  <div className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">
                    {row.assignedCount}
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50/70 p-2.5">
                  <div className="text-xs text-amber-800">Called back</div>
                  <div className="mt-0.5 text-xl font-bold text-amber-800 tabular-nums">
                    {row.calledBack}
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50/70 p-2.5">
                  <div className="text-xs text-emerald-800">Booked</div>
                  <div className="mt-0.5 text-xl font-bold text-emerald-700 tabular-nums">
                    {row.booked}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>Avg 1st follow-up</span>
                  </div>
                  <div className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">
                    {formatResponseDuration(row.avgResponseMin)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Team Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            <span>Recent Team Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : activityQuery.isError ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
              History unavailable
            </p>
          ) : !activityQuery.data || activityQuery.data.length === 0 ? (
            <p className="text-sm text-slate-500">No activity logged yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activityQuery.data.slice(0, 25).map((item, idx) => (
                <li
                  key={`${item.row}-${item.timeRaw}-${idx}`}
                  className="py-2.5 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900">
                      {item.actor || "Staff"}
                    </span>
                    <span className="mx-1.5 text-slate-400">·</span>
                    <span className="text-slate-700">
                      {item.details || item.action}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums shrink-0">
                    {formatReceivedDisplay(item.timeRaw, item.timeDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
