import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { REFRESH_MS } from "../config";
import { addLead, fetchLeadActivity, fetchLeads, updateLead } from "../lib/api";
import { isLeadOverdue, parseReceivedDate } from "../lib/leadUtils";
import {
  ActivityItem,
  AddLeadPayload,
  Lead,
  UpdateLeadPayload,
} from "../types/lead";

export const LEADS_QUERY_KEY = ["leads"] as const;
export const ACTIVITY_QUERY_KEY = ["activity"] as const;

export function useLeadsQuery(enabled: boolean) {
  const queryClient = useQueryClient();

  const query = useQuery<Lead[], Error>({
    queryKey: LEADS_QUERY_KEY,
    queryFn: fetchLeads,
    enabled,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 15000,
  });

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, queryClient]);

  return query;
}

export function useLeadActivityQuery(row?: number, enabled: boolean = true) {
  return useQuery<ActivityItem[], Error>({
    queryKey: [...ACTIVITY_QUERY_KEY, row ?? "all"],
    queryFn: () => fetchLeadActivity(row),
    enabled,
    retry: 1,
    staleTime: 20000,
  });
}

export function useUpdateLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateLeadPayload, { previousLeads?: Lead[] }>({
    mutationFn: updateLead,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: LEADS_QUERY_KEY });
      const previousLeads = queryClient.getQueryData<Lead[]>(LEADS_QUERY_KEY);

      if (previousLeads) {
        const now = new Date();
        const nowIso = now.toISOString();

        queryClient.setQueryData<Lead[]>(
          LEADS_QUERY_KEY,
          previousLeads.map((lead) => {
            if (lead.row !== payload.row) return lead;

            const nextLead: Lead = {
              ...lead,
              lastUpdatedRaw: nowIso,
              lastUpdatedDate: now,
              updatedBy: payload.actor,
            };

            if (payload.name !== undefined) nextLead.name = payload.name;
            if (payload.followup !== undefined) nextLead.followUp = payload.followup;
            if (payload.notes !== undefined) nextLead.notes = payload.notes;
            if (payload.assignedTo !== undefined) {
              nextLead.assignedTo = payload.assignedTo;
            }
            if (payload.nextFollowup !== undefined) {
              nextLead.nextFollowUpRaw = payload.nextFollowup;
              nextLead.nextFollowUpDate = parseReceivedDate(payload.nextFollowup);
            }
            if (payload.appointmentDate !== undefined) {
              nextLead.appointmentDateRaw = payload.appointmentDate;
              nextLead.appointmentDate = parseReceivedDate(payload.appointmentDate);
            }
            if (payload.appointmentStatus !== undefined) {
              nextLead.appointmentStatus = payload.appointmentStatus;
            }
            if (payload.treatment !== undefined) {
              nextLead.treatment = payload.treatment;
            }
            if (payload.revenue !== undefined) {
              nextLead.revenue =
                payload.revenue === "" ? null : Number(payload.revenue);
            }

            return nextLead;
          })
        );
      }

      return { previousLeads };
    },
    onError: (err, _payload, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(LEADS_QUERY_KEY, context.previousLeads);
      }
      toast.error(err.message || "Couldn't save changes. Reverted to previous state.");
    },
    onSuccess: () => {
      toast.success("Lead updated");
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: [...ACTIVITY_QUERY_KEY, variables.row],
      });
      queryClient.invalidateQueries({
        queryKey: [...ACTIVITY_QUERY_KEY, "all"],
      });
    },
  });
}

export function useAddLeadMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, AddLeadPayload>({
    mutationFn: addLead,
    onSuccess: () => {
      toast.success("Lead added");
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEY });
    },
    onError: (err) => {
      toast.error(err.message || "Couldn't add lead. Please try again.");
    },
  });
}

export function useLeadAlerts(
  leads: Lead[] | undefined,
  enabled: boolean,
  browserAlertsEnabled: boolean
) {
  const initializedRef = useRef(false);
  const seenRowsRef = useRef<Set<number>>(new Set());
  const notifiedOverdueRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) {
      initializedRef.current = false;
      seenRowsRef.current.clear();
      notifiedOverdueRef.current.clear();
      return;
    }
    if (!leads) return;

    const now = new Date();
    const overdueLeads = leads.filter((l) => isLeadOverdue(l, now));

    if (!initializedRef.current) {
      initializedRef.current = true;
      for (const l of leads) {
        seenRowsRef.current.add(l.row);
      }
      for (const l of overdueLeads) {
        notifiedOverdueRef.current.add(l.row);
      }
      return;
    }

    const newLeads = leads.filter((l) => !seenRowsRef.current.has(l.row));
    for (const l of leads) {
      seenRowsRef.current.add(l.row);
    }

    if (newLeads.length > 0) {
      const msg = `${newLeads.length} new ${
        newLeads.length === 1 ? "lead" : "leads"
      }`;
      toast.info(msg);

      if (
        browserAlertsEnabled &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        const first = newLeads[0];
        new Notification("Lead Tracker — New Lead", {
          body:
            newLeads.length === 1
              ? `${first.name || first.phone} via ${first.source}`
              : `${newLeads.length} new patient enquiries arrived.`,
        });
      }
    }

    const newlyOverdue = overdueLeads.filter(
      (l) => !notifiedOverdueRef.current.has(l.row)
    );
    for (const l of overdueLeads) {
      notifiedOverdueRef.current.add(l.row);
    }

    if (
      newlyOverdue.length > 0 &&
      browserAlertsEnabled &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification("Lead Tracker — Overdue Follow-up", {
        body:
          newlyOverdue.length === 1
            ? `Follow-up overdue for ${newlyOverdue[0].name || newlyOverdue[0].phone}`
            : `${newlyOverdue.length} follow-ups are now overdue.`,
      });
    }
  }, [leads, enabled, browserAlertsEnabled]);
}
