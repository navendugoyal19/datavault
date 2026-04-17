import React, { useMemo } from "react";
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
import {
  SPRING_CONFIGS,
  CLAMP,
  fadeWindow,
  staggerDelay,
} from "../lib/animation";
import { Background } from "../components/Background";
import { SvgFilters } from "../components/SvgFilters";
import { SoundLayer } from "../components/SoundLayer";
import { BarChartRace, type TimelineSegment } from "../components/BarChartRace";
import { SFX, SFX_VOLUME } from "../lib/sfx";
import type { BarChartFrame } from "../lib/types";
import type { SfxCue } from "../lib/sfx";

/* ------------------------------------------------------------------ */
/*  Sample data: Top 10 Most Populated Countries 2000-2025 (millions) */
/* ------------------------------------------------------------------ */

const sampleData: BarChartFrame[] = [
  {
    year: 2000,
    entries: [
      { name: "China", value: 1290 },
      { name: "India", value: 1053 },
      { name: "United States", value: 282 },
      { name: "Indonesia", value: 212 },
      { name: "Brazil", value: 175 },
      { name: "Pakistan", value: 144 },
      { name: "Russia", value: 147 },
      { name: "Bangladesh", value: 131 },
      { name: "Japan", value: 127 },
      { name: "Nigeria", value: 123 },
      { name: "Mexico", value: 100 },
      { name: "Germany", value: 82 },
    ],
  },
  {
    year: 2005,
    entries: [
      { name: "China", value: 1310 },
      { name: "India", value: 1140 },
      { name: "United States", value: 296 },
      { name: "Indonesia", value: 227 },
      { name: "Brazil", value: 186 },
      { name: "Pakistan", value: 162 },
      { name: "Russia", value: 144 },
      { name: "Bangladesh", value: 143 },
      { name: "Nigeria", value: 139 },
      { name: "Japan", value: 128 },
      { name: "Mexico", value: 107 },
      { name: "Germany", value: 82 },
    ],
  },
  {
    year: 2010,
    entries: [
      { name: "China", value: 1338 },
      { name: "India", value: 1234 },
      { name: "United States", value: 310 },
      { name: "Indonesia", value: 242 },
      { name: "Brazil", value: 196 },
      { name: "Pakistan", value: 179 },
      { name: "Nigeria", value: 159 },
      { name: "Bangladesh", value: 151 },
      { name: "Russia", value: 143 },
      { name: "Japan", value: 128 },
      { name: "Mexico", value: 114 },
      { name: "Germany", value: 82 },
    ],
  },
  {
    year: 2015,
    entries: [
      { name: "China", value: 1376 },
      { name: "India", value: 1310 },
      { name: "United States", value: 321 },
      { name: "Indonesia", value: 258 },
      { name: "Brazil", value: 206 },
      { name: "Pakistan", value: 199 },
      { name: "Nigeria", value: 182 },
      { name: "Bangladesh", value: 161 },
      { name: "Russia", value: 144 },
      { name: "Mexico", value: 122 },
      { name: "Japan", value: 127 },
      { name: "Germany", value: 82 },
    ],
  },
  {
    year: 2020,
    entries: [
      { name: "China", value: 1411 },
      { name: "India", value: 1380 },
      { name: "United States", value: 331 },
      { name: "Indonesia", value: 274 },
      { name: "Pakistan", value: 221 },
      { name: "Brazil", value: 213 },
      { name: "Nigeria", value: 206 },
      { name: "Bangladesh", value: 169 },
      { name: "Russia", value: 146 },
      { name: "Mexico", value: 129 },
      { name: "Japan", value: 126 },
      { name: "Germany", value: 83 },
    ],
  },
  {
    year: 2025,
    entries: [
      { name: "India", value: 1450 },
      { name: "China", value: 1410 },
      { name: "United States", value: 340 },
      { name: "Indonesia", value: 280 },
      { name: "Pakistan", value: 245 },
      { name: "Nigeria", value: 230 },
      { name: "Brazil", value: 217 },
      { name: "Bangladesh", value: 175 },
      { name: "Russia", value: 144 },
      { name: "Mexico", value: 133 },
      { name: "Japan", value: 123 },
      { name: "Ethiopia", value: 130 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  SFX cues                                                           */
/* ------------------------------------------------------------------ */

const sfxCues: SfxCue[] = [
  // Title card entrance sweep
  { frame: 0, sfx: SFX.sweep, volume: SFX_VOLUME.transition, duration: 60 },
  // Transition to chart
  { frame: 85, sfx: SFX.whoosh, volume: SFX_VOLUME.transition, duration: 30 },
  // Chime when India overtakes China (around frame 80% through the race)
  { frame: 450, sfx: SFX.chime, volume: SFX_VOLUME.accent, duration: 30 },
  // Final reveal sound
  { frame: 520, sfx: SFX.reveal, volume: SFX_VOLUME.accent, duration: 40 },
];

/* ------------------------------------------------------------------ */
/*  Animated globe icon for title card                                 */
/* ------------------------------------------------------------------ */

const GlobeIcon: React.FC<{ size: number; progress: number }> = ({
  size,
  progress,
}) => {
  const r = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible" }}
    >
      {/* Outer glow */}
      <circle
        cx={r}
        cy={r}
        r={r + 4}
        fill="none"
        stroke={colors.accent.cyan}
        strokeWidth={1.5}
        opacity={progress * 0.3}
      />

      {/* Globe body */}
      <circle
        cx={r}
        cy={r}
        r={r * progress}
        fill={withAlpha(colors.accent.cyan, 0.08)}
        stroke={colors.accent.cyan}
        strokeWidth={1.5}
        opacity={progress * 0.7}
      />

      {/* Meridian lines */}
      <ellipse
        cx={r}
        cy={r}
        rx={r * 0.55 * progress}
        ry={r * progress}
        fill="none"
        stroke={colors.accent.cyan}
        strokeWidth={0.8}
        opacity={progress * 0.4}
      />
      <ellipse
        cx={r}
        cy={r}
        rx={r * 0.85 * progress}
        ry={r * progress}
        fill="none"
        stroke={colors.accent.cyan}
        strokeWidth={0.8}
        opacity={progress * 0.3}
      />

      {/* Equator */}
      <line
        x1={r - r * progress}
        y1={r}
        x2={r + r * progress}
        y2={r}
        stroke={colors.accent.cyan}
        strokeWidth={0.8}
        opacity={progress * 0.4}
      />

      {/* Tropics */}
      <line
        x1={r - r * 0.85 * progress}
        y1={r - r * 0.35 * progress}
        x2={r + r * 0.85 * progress}
        y2={r - r * 0.35 * progress}
        stroke={colors.accent.cyan}
        strokeWidth={0.5}
        opacity={progress * 0.25}
      />
      <line
        x1={r - r * 0.85 * progress}
        y1={r + r * 0.35 * progress}
        x2={r + r * 0.85 * progress}
        y2={r + r * 0.35 * progress}
        stroke={colors.accent.cyan}
        strokeWidth={0.5}
        opacity={progress * 0.25}
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Timeline progress bar — shows position through the race            */
/* ------------------------------------------------------------------ */

const TimelineProgress: React.FC<{
  raceDuration: number;
  raceStart: number;
  years: Array<number | string>;
}> = ({ raceDuration, raceStart, years }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const raceFrame = frame - raceStart;
  if (raceFrame < 0) return null;

  const progress = interpolate(raceFrame, [0, raceDuration], [0, 1], CLAMP);

  const barWidth = width - 120;
  const barHeight = 3;
  const barX = 60;
  const barY = 24;

  // Entrance fade
  const entranceOpacity = interpolate(raceFrame, [0, 30], [0, 1], CLAMP);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: 50,
        pointerEvents: "none",
        opacity: entranceOpacity,
      }}
    >
      {/* Track background */}
      <div
        style={{
          position: "absolute",
          left: barX,
          top: barY,
          width: barWidth,
          height: barHeight,
          borderRadius: 2,
          backgroundColor: withAlpha(colors.text.dim, 0.2),
        }}
      />

      {/* Progress fill */}
      <div
        style={{
          position: "absolute",
          left: barX,
          top: barY,
          width: barWidth * progress,
          height: barHeight,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${colors.accent.cyan}, ${colors.accent.amber})`,
          boxShadow: `0 0 8px ${withAlpha(colors.accent.cyan, 0.4)}`,
        }}
      />

      {/* Playhead dot */}
      <div
        style={{
          position: "absolute",
          left: barX + barWidth * progress - 4,
          top: barY - 2.5,
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: colors.accent.cyan,
          boxShadow: `0 0 10px ${withAlpha(colors.accent.cyan, 0.6)}`,
        }}
      />

      {/* Year tick marks */}
      {years.map((year, i) => {
        const yearProgress = i / (years.length - 1);
        const x = barX + barWidth * yearProgress;
        return (
          <React.Fragment key={year}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: barY + barHeight + 4,
                fontFamily: fontFamily.numbers,
                fontSize: 9,
                fontWeight: 500,
                color: colors.text.dim,
                opacity: 0.5,
                transform: "translateX(-50%)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {year}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main composition                                                   */
/* ------------------------------------------------------------------ */

export interface BarChartRaceVideoProps {
  title?: string;
  data?: BarChartFrame[];
  metricTitle?: string;
  narrationSrc?: string;
  sourceLabel?: string;
  timelineSegments?: TimelineSegment[];
  tickYears?: Array<number | string>;
}

const deriveDateRangeLabel = (data: BarChartFrame[]): string => {
  if (data.length === 0) {
    return "";
  }

  return `${data[0].year} — ${data[data.length - 1].year}`;
};

const deriveTickYears = (data: BarChartFrame[]): Array<number | string> => {
  if (data.length <= 6) {
    return data.map((frame) => frame.year);
  }

  const indexes = Array.from({ length: 6 }, (_, index) =>
    Math.round(((data.length - 1) * index) / 5),
  );
  return indexes.map((index) => data[index].year);
};

const TitleCard: React.FC<{
  title: string;
  dateRangeLabel: string;
  metricTitle: string;
}> = ({ title, dateRangeLabel, metricTitle }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  const subtitleOpacity = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  const metricOpacity = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  const globeProgress = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: SPRING_CONFIGS.heavy,
  });

  // Fade out near end of title card
  const fadeOut = interpolate(frame, [70, 90], [1, 0], CLAMP);

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
      {/* Globe icon */}
      <div style={{ marginBottom: 30 }}>
        <GlobeIcon size={80} progress={globeProgress} />
      </div>

      {/* Main title — Bebas Neue */}
      <div
        style={{
          fontFamily: fontFamily.display,
          fontSize: 82,
          fontWeight: 400,
          color: colors.text.primary,
          textAlign: "center",
          lineHeight: 1.1,
          maxWidth: width * 0.75,
          transform: `scale(${titleScale})`,
          letterSpacing: "0.02em",
          textShadow: `0 0 40px ${withAlpha(colors.accent.cyan, 0.25)}, 0 0 80px ${withAlpha(colors.accent.cyan, 0.1)}`,
        }}
      >
        {title}
      </div>

      {/* Decorative line separator */}
      <div
        style={{
          width: 160 * titleScale,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.accent.cyan}, transparent)`,
          marginTop: 22,
          opacity: subtitleOpacity * 0.6,
        }}
      />

      {/* Subtitle — date range in Poppins */}
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: 34,
          color: colors.accent.cyan,
          marginTop: 18,
          fontWeight: 500,
          opacity: subtitleOpacity,
          letterSpacing: "0.08em",
        }}
      >
        {dateRangeLabel}
      </div>

      {/* Metric description */}
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: metricTitle.length > 22 ? 17 : 20,
          color: colors.text.dim,
          marginTop: 14,
          opacity: metricOpacity,
        }}
      >
        {metricTitle}
      </div>
    </AbsoluteFill>
  );
};

