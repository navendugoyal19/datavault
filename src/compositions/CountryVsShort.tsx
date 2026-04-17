import React, { useMemo } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  interpolate,
  staticFile,
} from "remotion";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import { SPRING_CONFIGS, CLAMP, fadeWindow, springIn } from "../lib/animation";
import { SFX, SFX_VOLUME } from "../lib/sfx";
import type { SfxCue } from "../lib/sfx";
import type { CountryVsData } from "../lib/types";
import { Background } from "../components/Background";
import { SvgFilters } from "../components/SvgFilters";
import { SoundLayer } from "../components/SoundLayer";
import { CountryVsCountry } from "../components/CountryVsCountry";
import { LINES } from "../generated/usa_vs_china_timing";

/* ------------------------------------------------------------------ */
/*  Sample data: USA vs China — enriched                               */
/* ------------------------------------------------------------------ */
const sampleData: CountryVsData = {
  countryA: "USA",
  countryB: "CHINA",
  flagA: "\uD83C\uDDFA\uD83C\uDDF8",
  flagB: "\uD83C\uDDE8\uD83C\uDDF3",
  stats: [
    {
      label: "Population",
      valueA: 340_000_000,
      valueB: 1_410_000_000,
      unit: "people",
      higherIsBetter: true,
    },
    {
      label: "GDP (Nominal)",
      valueA: 28_780_000_000_000,
      valueB: 18_530_000_000_000,
      unit: "USD",
      higherIsBetter: true,
    },
    {
      label: "Land Area",
      valueA: 9_834_000,
      valueB: 9_597_000,
      unit: "km\u00B2",
      higherIsBetter: true,
    },
    {
      label: "Military Personnel",
      valueA: 1_390_000,
      valueB: 2_035_000,
      unit: "active",
      higherIsBetter: true,
    },
    {
      label: "Nuclear Warheads",
      valueA: 5_550,
      valueB: 500,
      higherIsBetter: true,
    },
    {
      label: "Olympic Medals (All Time)",
      valueA: 2_636,
      valueB: 696,
      higherIsBetter: true,
    },
    {
      label: "Internet Users",
      valueA: 312_000_000,
      valueB: 1_050_000_000,
      unit: "users",
      higherIsBetter: true,
    },
    {
      label: "Life Expectancy",
      valueA: 77,
      valueB: 78,
      unit: "years",
      higherIsBetter: true,
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Timing constants                                                   */
/* ------------------------------------------------------------------ */
const TITLE_CARD_DURATION = 90;
const STAT_DURATION_ESTIMATE = 120; // frames per stat, used for SFX cue generation

/* ------------------------------------------------------------------ */
/*  Title card intro                                                   */
/* ------------------------------------------------------------------ */
const TitleCard: React.FC<{
  flagA: string;
  flagB: string;
  countryA: string;
  countryB: string;
}> = ({ flagA, flagB, countryA, countryB }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = springIn(frame, fps, 8, SPRING_CONFIGS.bouncy);
  const titleScale = interpolate(titleSpring, [0, 1], [0.4, 1], CLAMP);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1], CLAMP);

  const subtitleSpring = springIn(frame, fps, 30, SPRING_CONFIGS.snappy);
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1], CLAMP);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [20, 0], CLAMP);

  // Glow pulse on title
  const glowPulse = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.3, 0.7],
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      <SvgFilters />

      {/* Main title: flag vs flag */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          display: "flex",
          alignItems: "center",
          gap: 32,
          filter: "url(#glow-soft)",
        }}
      >
        <span style={{ fontSize: 120 }}>{flagA}</span>
        <span
          style={{
            fontFamily: fontFamily.display,
            fontSize: 96,
            color: colors.text.primary,
            textShadow: `0 0 40px ${withAlpha(colors.accent.cyan, glowPulse)}`,
          }}
        >
          vs
        </span>
        <span style={{ fontSize: 120 }}>{flagB}</span>
      </div>

      {/* Country names */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}
      >
        <span
          style={{
            fontFamily: fontFamily.display,
            fontSize: 64,
            color: colors.accent.cyan,
            letterSpacing: "0.04em",
          }}
        >
          {countryA}
        </span>
        <span
          style={{
            fontFamily: fontFamily.display,
            fontSize: 64,
            color: colors.accent.amber,
            letterSpacing: "0.04em",
          }}
        >
          {countryB}
        </span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          fontFamily: fontFamily.mono,
          fontSize: 28,
          fontWeight: 700,
          color: colors.text.secondary,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          marginTop: 16,
        }}
      >
        WHO WINS?
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Generate SFX cues based on stat count and timing                   */
/* ------------------------------------------------------------------ */
function buildSfxCues(statCount: number): SfxCue[] {
  const cues: SfxCue[] = [];

  // Whoosh at intro
  cues.push({
    frame: 5,
    sfx: SFX.whoosh,
    volume: SFX_VOLUME.transition,
    duration: 30,
  });

  // Impact when title lands
  cues.push({
    frame: 18,
    sfx: SFX.impact,
    volume: SFX_VOLUME.accent,
    duration: 20,
  });

  // Sweep transitioning from title to stats
  cues.push({
    frame: TITLE_CARD_DURATION - 10,
    sfx: SFX.sweep,
    volume: SFX_VOLUME.transition,
    duration: 30,
  });

  // Chime at each stat reveal
  for (let i = 0; i < statCount; i++) {
    const statStart = TITLE_CARD_DURATION + i * STAT_DURATION_ESTIMATE;
    cues.push({
      frame: statStart + 5,
      sfx: SFX.chime,
      volume: SFX_VOLUME.accent,
      duration: 25,
    });

    // Pop when winner is determined
    cues.push({
      frame: statStart + 80,
      sfx: SFX.pop,
      volume: SFX_VOLUME.subtle,
      duration: 15,
    });
  }

  // Reveal sound at final verdict
  const verdictFrame = TITLE_CARD_DURATION + statCount * STAT_DURATION_ESTIMATE + 10;
  cues.push({
    frame: verdictFrame,
    sfx: SFX.reveal,
    volume: SFX_VOLUME.transition,
    duration: 45,
  });

  return cues;
}

