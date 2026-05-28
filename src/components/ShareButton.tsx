import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  title: string;
  text?: string;
  variant?: "pill" | "icon" | "floating";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
};

export function ShareButton({ url, title, text, variant = "pill", className, onClick }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
    const fullUrl = url.startsWith("http") ? url : `https://www.spott.ca${url}`;
    const payload = { title, text: text ?? title, url: fullUrl };
    // Prefer native share on mobile / supported browsers.
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share(payload);
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 text-foreground backdrop-blur transition hover:bg-accent/20",
          className,
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      </button>
    );
  }

  if (variant === "floating") {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share"
        className={cn(
          "absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-zinc-900 shadow-sm transition hover:bg-white",
          className,
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent/10",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
