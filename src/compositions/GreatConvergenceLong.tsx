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
} from "../lib/animation";
import { Background } from "../components/Background";
import { SvgFilters } from "../components/SvgFilters";
import { SoundLayer } from "../components/SoundLayer";
import { BarChartRace, type TimelineSegment } from "../components/BarChartRace";
import { EraMarker } from "../components/EraMarker";
import { SFX, SFX_VOLUME } from "../lib/sfx";
import type { BarChartFrame } from "../lib/types";
import type { SfxCue } from "../lib/sfx";

export const GREAT_CONVERGENCE_DURATION = 18756;

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
      aria-label="Globe icon"
    >
      <title>Globe</title>
      <circle
        cx={r}
        cy={r}
        r={r + 4}
        fill="none"
        stroke={colors.accent.cyan}
        strokeWidth={1.5}
        opacity={progress * 0.3}
      />
      <circle
        cx={r}
        cy={r}
        r={r * progress}
        fill={withAlpha(colors.accent.cyan, 0.08)}
        stroke={colors.accent.cyan}
        strokeWidth={1.5}
        opacity={progress * 0.7}
      />
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
      <line
        x1={r - r * progress}
        y1={r}
        x2={r + r * progress}
        y2={r}
        stroke={colors.accent.cyan}
        strokeWidth={0.8}
        opacity={progress * 0.4}
      />
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
      <div style={{ marginBottom: 30 }}>
        <GlobeIcon size={80} progress={globeProgress} />
      </div>

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

      <div
        style={{
          width: 160 * titleScale,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.accent.cyan}, transparent)`,
          marginTop: 22,
          opacity: subtitleOpacity * 0.6,
        }}
      />

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

const deriveSfxCues = (introDuration: number, eraMarkers: EraConfig[]): SfxCue[] => {
  const cues: SfxCue[] = [
    { frame: 0, sfx: SFX.sweep, volume: SFX_VOLUME.transition, duration: 60 },
    { frame: 85, sfx: SFX.whoosh, volume: SFX_VOLUME.transition, duration: 30 },
  ];

  for (const era of eraMarkers) {
    cues.push({
      frame: era.startFrame,
      sfx: SFX.impact,
      volume: SFX_VOLUME.accent,
      duration: 40,
    });
    cues.push({
      frame: era.startFrame + 60,
      sfx: SFX.chime,
      volume: SFX_VOLUME.accent,
      duration: 30,
    });
  }

  cues.push({
    frame: GREAT_CONVERGENCE_DURATION - 120,
    sfx: SFX.reveal,
    volume: SFX_VOLUME.accent,
    duration: 50,
  });

  return cues;
};

export interface GreatConvergenceLongProps {
  title?: string;
  data?: BarChartFrame[];
  metricTitle?: string;
  narrationSrc?: string;
  sourceLabel?: string;
  timelineSegments?: TimelineSegment[];
  tickYears?: Array<number | string>;
  eraMarkers?: EraConfig[];
}

export interface EraConfig {
  title: string;
  subtitle: string;
  description?: string;
  startFrame: number;
  endFrame: number;
}

const deriveDateRangeLabel = (data: BarChartFrame[]): string => {
  if (data.length === 0) return "";
  return `${data[0].year} — ${data[data.length - 1].year}`;
};

const deriveTickYears = (data: BarChartFrame[]): Array<number | string> => {
  if (data.length <= 6) return data.map((frame) => frame.year);
  const indexes = Array.from({ length: 6 }, (_, index) =>
    Math.round(((data.length - 1) * index) / 5),
  );
  return indexes.map((index) => data[index].year);
};

const DEFAULT_ERA_MARKERS: EraConfig[] = [
  {
    title: "The Post-War Boom",
    subtitle: "1950 — 1973",
    description: "Reconstruction, industrialization, and the rise of the Western middle class.",
    startFrame: 3120,
    endFrame: 3900,
  },
  {
    title: "The Great Divergence",
    subtitle: "1973 — 1991",
    description: "Oil shocks, stagflation, and the widening gap between rich and poor nations.",
    startFrame: 7020,
    endFrame: 7800,
  },
  {
    title: "The Rise of Asia",
    subtitle: "1991 — 2008",
    description: "China's opening, India's reforms, and the fastest wealth creation in history.",
    startFrame: 10920,
    endFrame: 11700,
  },
  {
    title: "The Great Convergence",
    subtitle: "2008 — 2023",
    description: "Emerging markets catch up. The global wealth gap narrows for the first time.",
    startFrame: 14820,
    endFrame: 15600,
  },
];

export const GreatConvergenceLong: React.FC<GreatConvergenceLongProps> = ({
  title = "THE GREAT CONVERGENCE",
  data = [],
  metricTitle = "GDP PER CAPITA (PPP, INT'L $)",
  narrationSrc,
  sourceLabel = "Source: World Bank",
  timelineSegments,
  tickYears,
  eraMarkers = DEFAULT_ERA_MARKERS,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const resolvedData = data.length > 0 ? data : [];

  const introDuration = 3 * fps;
  const raceDuration = durationInFrames - introDuration;
  const dateRangeLabel = deriveDateRangeLabel(resolvedData);
  const resolvedTickYears = tickYears && tickYears.length > 0
    ? tickYears
    : deriveTickYears(resolvedData);

  const sfxCues = useMemo(
    () => deriveSfxCues(introDuration, eraMarkers),
    [introDuration, eraMarkers]
  );

  const globalOpacity = fadeWindow(frame, 0, durationInFrames, 15, 25);

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      <Background variant="cinematic" />
      <SvgFilters />
      <SoundLayer
        narrationSrc={narrationSrc ? staticFile(narrationSrc) : undefined}
        ambientSrc={SFX.ambient}
        sfxCues={sfxCues}
      />

      <Sequence from={0} durationInFrames={introDuration} layout="none">
        <TitleCard
          title={title}
          dateRangeLabel={dateRangeLabel}
          metricTitle={metricTitle}
        />
      </Sequence>

      <Sequence
        from={introDuration}
        durationInFrames={raceDuration}
        layout="none"
      >
        <AbsoluteFill style={{ padding: "40px 10px 20px 10px" }}>
          {resolvedData.length > 0 && (
            <BarChartRace
              data={resolvedData}
              maxBars={10}
              metricTitle={metricTitle}
              timelineSegments={timelineSegments}
            />
          )}
        </AbsoluteFill>
      </Sequence>

      {eraMarkers.map((era) => (
        <Sequence
          key={`${era.title}-${era.startFrame}`}
          from={era.startFrame}
          durationInFrames={era.endFrame - era.startFrame}
          layout="none"
        >
          <EraMarker
            title={era.title}
            subtitle={era.subtitle}
            description={era.description}
            startFrame={era.startFrame}
            endFrame={era.endFrame}
          />
        </Sequence>
      ))}

      <TimelineProgress
        raceStart={introDuration}
        raceDuration={raceDuration}
        years={resolvedTickYears}
      />

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