export const BarChartRaceVideo: React.FC<BarChartRaceVideoProps> = ({
  title = "TOP 10 MOST POPULATED COUNTRIES",
  data = sampleData,
  metricTitle = "POPULATION (MILLIONS)",
  narrationSrc,
  sourceLabel = "Source: United Nations",
  timelineSegments,
  tickYears,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const resolvedData = data.length > 0 ? data : sampleData;

  const introDuration = 3 * fps; // 3 seconds at 30fps = 90 frames
  const raceDuration = durationInFrames - introDuration;
  const dateRangeLabel = deriveDateRangeLabel(resolvedData);
  const resolvedTickYears = tickYears && tickYears.length > 0
    ? tickYears
    : deriveTickYears(resolvedData);

  /* Global fade in/out using fadeWindow */
  const globalOpacity = fadeWindow(frame, 0, durationInFrames, 15, 25);

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Background layer — cinematic variant with Ken Burns + particles */}
      <Background variant="cinematic" />

      {/* SVG filters (glow-soft, glow-strong, neon-cyan, neon-amber) */}
      <SvgFilters />

      {/* Sound layer — ambient pad + timed SFX */}
      <SoundLayer
        narrationSrc={narrationSrc ? staticFile(narrationSrc) : undefined}
        ambientSrc={SFX.ambient}
        sfxCues={sfxCues}
      />

      {/* Title card intro (first 3 seconds) */}
      <Sequence from={0} durationInFrames={introDuration} layout="none">
        <TitleCard
          title={title}
          dateRangeLabel={dateRangeLabel}
          metricTitle={metricTitle}
        />
      </Sequence>

      {/* Bar chart race (starts after title card) */}
      <Sequence
        from={introDuration}
        durationInFrames={raceDuration}
        layout="none"
      >
        <AbsoluteFill style={{ padding: "40px 10px 20px 10px" }}>
          <BarChartRace
            data={resolvedData}
            maxBars={10}
            metricTitle={metricTitle}
            timelineSegments={timelineSegments}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Timeline progress bar (visible during race) */}
      <TimelineProgress
        raceStart={introDuration}
        raceDuration={raceDuration}
        years={resolvedTickYears}
      />

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

      {/* Source citation — bottom-left, Poppins dim */}
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
        {sourceLabel}
      </div>
    </AbsoluteFill>
  );
};
