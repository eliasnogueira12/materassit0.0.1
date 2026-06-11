import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { clearKioskSession } from "@/lib/customer";

/**
 * Kiosk inactivity system with a 20-second total timeout.
 * - After 15 seconds of absolute inactivity, it sets the warning state to true.
 * - Shows a warning modal counting down the final 5 seconds.
 * - If no interaction occurs, it clears the customer session and redirects to the home screen (/).
 */
export function useKioskIdle(idleSeconds = 25, warningSeconds = 5) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(warningSeconds);

  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active on all pages except the home page (/) and administrative panel (/admin)
  const active = !(pathname === "/" || pathname.startsWith("/admin"));

  function endSession() {
    clearKioskSession();

    if (typeof document !== "undefined") {
      // Dispatch Escape key to close dialogs
      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escEvent);

      // Dispatch click event to close dropdowns and menus
      const clickEvent = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(clickEvent);
    }

    setWarning(false);
    navigate({ to: "/" });
  }

  function dismiss() {
    setWarning(false);
    setSecondsLeft(warningSeconds);
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    resetIdle();
  }

  function resetIdle() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }

    idleTimer.current = setTimeout(() => {
      setSecondsLeft(warningSeconds);
      setWarning(true);

      countdownTimer.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (countdownTimer.current) clearInterval(countdownTimer.current);
            endSession();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }, idleSeconds * 1000);
  }

  useEffect(() => {
    if (!active) {
      setWarning(false);
      return;
    }

    const onActivity = () => {
      // While warning is shown, we require explicit interaction with the warning dialog (e.g. click "Continuar")
      if (warning) return;
      resetIdle();
    };

    // Interaction events to monitor
    const events = [
      "click",
      "touchstart",
      "touchmove",
      "keydown",
      "mousemove",
      "scroll",
      "wheel",
      "mousedown",
      "pointerdown",
      "pointermove",
    ];

    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    resetIdle();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, [active, pathname, warning]);

  return { warning, secondsLeft, dismiss, endSession };
}
