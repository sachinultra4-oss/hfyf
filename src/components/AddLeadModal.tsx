import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { LEAD_SOURCES, LeadSource } from "../types/lead";
import { countDigits } from "../lib/leadUtils";
import { useAddLeadMutation } from "../hooks/useLeads";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStaff: string;
}

export function AddLeadModal({
  open,
  onOpenChange,
  currentStaff,
}: AddLeadModalProps) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState<LeadSource>("Call");
  const [entryStatus, setEntryStatus] = useState<"Manual" | "Walk-in">("Manual");
  const [notes, setNotes] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const addMutation = useAddLeadMutation();

  const resetForm = () => {
    setPhone("");
    setName("");
    setSource("Call");
    setEntryStatus("Manual");
    setNotes("");
    setPhoneError("");
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !addMutation.isPending) {
      setPhoneError("");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPhone = phone.trim();
    if (countDigits(trimmedPhone) < 7) {
      setPhoneError("Please enter a valid phone number (at least 7 digits).");
      return;
    }
    setPhoneError("");

    addMutation.mutate(
      {
        phone: trimmedPhone,
        name: name.trim(),
        source,
        status: entryStatus,
        duration: 0,
        notes: notes.trim(),
        actor: currentStaff || "Staff",
      },
      {
        onSuccess: () => {
          resetForm();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent responsiveSheet className="p-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Log a walk-in patient, DM, or manual phone enquiry.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="space-y-4 p-5">
            {/* Phone (Required) */}
            <div className="space-y-1.5">
              <label
                htmlFor="add-lead-phone"
                className="block text-sm font-medium text-slate-700"
              >
                Phone number <span className="text-red-600">*</span>
              </label>
              <Input
                id="add-lead-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError("");
                }}
                placeholder="e.g. 09226217401"
                disabled={addMutation.isPending}
                aria-invalid={Boolean(phoneError)}
                className={cn(
                  "font-mono",
                  phoneError && "border-red-400 focus-visible:ring-red-600"
                )}
              />
              {phoneError && (
                <p className="text-xs font-medium text-red-600">{phoneError}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="add-lead-name"
                className="block text-sm font-medium text-slate-700"
              >
                Name
              </label>
              <Input
                id="add-lead-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Patient name (optional)"
                disabled={addMutation.isPending}
              />
            </div>

            {/* Source & Entry Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Source
                </label>
                <Select
                  value={source}
                  onValueChange={(val) => setSource(val as LeadSource)}
                  disabled={addMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-slate-700">
                  Entry type
                </span>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  {(["Manual", "Walk-in"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEntryStatus(type)}
                      disabled={addMutation.isPending}
                      className={cn(
                        "min-h-[36px] rounded-lg text-sm font-medium transition-colors cursor-pointer",
                        entryStatus === type
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor="add-lead-notes"
                className="block text-sm font-medium text-slate-700"
              >
                Notes
              </label>
              <Textarea
                id="add-lead-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for visit, preferred date, etc."
                rows={3}
                disabled={addMutation.isPending}
              />
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-0 border-t border-slate-100 bg-white px-5 py-3.5 pb-safe flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={addMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addMutation.isPending}
              className="flex-1"
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Lead
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
