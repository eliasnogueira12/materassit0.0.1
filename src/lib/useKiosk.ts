import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

export function useFullscreen() {
  const enabled = useRef(false);

  function enter() {
    if (enabled.current) return;
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    enabled.current = true;
  }

  return { enter };
}

export function useWakeLock() {
  const lock = useRef<any>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("wakeLock" in navigator)) return;
    (navigator as any).wakeLock
      .request("screen")
      .then((l: any) => {
        lock.current = l;
      })
      .catch(() => {});
    return () => {
      lock.current?.release?.();
    };
  }, []);
}

export function useIdleReset(active: boolean) {
  const navigate = useNavigate();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function resetTimer() {
    if (!active) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate({ to: "/" });
    }, IDLE_TIMEOUT_MS);
  }

  useEffect(() => {
    if (!active) return;
    const events = ["mousedown", "touchstart", "keydown", "scroll", "wheel"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [active]);
}

export function useHideCursor(active: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  function showCursor() {
    const s = styleRef.current;
    if (s) s.textContent = "";
  }

  function scheduleHide() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const s = styleRef.current;
      if (s) s.textContent = "* { cursor: none !important; }";
    }, 3000);
  }

  useEffect(() => {
    if (!active) return;
    const style = document.createElement("style");
    style.id = "kiosk-cursor-hide";
    document.head.appendChild(style);
    styleRef.current = style;

    const events = ["mousemove", "touchstart", "keydown"];
    events.forEach((e) => window.addEventListener(e, showCursor));
    events.forEach((e) => window.addEventListener(e, scheduleHide));
    scheduleHide();

    return () => {
      clearTimeout(timer.current);
      style.remove();
      events.forEach((e) => window.removeEventListener(e, showCursor));
      events.forEach((e) => window.removeEventListener(e, scheduleHide));
    };
  }, [active]);
}

export function usePreventBack() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.pushState(null, "", window.location.href);
    function handlePop() {
      window.history.pushState(null, "", window.location.href);
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);
}
