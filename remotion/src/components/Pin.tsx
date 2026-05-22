import React from "react";
import { COLORS } from "../brand";

// Spott.ca map pin logo (recreated)
export const Pin: React.FC<{ size?: number; color?: string }> = ({
  size = 200,
  color = COLORS.indigo,
}) => (
  <svg width={size} height={size * 1.3} viewBox="0 0 100 130" fill="none">
    <path
      d="M50 5 C25 5 8 22 8 47 C8 78 50 125 50 125 C50 125 92 78 92 47 C92 22 75 5 50 5 Z"
      fill={color}
    />
    <circle cx="50" cy="47" r="16" fill="white" />
  </svg>
);