/* ------------------------------------------------------------------ */
/*  Main composition                                                   */
/* ------------------------------------------------------------------ */
export const CountryVsShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Overall fade in/out using design system
  const containerOpacity = fadeWindow(frame, 0, durationInFrames, 15, 20);

  // Build SFX cues
  const sfxCues = useMemo(() => buildSfxCues(sampleData.stats.length), []);

  return (
    <AbsoluteFill>
      {/* Split-color rivalry background */}
      <Background variant="versus" colorA={colors.accent.cyan} colorB={colors.accent.amber} />

      {/* SVG filters for glow effects */}
      <SvgFilters />

      {/* Audio — narration only, no forced SFX */}
      <SoundLayer
        narrationSrc={staticFile("audio/usa_vs_china_narration.wav")}
      />

      {/* Content with fade */}
      <AbsoluteFill style={{ opacity: containerOpacity }}>
        {/* Title card intro */}
        <Sequence from={0} durationInFrames={TITLE_CARD_DURATION}>
          <TitleCard
            flagA={sampleData.flagA ?? ""}
            flagB={sampleData.flagB ?? ""}
            countryA={sampleData.countryA}
            countryB={sampleData.countryB}
          />
        </Sequence>

        {/* Main comparison content — synced to narration */}
        <Sequence from={TITLE_CARD_DURATION} layout="none">
          <AbsoluteFill>
            <CountryVsCountry
              data={sampleData}
              timings={LINES.slice(1, 9).map((l) => ({
                ...l,
                startFrame: l.startFrame - TITLE_CARD_DURATION,
                endFrame: l.endFrame - TITLE_CARD_DURATION,
              }))}
            />
          </AbsoluteFill>
        </Sequence>
      </AbsoluteFill>

      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 16,
            fontWeight: 600,
            color: colors.text.dim,
            opacity: 0.35,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          DATAVAULT
        </div>
      </div>
    </AbsoluteFill>
  );
};
