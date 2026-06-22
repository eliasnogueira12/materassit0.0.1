import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type AccCtx = {
  fontSize: number;
  setFontSize: (s: number) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
};

const Ctx = createContext<AccCtx>({
  fontSize: 100,
  setFontSize: () => {},
  highContrast: false,
  setHighContrast: () => {},
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  return (
    <Ctx.Provider value={{ fontSize, setFontSize, highContrast, setHighContrast }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAccessibility = () => useContext(Ctx);
