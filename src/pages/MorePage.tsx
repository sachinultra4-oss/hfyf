import { Link } from "react-router-dom";
import {
  BarChart3,
  ChevronRight,
  Lock,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";

interface MorePageProps {
  currentStaff: string;
  onSwitchStaff: () => void;
  onLock: () => void;
}

export function MorePage({
  currentStaff,
  onSwitchStaff,
  onLock,
}: MorePageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          More
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Reports, team performance, and app preferences
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
        <Link
          to="/analytics"
          className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">Analytics</div>
              <div className="text-xs text-slate-500">
                Conversion funnel, source ROI, peak hours &amp; revenue
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
        </Link>

        <Link
          to="/team"
          className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">Team</div>
              <div className="text-xs text-slate-500">
                Per-staff stats, response times &amp; activity log
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
        </Link>

        <Link
          to="/settings"
          className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">Settings</div>
              <div className="text-xs text-slate-500">
                Browser alerts &amp; clinic preferences
              </div>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs divide-y divide-slate-100">
        <button
          type="button"
          onClick={onSwitchStaff}
          className="flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                Switch staff member
              </div>
              <div className="text-xs text-slate-500">
                Currently logged as {currentStaff}
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-blue-600">Switch</span>
        </button>

        <button
          type="button"
          onClick={onLock}
          className="flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-red-50/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-red-700">Lock app</div>
              <div className="text-xs text-slate-500">
                Require clinic PIN to view leads again
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
