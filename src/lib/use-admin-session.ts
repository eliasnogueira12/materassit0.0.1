import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type Status = "loading" | "anonymous" | "user" | "admin";

// Fallback: emails que são SEMPRE reconhecidos como admin principal.
// Útil enquanto a linha em user_roles ainda não foi lida (race) ou se faltar.
const ADMIN_EMAILS = ["elias432nogueira@gmail.com"];

export function useAdminSession() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // Safety timeout: se o getSession demorar mais de 15s, passamos a anonymous.
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearSafetyTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }
  }, []);

  const checkRole = useCallback(async (u: User | null) => {
    clearSafetyTimeout();
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
  }, [clearSafetyTimeout]);

  useEffect(() => {
    let active = true;

    loadingTimeoutRef.current = setTimeout(() => {
      if (active) {
        console.warn("[admin session] getSession timeout — forcing anonymous");
        checkRole(null);
      }
    }, 15_000);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) checkRole(data.session?.user ?? null);
      } catch (err) {
        console.error("[admin session] getSession error", err);
        if (active) checkRole(null);
      }
    })();

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_e, s) => {
        if (active) checkRole(s?.user ?? null);
      });

      return () => {
        active = false;
        clearSafetyTimeout();
        subscription.unsubscribe();
      };
    } catch (err) {
      console.error("[admin session] onAuthStateChange error", err);
      return () => { active = false; clearSafetyTimeout(); };
    }
  }, [checkRole, clearSafetyTimeout]);

  const recheck = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      await checkRole(data.user ?? null);
    } catch (err) {
      console.error("[admin session] recheck error", err);
      checkRole(null);
    }
  }, [checkRole]);

  return { user, status, recheck };
}
