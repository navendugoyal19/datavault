import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import {
  SPRING_CONFIGS,
  CLAMP,
  fadeWindow,
  springIn,
} from "../lib/animation";
import { Background } from "../components/Background";
import { SvgFilters } from "../components/SvgFilters";
import { SoundLayer } from "../components/SoundLayer";
import { SizeComparison } from "../components/SizeComparison";
import { SFX, SFX_VOLUME } from "../lib/sfx";
import type { SizeItem } from "../lib/types";
import type { SfxCue } from "../lib/sfx";

/* ------------------------------------------------------------------ */
/*  Sample data: Tallest Buildings — sorted ascending for drama        */
/* ------------------------------------------------------------------ */

const buildingItems: SizeItem[] = [
  { name: "Leaning Tower of Pisa", size: 56, unit: "m", color: "#8B8FA3" },
  { name: "St. Basil's Cathedral", size: 65, unit: "m", color: "#FF3D5A" },
  { name: "Taj Mahal", size: 73, unit: "m", color: "#FFB800" },
  { name: "Statue of Liberty", size: 93, unit: "m", color: "#4ECDC4" },
  { name: "Big Ben", size: 96, unit: "m", color: "#A855F7" },
  { name: "Eiffel Tower", size: 330, unit: "m", color: "#3A86FF" },
  { name: "Empire State Building", size: 443, unit: "m", color: "#FF6B35" },
  { name: "Makkah Royal Clock Tower", size: 601, unit: "m", color: "#00FF6A" },
  { name: "Shanghai Tower", size: 632, unit: "m", color: "#F72585" },
  { name: "Burj Khalifa", size: 828, unit: "m", color: "#00E5FF" },
];

/* ------------------------------------------------------------------ */
/*  Timing                                                             */
/* ------------------------------------------------------------------ */

const FPS = 30;
const TITLE_CARD_DURATION = 4 * FPS; // 120 frames = 4 seconds
const FRAMES_PER_ITEM = 4 * FPS; // 120 frames = 4 seconds per item
const COMPARISON_DURATION = buildingItems.length * FRAMES_PER_ITEM;

/* ------------------------------------------------------------------ */
/*  SFX cues — pop per item, impact for Burj Khalifa                   */
/* ------------------------------------------------------------------ */

function buildSfxCues(): SfxCue[] {
  const cues: SfxCue[] = [];

  // Title card sweep
  cues.push({ frame: 0, sfx: SFX.sweep, volume: SFX_VOLUME.transition, duration: 60 });
  cues.push({ frame: 12, sfx: SFX.impact, volume: SFX_VOLUME.accent, duration: 30 });

  // Transition from title to comparison
  cues.push({
    frame: TITLE_CARD_DURATION - 10,
    sfx: SFX.whoosh,
    volume: SFX_VOLUME.transition,
    duration: 25,
  });

  // Per-item SFX
  buildingItems.forEach((item, idx) => {
    const entranceFrame = TITLE_CARD_DURATION + idx * FRAMES_PER_ITEM + 5;
    const isBurj = item.name === "Burj Khalifa";
    const isMakkah = item.name === "Makkah Royal Clock Tower";
    const isShanghai = item.name === "Shanghai Tower";
    const isEiffel = item.name === "Eiffel Tower";

    cues.push({
      frame: entranceFrame,
      sfx: isBurj ? SFX.impact : SFX.pop,
      volume: isBurj
        ? SFX_VOLUME.transition
        : isMakkah || isShanghai || isEiffel
          ? SFX_VOLUME.accent
          : SFX_VOLUME.subtle,
      duration: isBurj ? 50 : 22,
    });
  });

  // Chime when Eiffel Tower appears (first big jump)
  const eiffelIdx = buildingItems.findIndex((b) => b.name === "Eiffel Tower");
  if (eiffelIdx >= 0) {
    cues.push({
      frame: TITLE_CARD_DURATION + eiffelIdx * FRAMES_PER_ITEM + 30,
      sfx: SFX.chime,
      volume: SFX_VOLUME.accent,
      duration: 25,
    });
  }

  // Final reveal for Burj Khalifa
  const burjIdx = buildingItems.findIndex((b) => b.name === "Burj Khalifa");
  if (burjIdx >= 0) {
    cues.push({
      frame: TITLE_CARD_DURATION + burjIdx * FRAMES_PER_ITEM + 40,
      sfx: SFX.reveal,
      volume: SFX_VOLUME.transition,
      duration: 45,
    });
  }

  return cues;
}

/* ------------------------------------------------------------------ */
/*  Building icon — simple geometric skyline silhouette                */
/* ------------------------------------------------------------------ */

