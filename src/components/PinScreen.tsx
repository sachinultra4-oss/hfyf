import React, { useEffect, useRef, useState } from "react";
import { Delete, Lock, ShieldCheck } from "lucide-react";
import { APP_PIN } from "../config";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

interface PinScreenProps {
  onUnlock: () => void;
}

export function PinScreen({ onUnlock }: PinScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const expectedLength = Math.max(4, APP_PIN.length);

  const triggerFailure = () => {
    setError("Wrong PIN. Please try again.");
    setShaking(true);
    setPin("");
    window.setTimeout(() => setShaking(false), 420);
  };

  const attemptUnlock = (candidate: string) => {
    if (candidate === APP_PIN) {
      setError("");
      onUnlock();
    } else {
      triggerFailure();
    }
  };

  const handleDigit = (digit: string) => {
    if (shaking) return;
    setError("");
    const next = (pin + digit).slice(0, expectedLength);
    setPin(next);
    if (next.length === APP_PIN.length) {
      window.setTimeout(() => attemptUnlock(next), 90);
    }
  };

  const handleBackspace = () => {
    setError("");
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError("");
    setPin("");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Enter" && pin.length > 0) {
        e.preventDefault();
        attemptUnlock(pin);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="min-h-screen bg-[#F5F8FC] flex items-center justify-center p-4">
      <div
        className={cn(
          "w-full max-w-[360px] rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm",
          shaking && "animate-shake"
        )}
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
            Lead Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your clinic PIN to view patient leads
          </p>
        </div>

        {/* PIN dots / input */}
        <div
          className="mt-6 flex items-center justify-center gap-3 cursor-text"
          onClick={() => hiddenInputRef.current?.focus()}
        >
          {Array.from({ length: APP_PIN.length }).map((_, idx) => {
            const filled = idx < pin.length;
            return (
              <div
                key={idx}
                className={cn(
                  "flex h-12 w-11 items-center justify-center rounded-xl border text-lg font-semibold transition-all",
                  error
                    ? "border-red-300 bg-red-50/70"
                    : filled
                    ? "border-blue-600 bg-blue-50/60"
                    : "border-slate-200 bg-slate-50/60"
                )}
              >
                <span
                  className={cn(
                    "h-3 w-3 rounded-full transition-transform",
                    filled
                      ? error
                        ? "scale-100 bg-red-600"
                        : "scale-100 bg-blue-600"
                      : "scale-75 bg-slate-300"
                  )}
                />
              </div>
            );
          })}
          <input
            ref={hiddenInputRef}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Enter PIN"
            value={pin}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, "").slice(0, APP_PIN.length);
              setError("");
              setPin(cleaned);
              if (cleaned.length === APP_PIN.length) {
                window.setTimeout(() => attemptUnlock(cleaned), 90);
              }
            }}
            className="sr-only"
          />
        </div>

        <div className="mt-3 min-h-[20px] text-center">
          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {digits.map((d) => (
            <Button
              key={d}
              type="button"
              variant="outline"
              onClick={() => handleDigit(d)}
              className="h-13 text-lg font-semibold tabular-nums border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-900"
            >
              {d}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="h-13 text-sm font-medium text-slate-500"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDigit("0")}
            className="h-13 text-lg font-semibold tabular-nums border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-900"
          >
            0
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="h-13 text-slate-600"
          >
            <Delete className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Session stays unlocked until you lock or close this tab</span>
        </div>
      </div>
    </div>
  );
}
