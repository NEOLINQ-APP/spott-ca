import spottIcon from "@/assets/spott-icon.png";

/**
 * Spott.ca branded watermark overlay.
 *
 * Renders an absolutely-positioned circular glass badge with the Spott icon
 * in the bottom-left corner of its nearest positioned ancestor. Designed to
 * sit on top of any <img>/<video>/photo container across the platform.
 *
 * Usage:
 *   <div className="relative">
 *     <img src={...} />
 *     <MediaWatermark />
 *   </div>
 *
 * Or use <WatermarkedMedia> below to wrap an image/video in one step.
 */
export function MediaWatermark({
  size = "md",
  className = "",
}: {
  /** Visual size — scales responsively. `md` is the platform default. */
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses =
    size === "sm"
      ? "h-6 w-6 sm:h-7 sm:w-7"
      : size === "lg"
        ? "h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14"
        : "h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10";

  const padClass =
    size === "sm"
      ? "bottom-1.5 left-1.5"
      : size === "lg"
        ? "bottom-3 left-3 sm:bottom-4 sm:left-4"
        : "bottom-2 left-2 sm:bottom-3 sm:left-3";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${padClass} z-10 ${sizeClasses} ${className}`}
      style={{
        opacity: 0.82,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45)) drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center rounded-full backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.15)",
        }}
      >
        <img
          src={spottIcon}
          alt=""
          draggable={false}
          className="h-[68%] w-[68%] object-contain select-none"
          style={{ imageRendering: "auto" }}
        />
      </div>
    </div>
  );
}

/**
 * Convenience wrapper: renders an image or video with the Spott watermark
 * overlaid in the bottom-left corner. Forwards extra props to the media element.
 */
export function WatermarkedMedia({
  src,
  alt = "",
  kind = "image",
  watermarkSize = "md",
  className = "",
  mediaClassName = "",
  poster,
  controls,
  autoPlay,
  loop,
  muted,
  playsInline,
  loading = "lazy",
  onClick,
  children,
}: {
  src?: string;
  alt?: string;
  kind?: "image" | "video";
  watermarkSize?: "sm" | "md" | "lg";
  className?: string;
  mediaClassName?: string;
  poster?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  loading?: "lazy" | "eager";
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {kind === "video" ? (
        <video
          src={src}
          poster={poster}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          className={mediaClassName}
        />
      ) : src ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          draggable={false}
          className={mediaClassName}
        />
      ) : (
        children
      )}
      <MediaWatermark size={watermarkSize} />
    </div>
  );
}