const BuildingIcon: React.FC<{ size: number; progress: number }> = ({
  size,
  progress,
}) => {
  const w = size;
  const h = size;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      {/* Tallest tower (center) */}
      <rect
        x={w * 0.42}
        y={h * (1 - 0.8 * progress)}
        width={w * 0.16}
        height={h * 0.8 * progress}
        fill={withAlpha(colors.accent.cyan, 0.6)}
        rx={2}
      />
      {/* Spire */}
      <line
        x1={w * 0.5}
        y1={h * (1 - 0.8 * progress)}
        x2={w * 0.5}
        y2={h * (1 - 0.95 * progress)}
        stroke={colors.accent.cyan}
        strokeWidth={2}
        opacity={progress * 0.8}
      />
      {/* Left building */}
      <rect
        x={w * 0.15}
        y={h * (1 - 0.5 * progress)}
        width={w * 0.2}
        height={h * 0.5 * progress}
        fill={withAlpha(colors.accent.amber, 0.35)}
        rx={2}
      />
      {/* Right building */}
      <rect
        x={w * 0.65}
        y={h * (1 - 0.6 * progress)}
        width={w * 0.18}
        height={h * 0.6 * progress}
        fill={withAlpha(colors.accent.purple, 0.35)}
        rx={2}
      />
      {/* Ground line */}
      <line
        x1={0}
        y1={h}
        x2={w}
        y2={h}
        stroke={colors.accent.cyan}
        strokeWidth={1}
        opacity={progress * 0.4}
      />
      {/* Outer glow */}
      <circle
        cx={w * 0.5}
        cy={h * 0.5}
        r={w * 0.55}
        fill="none"
        stroke={colors.accent.cyan}
        strokeWidth={1}
        opacity={progress * 0.15}
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Title Card: "SIZE COMPARISON"                                      */
/* ------------------------------------------------------------------ */

const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: SPRING_CONFIGS.bouncy });
  const subtitleOpacity = spring({ frame: Math.max(0, frame - 12), fps, config: SPRING_CONFIGS.gentle });
  const metricOpacity = spring({ frame: Math.max(0, frame - 20), fps, config: SPRING_CONFIGS.gentle });
  const iconProgress = spring({ frame: Math.max(0, frame - 5), fps, config: SPRING_CONFIGS.heavy });

  const fadeOut = interpolate(frame, [TITLE_CARD_DURATION - 30, TITLE_CARD_DURATION], [1, 0], CLAMP);

  const glowPulse = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.15, 0.35]);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
      }}
    >
      {/* Skyline icon */}
      <div style={{ marginBottom: 30 }}>
        <BuildingIcon size={100} progress={iconProgress} />
      </div>

      {/* Main title */}
      <div
        style={{
          fontFamily: fontFamily.display,
          fontSize: 92,
          fontWeight: 400,
          color: colors.text.primary,
          textAlign: "center",
          lineHeight: 1.1,
          maxWidth: width * 0.8,
          transform: `scale(${titleScale})`,
          letterSpacing: "0.02em",
          textShadow: `0 0 40px ${withAlpha(colors.accent.cyan, glowPulse)}, 0 0 80px ${withAlpha(colors.accent.cyan, glowPulse * 0.4)}`,
        }}
      >
        SIZE COMPARISON
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: 180 * titleScale,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.accent.cyan}, ${colors.accent.amber}, transparent)`,
          marginTop: 22,
          opacity: subtitleOpacity * 0.6,
        }}
      />

      {/* Subtitle */}
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: 36,
          color: colors.accent.amber,
          marginTop: 18,
          fontWeight: 500,
          opacity: subtitleOpacity,
          letterSpacing: "0.06em",
        }}
      >
        Tallest Buildings in the World
      </div>

      {/* Metric note */}
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: 20,
          color: colors.text.dim,
          marginTop: 14,
          opacity: metricOpacity,
        }}
      >
        Height in meters
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Item progress counter — shows which building we're on              */
/* ------------------------------------------------------------------ */

const ItemCounter: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const localFrame = frame;
  const activeIndex = Math.min(
    Math.floor(localFrame / FRAMES_PER_ITEM),
    buildingItems.length - 1,
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 50,
        left: 0,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {buildingItems.map((item, idx) => {
        const isActive = idx <= activeIndex;
        const isCurrent = idx === activeIndex;
        const dotColor = item.color ?? colors.text.dim;

        return (
          <div
            key={idx}
            style={{
              width: isCurrent ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isActive ? dotColor : withAlpha(colors.text.dim, 0.2),
              opacity: isActive ? 0.9 : 0.3,
              boxShadow: isCurrent ? `0 0 8px ${withAlpha(dotColor, 0.5)}` : "none",
            }}
          />
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main composition                                                   */
/* ------------------------------------------------------------------ */

export const SizeComparisonVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const globalOpacity = fadeWindow(frame, 0, durationInFrames, 15, 25);
  const sfxCues = useMemo(() => buildSfxCues(), []);

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Background — gradient variant with orbiting radials */}
      <Background variant="gradient" />

      {/* SVG filters */}
      <SvgFilters />

      {/* Sound layer */}
      <SoundLayer ambientSrc={SFX.ambient} sfxCues={sfxCues} />

      {/* Title card (first 4 seconds) */}
      <Sequence from={0} durationInFrames={TITLE_CARD_DURATION} layout="none">
        <TitleCard />
      </Sequence>

      {/* Size comparison visualization (starts after title) */}
      <Sequence
        from={TITLE_CARD_DURATION}
        durationInFrames={COMPARISON_DURATION}
        layout="none"
      >
        <AbsoluteFill>
          <SizeComparison items={buildingItems} />
        </AbsoluteFill>

        {/* Item progress dots */}
        <ItemCounter />
      </Sequence>

      {/* Watermark — bottom-right, Orbitron */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          right: 28,
          fontFamily: fontFamily.mono,
          fontSize: 14,
          fontWeight: 600,
          color: colors.text.dim,
          opacity: 0.3,
          letterSpacing: "0.14em",
        }}
      >
        DATAVAULT
      </div>

      {/* Source citation — bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 28,
          fontFamily: fontFamily.body,
          fontSize: 13,
          fontWeight: 400,
          color: colors.text.dim,
          opacity: 0.25,
        }}
      >
        Source: Council on Tall Buildings
      </div>
    </AbsoluteFill>
  );
};
