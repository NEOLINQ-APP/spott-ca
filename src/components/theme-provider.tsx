import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: "dark",
  setTheme: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem("bario.theme") as Theme | null)) || null;
    const prefersLight = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches;
    const initial: Theme = stored ?? (prefersLight ? "light" : "dark");
    apply(initial);
    setThemeState(initial);
  }, []);

  const apply = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(t);
    root.style.colorScheme = t;
  };

  const setTheme = (t: Theme) => {
    apply(t);
    setThemeState(t);
    try { localStorage.setItem("bario.theme", t); } catch {}
  };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
