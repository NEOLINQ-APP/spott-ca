import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { SparqChat } from "./SparqChat";
import { cn } from "@/lib/utils";

export function SparqFloatingBubble() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Hide on the dedicated chat page and auth page
  if (pathname.startsWith("/sparq/chat") || pathname.startsWith("/auth")) return null;

  return (
    <>
      {open && <SparqChat variant="floating" onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open Sparq assistant"
        className={cn(
          "fixed z-40 bottom-20 md:bottom-6 right-4 md:right-6",
          "h-14 w-14 rounded-full shadow-2xl",
          "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
          "grid place-items-center hover:scale-105 transition-transform",
          open && "rotate-12",
        )}
      >
        <Sparkles className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
      </button>
    </>
  );
}
