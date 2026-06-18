import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getOrCreateActiveOrder = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ customerId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id, status, total")
      .eq("customer_id", data.customerId)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("id, product_id, product_name, quantity, price, location")
        .eq("order_id", existing.id)
        .order("created_at");
      return { order: existing, items: items ?? [] };
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({ customer_id: data.customerId, status: "active", total: 0 })
      .select("id, status, total")
      .single();

    if (error) throw error;
    return { order, items: [] };
  });

export const addToOrder = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      orderId: z.string().uuid(),
      productId: z.string().uuid(),
      productName: z.string().min(1),
      price: z.number().positive(),
      location: z.string().nullable().optional(),
      quantity: z.number().int().positive().default(1),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("order_items")
      .select("id, quantity")
      .eq("order_id", data.orderId)
      .eq("product_id", data.productId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("order_items")
        .update({ quantity: existing.quantity + data.quantity })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("order_items")
        .insert({
          order_id: data.orderId,
          product_id: data.productId,
          product_name: data.productName,
          price: data.price,
          location: data.location ?? null,
          quantity: data.quantity,
        });
      if (error) throw error;
    }

    await recalcTotal(data.orderId);
    return { success: true };
  });

export const updateOrderItemQty = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      itemId: z.string().uuid(),
      orderId: z.string().uuid(),
      quantity: z.number().int().positive(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("order_items")
      .update({ quantity: data.quantity })
      .eq("id", data.itemId);
    if (error) throw error;
    await recalcTotal(data.orderId);
    return { success: true };
  });

export const removeFromOrder = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ itemId: z.string().uuid(), orderId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("order_items")
      .delete()
      .eq("id", data.itemId);
    if (error) throw error;
    await recalcTotal(data.orderId);
    return { success: true };
  });

async function recalcTotal(orderId: string) {
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("price, quantity")
    .eq("order_id", orderId);
  const total = (items ?? []).reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  await supabaseAdmin
    .from("orders")
    .update({ total })
    .eq("id", orderId);
}

export const checkoutOrder = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      orderId: z.string().uuid(),
      contactEmail: z.string().email().optional().or(z.literal("")),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("id")
      .eq("order_id", data.orderId);
    if (!items || items.length === 0) {
      throw new Error("Carrinho vazio. Adicione produtos antes de finalizar.");
    }

    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

    const updateFields: Record<string, unknown> = { status: "invoice_issued", token };
    if (data.contactEmail) {
      updateFields.contact_email = data.contactEmail;
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .update(updateFields)
      .eq("id", data.orderId)
      .select("id, total, token, created_at, contact_email")
      .single();
    if (error) throw error;

    return {
      token: order.token,
      total: order.total,
      orderId: order.id,
      createdAt: order.created_at,
      contactEmail: order.contact_email ?? null,
    };
  });

export const getOrderByToken = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().min(1).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, customer_id, status, total, token, created_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw error;
    if (!order) throw new Error("Fatura não encontrada.");

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("id, product_id, product_name, quantity, price, location")
      .eq("order_id", order.id)
      .order("created_at");
    return { order, items: items ?? [] };
  });

// --- Admin functions ---

export const listOrders = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({
      token: z.string().max(20).optional(),
      status: z.enum(["active", "invoice_issued", "paid", "cancelled"]).optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    let query = supabaseAdmin
      .from("orders")
      .select("id, customer_id, status, total, token, created_at", { count: "exact" });

    if (data.token) {
      query = query.ilike("token", `%${data.token}%`);
    }
    if (data.status) {
      query = query.eq("status", data.status);
    }

    query = query.order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    const { data: orders, error, count } = await query;
    if (error) throw error;

    return { orders: orders ?? [], total: count ?? 0 };
  });

export const markOrderPaid = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: "paid" })
      .eq("id", data.orderId)
      .eq("status", "invoice_issued");
    if (error) throw error;
    return { success: true };
  });
