import { useTheme } from "@/components/theme-provider";
import spottLogoDark from "@/assets/spott-logo.png"; // white text — for dark backgrounds
import spottLogoLight from "@/assets/spott-logo-light.png"; // black text — for light backgrounds

type Props = {
  className?: string;
  width?: number;
  height?: number;
  /** Force a variant regardless of theme. */
  variant?: "auto" | "light" | "dark";
};

export function SpottLogo({ className, width = 260, height = 76, variant = "auto" }: Props) {
  const { theme } = useTheme();
  const useLight = variant === "light" ? true : variant === "dark" ? false : theme === "light";
  const src = useLight ? spottLogoLight : spottLogoDark;
  return <img src={src} alt="Spott" width={width} height={height} className={className} />;
}
