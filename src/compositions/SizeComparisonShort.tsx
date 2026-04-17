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
  staggerDelay,
} from "../lib/animation";
import { Background } from "../components/Background";
import { SvgFilters } from "../components/SvgFilters";
import { SoundLayer } from "../components/SoundLayer";
import { SizeComparison } from "../components/SizeComparison";
import { SFX, SFX_VOLUME } from "../lib/sfx";
import type { SizeItem } from "../lib/types";
import type { SfxCue } from "../lib/sfx";

/* ------------------------------------------------------------------ */
/*  Sample data: Solar System planet diameters (km)                    */
/* ------------------------------------------------------------------ */

const sampleItems: SizeItem[] = [
  { name: "Mercury", size: 4879, unit: "km", color: "#8B8FA3" },
  { name: "Mars", size: 6779, unit: "km", color: "#FF3D5A" },
  { name: "Venus", size: 12104, unit: "km", color: "#FFB800" },
  { name: "Earth", size: 12742, unit: "km", color: "#00E5FF" },
  { name: "Neptune", size: 49528, unit: "km", color: "#3A86FF" },
  { name: "Uranus", size: 50724, unit: "km", color: "#4ECDC4" },
  { name: "Saturn", size: 116460, unit: "km", color: "#FF6B35" },
  { name: "Jupiter", size: 139820, unit: "km", color: "#F72585" },
];

/* ------------------------------------------------------------------ */
/*  SFX cues — pop for each planet, impact for Jupiter                 */
/* ------------------------------------------------------------------ */

function buildSfxCues(
  items: SizeItem[],
  durationInFrames: number,
): SfxCue[] {
  const framesPerItem = durationInFrames / items.length;
  const cues: SfxCue[] = [];

  items.forEach((item, idx) => {
    const entranceFrame = Math.round(idx * framesPerItem) + 5;
    const isJupiter = item.name === "Jupiter";
    const isSaturn = item.name === "Saturn";

    cues.push({
      frame: entranceFrame,
      sfx: isJupiter ? SFX.impact : SFX.pop,
      volume: isJupiter
        ? SFX_VOLUME.transition
        : isSaturn
          ? SFX_VOLUME.accent
          : SFX_VOLUME.subtle,
      duration: isJupiter ? 50 : 22,
    });
  });

  // Add a reveal chime for the final comparison
  cues.push({
    frame: Math.round((items.length - 1) * framesPerItem) + 30,
    sfx: SFX.reveal,
    volume: SFX_VOLUME.accent,
    duration: 40,
  });

  return cues;
}

/* ------------------------------------------------------------------ */
/*  Animated star field — tiny pulsing stars for the space theme        */
/* ------------------------------------------------------------------ */

const hash = (n: number): number =>
  ((Math.sin(n * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;

const StarField: React.FC<{ count?: number }> = ({ count = 60 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const stars = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: hash(i * 13) * width,
      y: hash(i * 37) * height,
      size: 0.8 + hash(i * 73) * 2.5,
      phase: hash(i * 97) * Math.PI * 2,
      speed: 0.02 + hash(i * 151) * 0.04,
    }));
  }, [count, width, height]);

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      {stars.map((star, i) => {
        const pulse = interpolate(
          Math.sin(frame * star.speed + star.phase),
          [-1, 1],
          [0.1, 0.5],
        );
        return (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.size}
            fill="#ffffff"
            opacity={pulse}
          />
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Planet counter — shows current planet index                        */
/* ------------------------------------------------------------------ */

const PlanetCounter: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();

  const framesPerItem = durationInFrames / sampleItems.length;
  const activeIndex = Math.min(
    Math.floor(frame / framesPerItem),
    sampleItems.length - 1,
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {sampleItems.map((item, idx) => {
        const isActive = idx <= activeIndex;
        const isCurrent = idx === activeIndex;
        const dotColor = item.color ?? colors.text.dim;

        return (
          <div
            key={idx}
            style={{
              width: isCurrent ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isActive
                ? dotColor
                : withAlpha(colors.text.dim, 0.2),
              opacity: isActive ? 0.9 : 0.3,
              boxShadow: isCurrent
                ? `0 0 8px ${withAlpha(dotColor, 0.5)}`
                : "none",
              transition: "width 0.15s, opacity 0.15s",
            }}
          />
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Title component — "SOLAR SYSTEM" + subtitle                        */
/* ------------------------------------------------------------------ */

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  const subtitleSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  const lineWidth = interpolate(titleSpring, [0, 1], [0, 200], CLAMP);

  // Slow glow pulse on the title
  const glowPulse = interpolate(
    Math.sin(frame * 0.04),
    [-1, 1],
    [0.15, 0.3],
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 65,
        left: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {/* Kicker label — Orbitron */}
      <div
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 12,
          fontWeight: 600,
          color: colors.accent.amber,
          letterSpacing: "0.2em",
          opacity: subtitleSpring * 0.7,
          marginBottom: 8,
        }}
      >
        DIAMETER COMPARISON
      </div>

      {/* Main title — "SOLAR SYSTEM" in Bebas Neue */}
      <div
        style={{
          fontFamily: fontFamily.display,
          fontSize: 64,
          fontWeight: 400,
          color: colors.text.primary,
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "0.06em",
          transform: `scale(${titleSpring})`,
          textShadow: `0 0 30px ${withAlpha(colors.accent.cyan, glowPulse)}`,
        }}
      >
        SOLAR SYSTEM
      </div>

      {/* Decorative gradient line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.accent.cyan}, ${colors.accent.amber}, transparent)`,
          marginTop: 10,
          opacity: titleSpring * 0.5,
        }}
      />

      {/* Subtitle — "Planet Size Comparison" in Poppins */}
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: 22,
          fontWeight: 500,
          color: colors.text.secondary,
          marginTop: 10,
          opacity: subtitleSpring,
          letterSpacing: "0.02em",
        }}
      >
        Planet Size Comparison
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main composition                                                   */
/* ------------------------------------------------------------------ */

export const SizeComparisonShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  /* Global fade in/out */
  const globalOpacity = fadeWindow(frame, 0, durationInFrames, 15, 20);

  /* Build SFX cues based on item timing */
  const sfxCues = useMemo(
    () => buildSfxCues(sampleItems, durationInFrames),
    [durationInFrames],
  );

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Background — gradient variant with orbiting radial gradients */}
      <Background variant="gradient" />

      {/* Extra star field for space atmosphere */}
      <StarField count={70} />

      {/* SVG filters */}
      <SvgFilters />

      {/* Sound layer — ambient + per-planet SFX */}
      <SoundLayer ambientSrc={SFX.ambient} sfxCues={sfxCues} />

      {/* Title (persistent throughout) */}
      <Title />

      {/* Size comparison visualization */}
      <AbsoluteFill>
        <SizeComparison items={sampleItems} />
      </AbsoluteFill>

      {/* Planet progress dots */}
      <PlanetCounter />

      {/* Watermark — bottom center, Orbitron */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 12,
            fontWeight: 600,
            color: colors.text.dim,
            opacity: 0.25,
            letterSpacing: "0.14em",
          }}
        >
          DATAVAULT
        </div>
      </div>
    </AbsoluteFill>
  );
};
