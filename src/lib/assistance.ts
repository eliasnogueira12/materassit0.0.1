import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playChime } from "@/lib/format";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AssistanceRequest = {
  id: string;
  kiosk_label: string;
  message: string | null;
  reason: string | null;
  status: "pending" | "accepted" | "attending" | "refused" | "expired" | "done";
  created_at: string;
  resolved_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  customer_id: string | null;
  customer_number: number | null;
};

export async function callStaff(
  kioskLabel = "Quiosque 1",
  opts?: { message?: string; reason?: string; customer_id?: string | null; customer_number?: number | null },
) {
  const expires_at = new Date(Date.now() + 120_000).toISOString();
  const { data, error } = await supabase
    .from("assistance_requests")
    .insert({
      kiosk_label: kioskLabel,
      message: opts?.message ?? null,
      reason: opts?.reason ?? null,
      status: "pending",
      customer_id: opts?.customer_id ?? null,
      customer_number: opts?.customer_number ?? null,
      expires_at,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export function useAssistanceRequests(options?: { onNew?: () => void }) {
  const [items, setItems] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data, error } = await supabase
      .from("assistance_requests")
      .select("*")
      .not("status", "in", "(done,refused,expired)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setItems((data ?? []) as AssistanceRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const channelId = `assistance-requests-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assistance_requests" },
        (payload) => {
          if (payload.eventType === "INSERT") options?.onNew?.();
          refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { items, loading, refresh };
}

export const setRequestStatus = createServerFn({ method: "POST" })
  .inputValidator((d: any) => {
    const payload = d?.data !== undefined ? d.data : d;
    return z
      .object({
        id: z.string(),
        status: z.enum(["accepted", "refused", "done", "expired", "attending"]),
      })
      .parse(payload);
  })
  .handler(async ({ data }) => {
    const { id, status } = data;
    const patch: Record<string, unknown> = { status };
    if (status === "accepted") patch.accepted_at = new Date().toISOString();
    if (status === "done") patch.resolved_at = new Date().toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("assistance_requests").update(patch as any).eq("id", id);
    if (error) throw error;
  })

export { playChime };
