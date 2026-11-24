import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface FullErrorCardProps {
  message?: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function FullErrorCard({
  message,
  onRetry,
  isRetrying,
}: FullErrorCardProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-white p-6 sm:p-8 text-center shadow-xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-base sm:text-lg font-semibold text-slate-900">
        Unable to load leads
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
        {message ||
          "Can't reach the lead database. Check your internet connection or the Apps Script URL/key in src/config.ts."}
      </p>
      <Button
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-5 min-w-[140px]"
      >
        <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
        {isRetrying ? "Retrying..." : "Retry"}
      </Button>
    </div>
  );
}

export function InlineErrorBanner({
  message,
  onRetry,
  isRetrying,
}: {
  message?: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
        <span className="truncate">
          {message || "Couldn't refresh leads. Showing last loaded data."}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        disabled={isRetrying}
        className="min-h-[36px] border-red-200 bg-white text-red-700 hover:bg-red-100/60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
        Retry
      </Button>
    </div>
  );
}
