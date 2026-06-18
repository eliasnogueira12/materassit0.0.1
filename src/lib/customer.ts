import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Customer = {
  id: string;
  customer_number: number;
};

const STORAGE_KEY = "mater.customer";

export function getStoredCustomer(): Customer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string" && typeof parsed.customer_number === "number") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredCustomer(c: Customer | null) {
  if (typeof window === "undefined") return;
  if (!c) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

/** Full kiosk session wipe: customer + any temporary kiosk caches. */
export function clearKioskSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    // Wipe any other transient kiosk-* keys (recommendations, drafts, search history, etc.)
    Object.keys(localStorage)
      .filter((k) => k.startsWith("mater.") || k.startsWith("kiosk."))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}


export function useCustomer() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setCustomer(getStoredCustomer());
    setHydrated(true);
  }, []);
  return {
    customer,
    hydrated,
    setCustomer: (c: Customer | null) => {
      setStoredCustomer(c);
      setCustomer(c);
    },
  };
}

export async function createCustomer(): Promise<Customer> {
  const { data, error } = await supabase.rpc("create_customer");
  if (error) throw error;
  const row = (data as any)?.[0];
  if (!row?.id || typeof row.customer_number !== "number") {
    throw new Error("Resposta inválida do servidor.");
  }
  const c = { id: row.id as string, customer_number: row.customer_number as number };
  setStoredCustomer(c);
  return c;
}

export async function findCustomer(number: number): Promise<Customer | null> {
  const { data, error } = await supabase.rpc("find_customer", { p_number: number });
  if (error) throw error;
  const row = (data as any)?.[0];
  if (!row?.id) return null;
  const c = { id: row.id as string, customer_number: row.customer_number as number };
  setStoredCustomer(c);
  return c;
}

export type CustomerEvent =
  | "search"
  | "recommendation"
  | "assistance"
  | "visit"
  | "product_view"
  | "favorite";

export async function logHistory(
  customer_id: string,
  event_type: CustomerEvent,
  payload: Record<string, unknown> = {},
) {
  try {
    await supabase.from("customer_history").insert({ customer_id, event_type, payload: payload as any });
  } catch {
    /* silent */
  }
}
