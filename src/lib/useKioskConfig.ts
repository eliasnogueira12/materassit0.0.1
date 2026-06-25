import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type KioskPage = "paints" | "assistant" | "search" | "problems";

export interface KioskInstance {
  label: string;
  pages: Record<KioskPage, boolean>;
}

export interface KioskConfig {
  kiosks: KioskInstance[];
}

const DEFAULT_CONFIG: KioskConfig = {
  kiosks: [
    { label: "Quiosque 1", pages: { paints: true, assistant: true, search: true, problems: true } },
  ],
};

const ALL_PAGES: KioskPage[] = ["paints", "assistant", "search", "problems"];

export function useKioskConfig() {
  const [config, setConfig] = useState<KioskConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("settings")
      .select("value")
      .eq("key", "kiosk_config")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const parsed = data.value as unknown as KioskConfig;
          if (parsed?.kiosks && Array.isArray(parsed.kiosks)) {
            setConfig(parsed);
          }
        }
        setLoading(false);
      });
  }, []);

  return { config, loading, ALL_PAGES };
}

export function getKioskLabel(): string {
  if (typeof window === "undefined") return "Quiosque 1";
  const params = new URLSearchParams(window.location.search);
  return params.get("k") || params.get("label") || "Quiosque 1";
}

export function getEnabledPages(
  config: KioskConfig,
  label: string,
): Record<KioskPage, boolean> {
  const instance = config.kiosks.find((k) => k.label === label);
  if (instance) return instance.pages;
  const first = config.kiosks[0];
  return first ? first.pages : DEFAULT_CONFIG.kiosks[0].pages;
}
