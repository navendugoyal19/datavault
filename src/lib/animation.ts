import { interpolate, spring } from "remotion";

/** Named spring presets for consistent motion across the project */
export const SPRING_CONFIGS = {
  snappy: { damping: 14, stiffness: 110, mass: 0.8 },
  gentle: { damping: 20, stiffness: 80, mass: 1.0 },
  bouncy: { damping: 10, stiffness: 120, mass: 0.6 },
  heavy: { damping: 18, stiffness: 90, mass: 1.2 },
} as const;

/** Clamped extrapolation config — use as spread in interpolate options */
export const CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/**
 * Returns an opacity value that fades in at `start`, holds, then fades out before `end`.
 * Useful for timed overlays, labels, and scene elements.
 */
export function fadeWindow(
  frame: number,
  start: number,
  end: number,
  fadeIn = 20,
  fadeOut = 20,
): number {
  return interpolate(
    frame,
    [start, start + fadeIn, end - fadeOut, end],
    [0, 1, 1, 0],
    CLAMP,
  );
}

/**
 * Calculates a staggered delay for items in a list.
 * @param index — position in the list (0-based)
 * @param baseDelay — frames between each item entrance
 */
export function staggerDelay(index: number, baseDelay = 8): number {
  return index * baseDelay;
}

/**
 * Returns a spring value (0 → 1) with an optional frame delay.
 * Convenient wrapper around Remotion's `spring()`.
 */
export function springIn(
  frame: number,
  fps: number,
  delay = 0,
  config: { damping: number; stiffness: number; mass: number } = SPRING_CONFIGS.snappy,
): number {
  return spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {
      damping: config.damping,
      stiffness: config.stiffness,
      mass: config.mass,
    },
  });
}
