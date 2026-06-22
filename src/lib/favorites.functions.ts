import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const toggleFavorite = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        customerId: z.string().uuid(),
        productId: z.string().uuid(),
        productName: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("customer_history")
      .select("payload")
      .eq("customer_id", data.customerId)
      .eq("event_type", "favorite")
      .filter("payload->>product_id", "eq", data.productId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentlyFavorited = existing?.payload?.favorited === true;
    const newState = !currentlyFavorited;

    await supabaseAdmin.from("customer_history").insert({
      customer_id: data.customerId,
      event_type: "favorite",
      payload: {
        product_id: data.productId,
        product_name: data.productName,
        favorited: newState,
      },
    });

    return { favorited: newState };
  });

export const getFavoriteIds = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ customerId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("customer_history")
      .select("payload")
      .eq("customer_id", data.customerId)
      .eq("event_type", "favorite")
      .order("created_at", { ascending: false });

    const latest = new Map<string, boolean>();
    for (const row of rows ?? []) {
      const pid = (row.payload as any)?.product_id as string | undefined;
      if (pid && !latest.has(pid)) {
        latest.set(pid, (row.payload as any)?.favorited === true);
      }
    }

    return Array.from(latest.entries())
      .filter(([_, fav]) => fav)
      .map(([id]) => id);
  });

export const getMostFavorited = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("customer_history")
    .select("customer_id, payload")
    .eq("event_type", "favorite")
    .order("created_at", { ascending: false })
    .limit(10000);

  // per customer+product, keep only the latest entry
  const latest = new Map<
    string,
    { product_id: string; product_name: string; favorited: boolean }
  >();
  for (const row of data ?? []) {
    const p = row.payload as {
      product_id?: string;
      product_name?: string;
      favorited?: boolean;
    } | null;
    if (!p?.product_id) continue;
    const key = `${row.customer_id}_${p.product_id}`;
    if (!latest.has(key)) {
      latest.set(key, {
        product_id: p.product_id,
        product_name: p.product_name ?? "",
        favorited: p.favorited === true,
      });
    }
  }

  // count how many customers have it favorited
  const countMap = new Map<string, { count: number; name: string }>();
  for (const entry of latest.values()) {
    if (!entry.favorited) continue;
    const existing = countMap.get(entry.product_id) || { count: 0, name: entry.product_name };
    existing.count += 1;
    countMap.set(entry.product_id, existing);
  }

  return Array.from(countMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, { count, name }]) => ({ id, name, count }));
});
