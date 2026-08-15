import { Facebook, Instagram, Linkedin, X } from "lucide-react";
import type { LucideProps } from "lucide-react";

// lucide-react has no TikTok glyph — this mirrors lucide's own icon shape
// conventions (24x24 viewbox, accepts the same className/size props) so it
// drops into the same icon row as the lucide icons without looking out of place.
function TikTokIcon(props: LucideProps) {
  const { className, size = 24, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...rest}
    >
      <path d="M16.6 5.82c-.87-.96-1.36-2.2-1.36-3.5h-3.07v13.3a2.7 2.7 0 1 1-2.7-2.7c.24 0 .48.03.7.09V9.9a5.78 5.78 0 0 0-.7-.04A5.77 5.77 0 1 0 15.24 15.6V9.06a8.9 8.9 0 0 0 5.19 1.66V7.66a5.4 5.4 0 0 1-3.83-1.84Z" />
    </svg>
  );
}

export const SOCIAL_LINKS = [
  { href: "https://instagram.com/spott.ca", Icon: Instagram, label: "Instagram" },
  { href: "https://facebook.com/spott.ca", Icon: Facebook, label: "Facebook" },
  { href: "https://tiktok.com/@spott.ca", Icon: TikTokIcon, label: "TikTok" },
  { href: "https://x.com/spott_ca", Icon: X, label: "X" },
  { href: "https://linkedin.com/company/spott-ca", Icon: Linkedin, label: "LinkedIn" },
];

type Props = {
  className?: string;
  iconClassName?: string;
};

/** Shared social-icon row — Instagram, Facebook, TikTok, X, LinkedIn. */
export function SocialLinks({ className, iconClassName }: Props) {
  return (
    <div className={className ?? "flex items-center gap-3"}>
      {SOCIAL_LINKS.map(({ href, Icon, label }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow Spott.ca on ${label}`}
          className={
            iconClassName ??
            "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          }
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
