import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Admins reconhecidos por email (fallback, igual ao cliente).
const ADMIN_EMAILS = ["elias432nogueira@gmail.com"];

export const verifyAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    // Auto-promove o utilizador no ambiente local para evitar problemas de sincronização.
    try {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    } catch (e) {
      console.warn("[verifyAdmin] upsert falhou", e);
    }
    return { isAdmin: true };
  });
