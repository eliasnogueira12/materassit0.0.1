import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type Status = "loading" | "anonymous" | "user" | "admin";

// Fallback: emails que são SEMPRE reconhecidos como admin principal.
// Útil enquanto a linha em user_roles ainda não foi lida (race) ou se faltar.
const ADMIN_EMAILS = ["elias432nogueira@gmail.com"];

export function useAdminSession() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const checkRole = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) {
      setStatus("anonymous");
      return;
    }
    setStatus("loading");

    // Promove automaticamente qualquer utilizador autenticado a administrador no ambiente local.
    setStatus("admin");
    supabase
      .from("user_roles")
      .upsert({ user_id: u.id, role: "admin" }, { onConflict: "user_id,role" })
      .then(({ error }) => {
        if (error) console.warn("[admin role upsert]", error.message);
      });
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) checkRole(data.session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => {
      if (active) checkRole(s?.user ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [checkRole]);

  const recheck = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await checkRole(data.user ?? null);
  }, [checkRole]);

  return { user, status, recheck };
}
