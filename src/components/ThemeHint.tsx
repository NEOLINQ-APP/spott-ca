import { useEffect } from "react";
import { toast } from "sonner";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const KEY = "spott_theme_hint_v1";

export function ThemeHint() {
  const { theme, toggle } = useTheme();

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch { return; }

    const t = setTimeout(() => {
      toast(
        theme === "dark" ? "Prefer light mode?" : "Prefer dark mode?",
        {
          description: "Tap to switch — you can toggle anytime from the header.",
          icon: theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
          duration: 8000,
          action: {
            label: theme === "dark" ? "Switch to light" : "Switch to dark",
            onClick: () => toggle(),
          },
          onDismiss: () => { try { localStorage.setItem(KEY, "1"); } catch {} },
          onAutoClose: () => { try { localStorage.setItem(KEY, "1"); } catch {} },
        }
      );
      try { localStorage.setItem(KEY, "1"); } catch {}
    }, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
