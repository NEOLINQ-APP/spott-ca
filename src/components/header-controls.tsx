import { Moon, Sun, Globe } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent/10 transition"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

const LANGS = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const current = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 transition"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase">{current.code}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-36 overflow-hidden rounded-md border border-border bg-popover shadow-lg z-50">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { i18n.changeLanguage(l.code); setOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-xs transition ${i18n.language === l.code ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
