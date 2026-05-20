import { useEffect, useState } from "react";
import toronto from "@/assets/hero-toronto.jpg";
import vancouver from "@/assets/hero-vancouver.jpg";
import montreal from "@/assets/hero-montreal.jpg";

const SLIDES = [
  { src: toronto, label: "Toronto" },
  { src: vancouver, label: "Vancouver" },
  { src: montreal, label: "Montréal" },
];

/**
 * Full-bleed rotating hero background. Slides crossfade every 6s.
 * Designed to sit behind hero content with a dark gradient overlay
 * so foreground text stays legible.
 */
export function RotatingHero() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {SLIDES.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={`${s.label} skyline at night`}
          width={1920}
          height={1080}
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {/* Readability overlay — gradient from top dark → mid dim → bottom dark */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/55 to-background" />
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* City attribution dot indicators */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setIdx(i)}
            aria-label={`Show ${s.label}`}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-8 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
