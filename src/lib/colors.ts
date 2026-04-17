export const colors = {
  bg: {
    primary: '#06081A',
    secondary: '#0C1029',
    card: '#111538',
  },
  accent: {
    cyan: '#00E5FF',
    amber: '#FFB800',
    green: '#00FF6A',
    red: '#FF3D5A',
    purple: '#A855F7',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#8B8FA3',
    dim: '#4A4E6A',
  },
  /** 12 distinct colors for chart bars, ordered for maximum visual separation */
  bars: [
    '#00E5FF', // cyan
    '#FFB800', // amber
    '#00FF6A', // green
    '#FF3D5A', // red
    '#A855F7', // purple
    '#FF6B35', // orange
    '#4ECDC4', // teal
    '#F72585', // magenta
    '#7209B7', // deep purple
    '#3A86FF', // blue
    '#FB5607', // burnt orange
    '#8338EC', // violet
  ],
} as const;

/** Get a bar color by index, wrapping around if index exceeds palette size */
export function getBarColor(index: number): string {
  return colors.bars[index % colors.bars.length];
}

/** Convert a hex color to rgba with the given alpha (0–1) */
export function withAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Pre-built glow colors at 30% opacity for filter tints and shadows */
export const glow = {
  cyan: "rgba(0,229,255,0.3)",
  amber: "rgba(255,184,0,0.3)",
  green: "rgba(0,255,106,0.3)",
  red: "rgba(255,61,90,0.3)",
  purple: "rgba(168,85,247,0.3)",
} as const;

/** Reusable CSS gradient strings for backgrounds and overlays */
export const gradients = {
  /** Deep navy to dark blue — default scene background */
  deepSpace: "linear-gradient(180deg, #06081A 0%, #0C1029 50%, #111538 100%)",
  /** Cyan accent glow from top-left */
  cyanSpot: "radial-gradient(ellipse at 25% 15%, rgba(0,229,255,0.28) 0%, transparent 55%)",
  /** Amber accent glow from bottom-right */
  amberSpot: "radial-gradient(ellipse at 75% 85%, rgba(255,184,0,0.22) 0%, transparent 55%)",
  /** Purple haze from center */
  purpleHaze: "radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.18) 0%, transparent 65%)",
  /** Vignette overlay — darken edges */
  vignette: "radial-gradient(ellipse at center, transparent 50%, rgba(6,8,26,0.7) 100%)",
} as const;
