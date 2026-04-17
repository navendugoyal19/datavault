import React, { useMemo } from "react";
import { LightLeak } from "@remotion/light-leaks";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import { SPRING_CONFIGS, CLAMP, fadeWindow } from "../lib/animation";
import { Background } from "../components/Background";
import { ChromeFrame } from "../components/ChromeFrame";
import { DataOrb3D } from "../components/DataOrb3D";
import { SvgFilters } from "../components/SvgFilters";
import { SoundLayer } from "../components/SoundLayer";
import { SizeComparison } from "../components/SizeComparison";
import { SFX, SFX_VOLUME } from "../lib/sfx";
import type { SizeItem } from "../lib/types";
import type { SfxCue } from "../lib/sfx";
import type { LineTiming } from "../lib/timing";

/* ------------------------------------------------------------------ */
/*  Props schema                                                       */
/* ------------------------------------------------------------------ */
export interface SizeComparisonProps {
  title: string;
  subtitle: string;
  items: SizeItem[];
  narrationSrc: string;
  timingLines: LineTiming[];
  bgVariant?: "grid" | "particles" | "gradient" | "cinematic" | "versus";
}

/* ------------------------------------------------------------------ */
/*  SFX cues                                                           */
/* ------------------------------------------------------------------ */
function buildSfxCues(items: SizeItem[], durationInFrames: number): SfxCue[] {
  const framesPerItem = durationInFrames / items.length;
  const cues: SfxCue[] = [];

  items.forEach((item, idx) => {
    const entranceFrame = Math.round(idx * framesPerItem) + 5;
    const isLast = idx === items.length - 1;
    const isSecondLast = idx === items.length - 2;

    cues.push({
      frame: entranceFrame,
      sfx: isLast ? SFX.impact : SFX.pop,
      volume: isLast
        ? SFX_VOLUME.transition
        : isSecondLast
          ? SFX_VOLUME.accent
          : SFX_VOLUME.subtle,
      duration: isLast ? 50 : 22,
    });
  });

  cues.push({
    frame: Math.round((items.length - 1) * framesPerItem) + 30,
    sfx: SFX.reveal,
    volume: SFX_VOLUME.accent,
    duration: 40,
  });

  return cues;
}

/* ------------------------------------------------------------------ */
/*  Star field                                                         */
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
/*  Item counter dots                                                  */
/* ------------------------------------------------------------------ */
const ItemCounter: React.FC<{ items: SizeItem[]; timingLines?: LineTiming[] }> = ({ items, timingLines }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Use timing if available, otherwise even distribution
  const getItemStart = (idx: number): number => {
    if (timingLines && timingLines.length > items.length) {
      // First line is intro, items start at index 1
      return timingLines[idx + 1]?.startFrame ?? Math.floor(idx * (durationInFrames / items.length));
    }
    if (timingLines && timingLines[idx]) return timingLines[idx].startFrame;
    return Math.floor(idx * (durationInFrames / items.length));
  };

  let activeIndex = 0;
  for (let i = items.length - 1; i >= 0; i--) {
    if (frame >= getItemStart(i)) {
      activeIndex = i;
      break;
    }
  }

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
      {items.map((item, idx) => {
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
            }}
          />
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Title component                                                    */
/* ------------------------------------------------------------------ */
const Title: React.FC<{ title: string; subtitle: string }> = ({
  title,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: SPRING_CONFIGS.bouncy });
  const subtitleSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  const lineWidth = interpolate(titleSpring, [0, 1], [0, 200], CLAMP);

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
      {/* Kicker label */}
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
        SIZE COMPARISON
      </div>

      {/* Main title in Bebas Neue */}
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
        {title}
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

      {/* Subtitle in Poppins */}
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
        {subtitle}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main composition                                                   */
/* ------------------------------------------------------------------ */
export const SizeComparisonShortGeneric: React.FC<SizeComparisonProps> = (
  props,
) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const globalOpacity = fadeWindow(frame, 0, durationInFrames, 15, 20);

  const sfxCues = useMemo(
    () => buildSfxCues(props.items, durationInFrames),
    [props.items, durationInFrames],
  );

  const bgVariant = props.bgVariant ?? "cinematic";

  const lightLeakCues = useMemo(() => {
    const itemTimings =
      props.timingLines.length > props.items.length
        ? props.timingLines.slice(1, props.items.length + 1)
        : props.timingLines.slice(0, props.items.length);

    return itemTimings.map((timing, index) => ({
      from: Math.max(0, timing.startFrame - 8),
      durationInFrames: index === props.items.length - 1 ? 34 : 22,
      seed: 50 + index * 7,
      hueShift: index % 2 === 0 ? 18 : 346,
      opacity: index === props.items.length - 1 ? 0.18 : 0.11,
    }));
  }, [props.items.length, props.timingLines]);

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Background */}
      <Background variant={bgVariant} />

      {/* Star field for atmosphere */}
      <StarField count={70} />

      {/* SVG filters */}
      <SvgFilters />

      {/* Sound layer */}
      <SoundLayer
        narrationSrc={staticFile(props.narrationSrc)}
        ambientSrc={SFX.ambient}
        sfxCues={sfxCues}
      />

      <LightLeak
        durationInFrames={28}
        seed={7}
        hueShift={336}
        style={{ opacity: 0.12, mixBlendMode: "screen" }}
      />

      {lightLeakCues.map((cue) => (
        <LightLeak
          key={`${cue.from}-${cue.seed}`}
          from={cue.from}
          durationInFrames={cue.durationInFrames}
          seed={cue.seed}
          hueShift={cue.hueShift}
          style={{ opacity: cue.opacity, mixBlendMode: "screen" }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.24,
          transform: "translateY(100px)",
        }}
      >
        <DataOrb3D
          accent={props.items[props.items.length - 1]?.color ?? colors.accent.purple}
          secondary={props.items[0]?.color ?? colors.accent.cyan}
          opacity={0.75}
          scale={1.28}
          position={[0, 0.1, 0]}
        />
      </div>

      {/* Title (persistent throughout) */}
      <Title title={props.title} subtitle={props.subtitle} />

      {/* Size comparison visualization — synced to narration timing */}
      <AbsoluteFill>
        <SizeComparison
          items={props.items}
          itemTimings={
            props.timingLines.length > props.items.length
              ? props.timingLines.slice(1, props.items.length + 1).map((t) => ({
                  startFrame: t.startFrame,
                  endFrame: t.endFrame,
                }))
              : props.timingLines.slice(0, props.items.length).map((t) => ({
                  startFrame: t.startFrame,
                  endFrame: t.endFrame,
                }))
          }
        />
      </AbsoluteFill>

      {/* Item progress dots */}
      <ItemCounter items={props.items} timingLines={props.timingLines} />

      <ChromeFrame
        topLabel="DATAVAULT // SCALE INDEX"
        bottomLabel={props.subtitle}
        accentLeft={props.items[0]?.color ?? colors.accent.cyan}
        accentRight={props.items[props.items.length - 1]?.color ?? colors.accent.amber}
      />

      {/* Watermark */}
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
