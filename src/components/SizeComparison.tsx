import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, getBarColor, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import { SPRING_CONFIGS, CLAMP, staggerDelay } from "../lib/animation";
import { SvgFilters } from "./SvgFilters";
import type { SizeItem } from "../lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ItemTiming {
  startFrame: number;
  endFrame: number;
}

interface SizeComparisonProps {
  items: SizeItem[];
  /** Optional per-item timing from narration. If provided, items appear at these frames instead of evenly distributed. */
  itemTimings?: ItemTiming[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatSize(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Deterministic pseudo-random hash for particle positions */
const hash = (n: number): number =>
  ((Math.sin(n * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;

/* ------------------------------------------------------------------ */
/*  Glow rings component — concentric rings that pulse on entrance     */
/* ------------------------------------------------------------------ */

const GlowRings: React.FC<{
  cx: number;
  cy: number;
  baseRadius: number;
  color: string;
  localFrame: number;
  fps: number;
}> = ({ cx, cy, baseRadius, color, localFrame, fps }) => {
  const rings = [0, 8, 16]; // staggered frame delays

  return (
    <>
      {rings.map((delay, i) => {
        const ringProgress = spring({
          frame: Math.max(0, localFrame - delay),
          fps,
          config: SPRING_CONFIGS.bouncy,
        });
        const ringRadius = baseRadius + (i + 1) * 25 * ringProgress;
        const ringOpacity = interpolate(
          ringProgress,
          [0, 0.5, 1],
          [0, 0.35 - i * 0.08, 0.12 - i * 0.03],
          CLAMP,
        );

        // Fade out over time after initial entrance
        const fadeOut = interpolate(
          localFrame,
          [delay + 30, delay + 80],
          [1, 0],
          CLAMP,
        );

        return (
          <circle
            key={`ring-${i}`}
            cx={cx}
            cy={cy}
            r={ringRadius}
            fill="none"
            stroke={color}
            strokeWidth={2 - i * 0.4}
            opacity={ringOpacity * fadeOut}
          />
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Particle burst component — emanates from circle edge               */
/* ------------------------------------------------------------------ */

const ParticleBurst: React.FC<{
  cx: number;
  cy: number;
  radius: number;
  color: string;
  localFrame: number;
  count?: number;
}> = ({ cx, cy, radius, color, localFrame, count = 18 }) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + hash(i * 37) * 0.5;
      const speed = 0.8 + hash(i * 73) * 1.5;
      const size = 2 + hash(i * 127) * 3;
      return { angle, speed, size };
    });
  }, [count]);

  // Particles spring outward over 30 frames, then fade over next 20
  const burstPhase = interpolate(localFrame, [0, 30], [0, 1], CLAMP);
  const fadePhase = interpolate(localFrame, [30, 50], [1, 0], CLAMP);

  if (localFrame < 0 || localFrame > 55) return null;

  return (
    <>
      {particles.map((p, i) => {
        const dist = radius + burstPhase * p.speed * 60;
        const px = cx + Math.cos(p.angle) * dist;
        const py = cy + Math.sin(p.angle) * dist;
        const opacity = fadePhase * (0.5 + hash(i * 200) * 0.5);

        return (
          <circle
            key={`particle-${i}`}
            cx={px}
            cy={py}
            r={p.size * (1 - burstPhase * 0.5)}
            fill={color}
            opacity={opacity}
          />
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  Comparison connector — dotted line with "Nx bigger" label          */
/* ------------------------------------------------------------------ */

const ComparisonConnector: React.FC<{
  prevRadius: number;
  currentRadius: number;
  cx: number;
  cy: number;
  ratio: number;
  localFrame: number;
  fps: number;
  color: string;
}> = ({ prevRadius, currentRadius, cx, cy, ratio, localFrame, fps, color }) => {
  const lineProgress = spring({
    frame: Math.max(0, localFrame - 15),
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  const labelProgress = spring({
    frame: Math.max(0, localFrame - 25),
    fps,
    config: SPRING_CONFIGS.snappy,
  });

  if (ratio < 1.1) return null;

  // Dotted line from previous circle edge to current circle edge
  const lineStartY = cy - prevRadius;
  const lineEndY = cy - currentRadius;
  const lineX = cx + currentRadius + 40;

  const lineFade = interpolate(localFrame, [60, 90], [1, 0.3], CLAMP);

  return (
    <g opacity={lineFade}>
      {/* Dotted vertical line */}
      <line
        x1={lineX}
        y1={lineStartY}
        x2={lineX}
        y2={interpolate(lineProgress, [0, 1], [lineStartY, lineEndY], CLAMP)}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        opacity={0.6}
      />
      {/* "Nx bigger" label */}
      <text
        x={lineX + 12}
        y={(lineStartY + lineEndY) / 2 + 5}
        fill={colors.accent.amber}
        fontSize={16}
        fontFamily={fontFamily.mono}
        fontWeight={700}
        opacity={labelProgress * 0.9}
        letterSpacing="0.05em"
      >
        {ratio.toFixed(1)}x
      </text>
    </g>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const SizeComparison: React.FC<SizeComparisonProps> = ({ items, itemTimings }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // When narration timing is provided, use it. Otherwise fall back to even distribution.
  const getItemStart = (idx: number): number => {
    if (itemTimings && itemTimings[idx]) return itemTimings[idx].startFrame;
    return Math.floor(idx * (durationInFrames / items.length));
  };

  const getItemEnd = (idx: number): number => {
    if (itemTimings && itemTimings[idx]) return itemTimings[idx].endFrame;
    return Math.floor((idx + 1) * (durationInFrames / items.length));
  };

  // Determine which item is active based on timing
  let activeIndex = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (frame >= getItemStart(i)) {
      activeIndex = i;
      break;
    }
  }

  const maxSize = Math.max(...items.map((it) => it.size));

  // Center of canvas (slightly above center for portrait layout)
  const cx = width / 2;
  const cy = height * 0.42;

  // Max radius a circle can be
  const maxRadius = Math.min(width, height) * 0.30;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <SvgFilters />

      {/* SVG layer for circles, glow rings, particles, and connectors */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          {/* Per-item radial gradients */}
          {items.map((item, idx) => {
            const itemColor = item.color ?? getBarColor(idx);
            return (
              <radialGradient
                key={`grad-${idx}`}
                id={`circle-grad-${idx}`}
                cx="0.4"
                cy="0.35"
                r="0.65"
              >
                <stop
                  offset="0%"
                  stopColor={withAlpha(itemColor, 0.95)}
                />
                <stop
                  offset="60%"
                  stopColor={withAlpha(itemColor, 0.55)}
                />
                <stop
                  offset="100%"
                  stopColor={withAlpha(itemColor, 0.25)}
                />
              </radialGradient>
            );
          })}
        </defs>

        {items.map((item, idx) => {
          if (idx > activeIndex) return null;

          const itemColor = item.color ?? getBarColor(idx);
          const localFrame = frame - getItemStart(idx);
          const isActive = idx === activeIndex;

          /* ---- Radius calculation ---- */
          const targetRadius = Math.max(
            (item.size / maxSize) * maxRadius,
            18,
          );

          let displayRadius: number;
          if (isActive) {
            const radiusSpring = spring({
              frame: Math.max(0, Math.round(localFrame)),
              fps,
              config: SPRING_CONFIGS.bouncy,
            });
            displayRadius = targetRadius * radiusSpring;
          } else {
            // Shrink relative to current biggest visible
            const biggestVisible = items[activeIndex].size;
            const relativeRadius = Math.max(
              (item.size / biggestVisible) * maxRadius,
              10,
            );
            const shrinkFrame = frame - getItemStart(activeIndex);
            const prevBiggest = items[Math.max(activeIndex - 1, 0)].size;
            const prevRelativeRadius = (item.size / prevBiggest) * maxRadius;

            displayRadius = interpolate(
              Math.min(shrinkFrame, 25),
              [0, 25],
              [prevRelativeRadius, relativeRadius],
              CLAMP,
            );
          }

          /* ---- Opacity ---- */
          const opacity = isActive
            ? spring({
                frame: Math.max(0, Math.round(localFrame)),
                fps,
                config: { ...SPRING_CONFIGS.snappy, mass: 0.6 },
              })
            : interpolate(
                displayRadius,
                [0, maxRadius * 0.04, maxRadius * 0.12],
                [0.15, 0.35, 0.55],
                CLAMP,
              );

          /* ---- Position: previous items offset left ---- */
          const previousCount = activeIndex - idx;
          const xOffset = isActive
            ? 0
            : -displayRadius - 15 - previousCount * 8;

          /* ---- Comparison ratio ---- */
          const prevItem = idx > 0 ? items[idx - 1] : null;
          const ratio = prevItem ? item.size / prevItem.size : 1;
          const prevRadius = prevItem
            ? Math.max(
                (prevItem.size / items[activeIndex].size) * maxRadius,
                10,
              )
            : 0;

          return (
            <g key={idx} opacity={opacity}>
              {/* Glow rings (only for active item) */}
              {isActive && (
                <GlowRings
                  cx={cx + xOffset}
                  cy={cy}
                  baseRadius={displayRadius}
                  color={itemColor}
                  localFrame={Math.round(localFrame)}
                  fps={fps}
                />
              )}

              {/* Main circle with radial gradient */}
              <circle
                cx={cx + xOffset}
                cy={cy}
                r={Math.max(displayRadius, 0)}
                fill={`url(#circle-grad-${idx})`}
                stroke={itemColor}
                strokeWidth={isActive ? 2.5 : 1.5}
                filter={isActive ? "url(#glow-strong)" : undefined}
              />

              {/* Border glow — subtle outer ring */}
              <circle
                cx={cx + xOffset}
                cy={cy}
                r={Math.max(displayRadius + 3, 0)}
                fill="none"
                stroke={itemColor}
                strokeWidth={1}
                opacity={isActive ? 0.3 : 0.1}
              />

              {/* Particle burst (only for active item on entrance) */}
              {isActive && (
                <ParticleBurst
                  cx={cx}
                  cy={cy}
                  radius={displayRadius}
                  color={itemColor}
                  localFrame={Math.round(localFrame)}
                />
              )}

              {/* Comparison connector */}
              {isActive && prevItem && (
                <ComparisonConnector
                  prevRadius={prevRadius}
                  currentRadius={displayRadius}
                  cx={cx}
                  cy={cy}
                  ratio={ratio}
                  localFrame={Math.round(localFrame)}
                  fps={fps}
                  color={itemColor}
                />
              )}

              {/* Size label inside large circles */}
              {isActive && displayRadius > maxRadius * 0.4 && (
                <text
                  x={cx}
                  y={cy + 6}
                  textAnchor="middle"
                  fill={colors.text.primary}
                  fontSize={22}
                  fontFamily={fontFamily.numbers}
                  fontWeight={700}
                  opacity={interpolate(
                    localFrame,
                    [15, 30],
                    [0, 0.9],
                    CLAMP,
                  )}
                >
                  {formatSize(item.size)} {item.unit}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* ---- Labels (HTML layer for better text rendering) ---- */}
      {items.map((item, idx) => {
        if (idx > activeIndex) return null;

        const isActive = idx === activeIndex;
        if (!isActive) return null;

        const itemColor = item.color ?? getBarColor(idx);
        const localFrame = frame - getItemStart(idx);

        const targetRadius = Math.max(
          (item.size / maxSize) * maxRadius,
          18,
        );
        const radiusSpring = spring({
          frame: Math.max(0, Math.round(localFrame)),
          fps,
          config: SPRING_CONFIGS.bouncy,
        });
        const displayRadius = targetRadius * radiusSpring;
        const showLabelInside = displayRadius > maxRadius * 0.4;

        /* Label entrance — delayed spring */
        const labelDelay = 20;
        const labelSpring = spring({
          frame: Math.max(0, Math.round(localFrame) - labelDelay),
          fps,
          config: SPRING_CONFIGS.snappy,
        });
        const labelY = interpolate(labelSpring, [0, 1], [25, 0], CLAMP);
        const labelOpacity = labelSpring;

        return (
          <div
            key={`label-${idx}`}
            style={{
              position: "absolute",
              left: 0,
              width: width,
              top: cy + displayRadius + 35 + labelY,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              opacity: labelOpacity,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                padding: "18px 26px",
                borderRadius: 24,
                background: `linear-gradient(180deg, ${withAlpha(
                  colors.bg.card,
                  0.82,
                )}, ${withAlpha(colors.bg.secondary, 0.7)})`,
                border: `1px solid ${withAlpha(itemColor, 0.28)}`,
                boxShadow: `0 18px 36px ${withAlpha(colors.bg.primary, 0.42)}`,
                minWidth: 320,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 4,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${withAlpha(
                    itemColor,
                    0.2,
                  )}, ${itemColor}, ${withAlpha(itemColor, 0.2)})`,
                  marginBottom: 12,
                }}
              />

              {/* Item name */}
              <div
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: 52,
                  fontWeight: 400,
                  color: colors.text.primary,
                  textAlign: "center",
                  letterSpacing: "0.04em",
                  textShadow: `0 0 30px ${withAlpha(itemColor, 0.3)}`,
                }}
              >
                {item.name.toUpperCase()}
              </div>

              {/* Size value (only if NOT shown inside circle) */}
              {!showLabelInside && (
                <div
                  style={{
                    fontFamily: fontFamily.numbers,
                    fontSize: 34,
                    fontWeight: 700,
                    color: itemColor,
                    marginTop: 8,
                    textAlign: "center",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatSize(item.size)} {item.unit}
                </div>
              )}

              {/* "Nx bigger" text label below name */}
              {idx > 0 && (
                <div
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 16,
                    fontWeight: 600,
                    color: colors.accent.amber,
                    marginTop: 12,
                    opacity: interpolate(
                      localFrame,
                      [25, 40],
                      [0, 0.85],
                      CLAMP,
                    ),
                    letterSpacing: "0.06em",
                  }}
                >
                  {(item.size / items[idx - 1].size).toFixed(1)}x BIGGER
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
