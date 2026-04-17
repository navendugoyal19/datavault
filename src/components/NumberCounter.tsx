import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { fontFamily } from "../lib/fonts";
import { colors, withAlpha } from "../lib/colors";
import { CLAMP } from "../lib/animation";

interface NumberCounterProps {
  /** Target value to count up to */
  value: number;
  /** Duration in frames for the count-up animation (default: 45) */
  duration?: number;
  /** Prefix string (e.g. "$") — rendered in Orbitron at 40% size */
  prefix?: string;
  /** Suffix string (e.g. "km") — rendered in Poppins at 50% size */
  suffix?: string;
  /** Font size for the main number */
  fontSize?: number;
  /** Override number color */
  color?: string;
  /** Whether to pulse cyan glow when count-up completes (default: true) */
  glowOnComplete?: boolean;
  /** Accent color for the completion bloom */
  glowColor?: string;
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) {
    return n.toLocaleString("en-US");
  }
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export const NumberCounter: React.FC<NumberCounterProps> = ({
  value,
  duration = 45,
  prefix = "",
  suffix = "",
  fontSize = 64,
  color = colors.text.primary,
  glowOnComplete = true,
  glowColor = colors.accent.cyan,
}) => {
  const frame = useCurrentFrame();

  // 0 -> 1 linear progress clamped
  const progress = interpolate(frame, [0, duration], [0, 1], CLAMP);

  // Ease-out cubic for satisfying deceleration
  const eased = 1 - Math.pow(1 - progress, 3);
  const current = Math.round(eased * value);

  // Glow pulse: peaks right when count finishes, fades over 15 frames
  const glowOpacity = glowOnComplete
    ? interpolate(frame, [duration, duration + 15], [0.6, 0], CLAMP)
    : 0;

  const bloomColor = withAlpha(glowColor, glowOpacity);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        fontFamily: fontFamily.numbers,
        fontSize,
        fontWeight: 700,
        color,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
        textShadow:
          glowOpacity > 0
            ? `0 0 24px ${bloomColor}, 0 0 48px ${bloomColor}`
            : "none",
        transition: "text-shadow 0.05s ease-out",
      }}
    >
      {/* Prefix — Orbitron at 40% size */}
      {prefix && (
        <span
          style={{
            fontFamily: fontFamily.mono,
            fontSize: fontSize * 0.4,
            fontWeight: 600,
            marginRight: 4,
            color: colors.text.secondary,
          }}
        >
          {prefix}
        </span>
      )}

      {formatNumber(current)}

      {/* Suffix — Poppins at 50% size, dimmer */}
      {suffix && (
        <span
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize * 0.5,
            fontWeight: 500,
            marginLeft: 6,
            color: colors.text.dim,
          }}
        >
          {suffix}
        </span>
      )}
    </span>
  );
};
