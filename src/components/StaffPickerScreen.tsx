import { UserCheck, Users } from "lucide-react";
import { STAFF } from "../config";
import { cn } from "../lib/utils";

interface StaffPickerScreenProps {
  currentStaff?: string;
  onSelect: (staffName: string) => void;
  onCancel?: () => void;
}

export function StaffPickerScreen({
  currentStaff,
  onSelect,
  onCancel,
}: StaffPickerScreenProps) {
  return (
    <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            Who is using the app?
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose your name so updates and notes are logged under you.
          </p>
        </div>

        <div className="mt-6 space-y-2.5">
          {STAFF.map((member) => {
            const isSelected = currentStaff === member;
            return (
              <button
                key={member}
                type="button"
                onClick={() => onSelect(member)}
                className={cn(
                  "flex min-h-[54px] w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-base font-semibold transition-all cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                  isSelected
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-slate-50/60 text-slate-900 hover:bg-blue-50/50 hover:border-blue-300"
                )}
              >
                <span>{member}</span>
                <UserCheck
                  className={cn(
                    "h-5 w-5",
                    isSelected ? "text-blue-600" : "text-slate-400"
                  )}
                />
              </button>
            );
          })}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
