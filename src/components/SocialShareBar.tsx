import { useMemo } from "react";
import { Facebook, Linkedin, Instagram, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  url: string; // path or full URL
  title: string;
  text?: string;
  image?: string | null;
  className?: string;
};

// X (Twitter) and WhatsApp brand glyphs (lucide doesn't ship current X / WhatsApp marks).
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21l-6.51 7.44L22 22h-6.79l-4.74-6.2L4.9 22H2.14l6.97-7.96L2 2h6.91l4.29 5.67L18.244 2Zm-2.38 18h1.88L8.21 4H6.21l9.654 16Z" />
    </svg>
  );
}
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .18 5.32.18 11.87a11.8 11.8 0 0 0 1.6 5.94L0 24l6.34-1.66a11.85 11.85 0 0 0 5.7 1.45h.01c6.55 0 11.87-5.32 11.87-11.87 0-3.17-1.24-6.15-3.4-8.44ZM12.05 21.3h-.01a9.8 9.8 0 0 1-4.99-1.37l-.36-.21-3.76.98 1-3.67-.23-.38a9.77 9.77 0 0 1-1.51-5.21c0-5.42 4.41-9.83 9.86-9.83 2.63 0 5.1 1.03 6.96 2.89a9.77 9.77 0 0 1 2.88 6.96c0 5.42-4.42 9.84-9.84 9.84Zm5.4-7.36c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.63.07-.3-.15-1.25-.46-2.39-1.47-.88-.78-1.48-1.75-1.65-2.04-.17-.3-.02-.46.13-.6.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.66-1.6-.9-2.19-.24-.57-.48-.49-.66-.5l-.56-.01c-.2 0-.51.07-.78.37-.27.3-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.03.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.12.56-.08 1.75-.71 2-1.4.25-.69.25-1.27.17-1.4-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

export function SocialShareBar({ url, title, text, className }: Props) {
  const fullUrl = useMemo(() => {
    if (url.startsWith("http")) return url;
    if (typeof window !== "undefined") return `${window.location.origin}${url}`;
    return url;
  }, [url]);

  const message = text ?? `Check out this business on spott.ca: ${title} — ${fullUrl}`;
  const enc = encodeURIComponent;

  const links = [
    {
      key: "facebook",
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(fullUrl)}`,
      Icon: Facebook,
      brand: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    },
    {
      key: "x",
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?text=${enc(`Check out ${title} on spott.ca`)}&url=${enc(fullUrl)}`,
      Icon: XIcon,
      brand: "hover:bg-black hover:text-white hover:border-black",
    },
    {
      key: "linkedin",
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(fullUrl)}`,
      Icon: Linkedin,
      brand: "hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]",
    },
    {
      key: "whatsapp",
      label: "Share on WhatsApp",
      // wa.me works for both mobile app and WhatsApp Web.
      href: `https://wa.me/?text=${enc(message)}`,
      Icon: WhatsAppIcon,
      brand: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    },
  ];

  const handleInstagram = async () => {
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share({ title, text: message, url: fullUrl });
        return;
      }
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied — paste it into Instagram");
    } catch {
      /* user cancelled */
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="mr-1 text-xs font-medium text-muted-foreground">Share:</span>
      {links.map(({ key, label, href, Icon, brand }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={label}
          title={label}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all duration-200 hover:scale-110 hover:shadow-md",
            brand,
          )}
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
      <button
        type="button"
        onClick={handleInstagram}
        aria-label="Share on Instagram"
        title="Share on Instagram"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all duration-200 hover:scale-110 hover:border-transparent hover:text-white hover:shadow-md hover:[background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)]"
      >
        <Instagram className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy link"
        title="Copy link"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-all duration-200 hover:scale-110 hover:bg-accent/20"
      >
        <LinkIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
