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
import { CountryVsCountry } from "../components/CountryVsCountry";
import { SFX, SFX_VOLUME } from "../lib/sfx";
import type { CountryVsData } from "../lib/types";
import type { SfxCue } from "../lib/sfx";

/* ------------------------------------------------------------------ */
/*  Sample data: 3 matchups                                            */
/* ------------------------------------------------------------------ */

const matchups: { title: string; data: CountryVsData }[] = [
  {
    title: "MATCH 1: USA vs CHINA",
    data: {
      countryA: "USA",
      countryB: "CHINA",
      flagA: "\uD83C\uDDFA\uD83C\uDDF8",
      flagB: "\uD83C\uDDE8\uD83C\uDDF3",
      stats: [
        { label: "Population", valueA: 340_000_000, valueB: 1_410_000_000, unit: "people", higherIsBetter: true },
        { label: "GDP (Nominal)", valueA: 28_780_000_000_000, valueB: 18_530_000_000_000, unit: "USD", higherIsBetter: true },
        { label: "Land Area", valueA: 9_834_000, valueB: 9_597_000, unit: "km\u00B2", higherIsBetter: true },
        { label: "Military Personnel", valueA: 1_390_000, valueB: 2_035_000, unit: "active", higherIsBetter: true },
        { label: "Nuclear Warheads", valueA: 5_550, valueB: 500, higherIsBetter: true },
        { label: "Olympic Medals", valueA: 2_636, valueB: 696, higherIsBetter: true },
      ],
    },
  },
  {
    title: "MATCH 2: INDIA vs JAPAN",
    data: {
      countryA: "INDIA",
      countryB: "JAPAN",
      flagA: "\uD83C\uDDEE\uD83C\uDDF3",
      flagB: "\uD83C\uDDEF\uD83C\uDDF5",
      stats: [
        { label: "Population", valueA: 1_450_000_000, valueB: 123_000_000, unit: "people", higherIsBetter: true },
        { label: "GDP (Nominal)", valueA: 3_940_000_000_000, valueB: 4_230_000_000_000, unit: "USD", higherIsBetter: true },
        { label: "Land Area", valueA: 3_287_000, valueB: 378_000, unit: "km\u00B2", higherIsBetter: true },
        { label: "Tech Exports", valueA: 22_000_000_000, valueB: 103_000_000_000, unit: "USD", higherIsBetter: true },
        { label: "Life Expectancy", valueA: 70, valueB: 84, unit: "years", higherIsBetter: true },
        { label: "Olympic Medals", valueA: 35, valueB: 497, higherIsBetter: true },
      ],
    },
  },
  {
    title: "MATCH 3: GERMANY vs BRAZIL",
    data: {
      countryA: "GERMANY",
      countryB: "BRAZIL",
      flagA: "\uD83C\uDDE9\uD83C\uDDEA",
      flagB: "\uD83C\uDDE7\uD83C\uDDF7",
      stats: [
        { label: "Population", valueA: 84_000_000, valueB: 217_000_000, unit: "people", higherIsBetter: true },
        { label: "GDP (Nominal)", valueA: 4_460_000_000_000, valueB: 2_130_000_000_000, unit: "USD", higherIsBetter: true },
        { label: "Land Area", valueA: 357_000, valueB: 8_516_000, unit: "km\u00B2", higherIsBetter: true },
        { label: "Manufacturing Output", valueA: 780_000_000_000, valueB: 310_000_000_000, unit: "USD", higherIsBetter: true },
        { label: "FIFA World Cups", valueA: 4, valueB: 5, higherIsBetter: true },
        { label: "Forest Area", valueA: 114_000, valueB: 4_970_000, unit: "km\u00B2", higherIsBetter: true },
      ],
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Timing constants                                                   */
/* ------------------------------------------------------------------ */

const FPS = 30;
const MAIN_TITLE_DURATION = 4 * FPS; // 120 frames = 4 seconds
const MATCHUP_TITLE_DURATION = 2 * FPS; // 60 frames = 2 seconds
const MATCHUP_BODY_DURATION = 15 * FPS; // 450 frames = 15 seconds
const TRANSITION_DURATION = 1 * FPS; // 30 frames = 1 second

const MATCHUP_TOTAL = MATCHUP_TITLE_DURATION + MATCHUP_BODY_DURATION + TRANSITION_DURATION;

/* ------------------------------------------------------------------ */
/*  Build SFX cues                                                     */
/* ------------------------------------------------------------------ */

function buildSfxCues(): SfxCue[] {
  const cues: SfxCue[] = [];

  // Main title entrance
  cues.push({ frame: 0, sfx: SFX.sweep, volume: SFX_VOLUME.transition, duration: 60 });
  cues.push({ frame: 15, sfx: SFX.impact, volume: SFX_VOLUME.accent, duration: 30 });

  matchups.forEach((_, idx) => {
    const matchStart = MAIN_TITLE_DURATION + idx * MATCHUP_TOTAL;

    // Matchup title card sweep
    cues.push({
      frame: matchStart,
      sfx: SFX.sweep,
      volume: SFX_VOLUME.transition,
      duration: 40,
    });

    // Whoosh when comparison begins
    cues.push({
      frame: matchStart + MATCHUP_TITLE_DURATION - 10,
      sfx: SFX.whoosh,
      volume: SFX_VOLUME.transition,
      duration: 25,
    });

    // Chime midway through matchup
    cues.push({
      frame: matchStart + MATCHUP_TITLE_DURATION + Math.floor(MATCHUP_BODY_DURATION * 0.5),
      sfx: SFX.chime,
      volume: SFX_VOLUME.accent,
      duration: 25,
    });

    // Reveal at matchup end
    cues.push({
      frame: matchStart + MATCHUP_TITLE_DURATION + MATCHUP_BODY_DURATION - 30,
      sfx: SFX.reveal,
      volume: SFX_VOLUME.accent,
      duration: 40,
    });

    // Transition sweep between matchups (except last)
    if (idx < matchups.length - 1) {
      cues.push({
        frame: matchStart + MATCHUP_TOTAL - 15,
        sfx: SFX.sweep,
        volume: SFX_VOLUME.subtle,
        duration: 30,
      });
    }
  });

  return cues;
}

/* ------------------------------------------------------------------ */
/*  Animated globe icon for main title                                 */
/* ------------------------------------------------------------------ */

const GlobeIcon: React.FC<{ size: number; progress: number }> = ({
  size,
  progress,
}) => {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <circle cx={r} cy={r} r={r + 4} fill="none" stroke={colors.accent.cyan} strokeWidth={1.5} opacity={progress * 0.3} />
      <circle cx={r} cy={r} r={r * progress} fill={withAlpha(colors.accent.cyan, 0.08)} stroke={colors.accent.cyan} strokeWidth={1.5} opacity={progress * 0.7} />
      <ellipse cx={r} cy={r} rx={r * 0.55 * progress} ry={r * progress} fill="none" stroke={colors.accent.cyan} strokeWidth={0.8} opacity={progress * 0.4} />
      <ellipse cx={r} cy={r} rx={r * 0.85 * progress} ry={r * progress} fill="none" stroke={colors.accent.cyan} strokeWidth={0.8} opacity={progress * 0.3} />
      <line x1={r - r * progress} y1={r} x2={r + r * progress} y2={r} stroke={colors.accent.cyan} strokeWidth={0.8} opacity={progress * 0.4} />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Main title card: "COUNTRY COMPARISON"                              */
/* ------------------------------------------------------------------ */

const MainTitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: SPRING_CONFIGS.bouncy });
  const subtitleOpacity = spring({ frame: Math.max(0, frame - 12), fps, config: SPRING_CONFIGS.gentle });
  const globeProgress = spring({ frame: Math.max(0, frame - 5), fps, config: SPRING_CONFIGS.heavy });
  const fadeOut = interpolate(frame, [MAIN_TITLE_DURATION - 30, MAIN_TITLE_DURATION], [1, 0], CLAMP);

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
      <div style={{ marginBottom: 30 }}>
        <GlobeIcon size={90} progress={globeProgress} />
      </div>

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
        COUNTRY COMPARISON
      </div>

      <div
        style={{
          width: 180 * titleScale,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.accent.cyan}, ${colors.accent.amber}, transparent)`,
          marginTop: 22,
          opacity: subtitleOpacity * 0.6,
        }}
      />

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
        Top Rivalries
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Mini title card for each matchup                                   */
/* ------------------------------------------------------------------ */

const MatchupTitleCard: React.FC<{
  title: string;
  flagA: string;
  flagB: string;
}> = ({ title, flagA, flagB }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = springIn(frame, fps, 5, SPRING_CONFIGS.bouncy);
  const titleScale = interpolate(titleSpring, [0, 1], [0.5, 1], CLAMP);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1], CLAMP);

  const flagSpring = springIn(frame, fps, 15, SPRING_CONFIGS.snappy);
  const flagOpacity = interpolate(flagSpring, [0, 1], [0, 1], CLAMP);

  const fadeOut = interpolate(
    frame,
    [MATCHUP_TITLE_DURATION - 20, MATCHUP_TITLE_DURATION],
    [1, 0],
    CLAMP,
  );

  const glowPulse = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.2, 0.5]);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        opacity: fadeOut,
      }}
    >
      {/* Flags */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          opacity: flagOpacity,
        }}
      >
        <span style={{ fontSize: 90 }}>{flagA}</span>
        <span
          style={{
            fontFamily: fontFamily.display,
            fontSize: 64,
            color: colors.text.primary,
            textShadow: `0 0 30px ${withAlpha(colors.accent.purple, glowPulse)}`,
          }}
        >
          vs
        </span>
        <span style={{ fontSize: 90 }}>{flagB}</span>
      </div>

      {/* Match title */}
      <div
        style={{
          fontFamily: fontFamily.display,
          fontSize: 56,
          fontWeight: 400,
          color: colors.text.primary,
          textAlign: "center",
          letterSpacing: "0.04em",
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          textShadow: `0 0 30px ${withAlpha(colors.accent.cyan, glowPulse)}`,
        }}
      >
        {title}
      </div>

      {/* Decorative line */}
      <div
        style={{
          width: 140 * titleSpring,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.accent.amber}, transparent)`,
          opacity: titleOpacity * 0.5,
        }}
      />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Transition overlay between matchups                                */
/* ------------------------------------------------------------------ */

const TransitionOverlay: React.FC = () => {
  const frame = useCurrentFrame();

  const sweepProgress = interpolate(frame, [0, TRANSITION_DURATION], [0, 1], CLAMP);
  const opacity = interpolate(
    sweepProgress,
    [0, 0.3, 0.7, 1],
    [0, 0.6, 0.6, 0],
    CLAMP,
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(90deg, transparent ${sweepProgress * 100 - 30}%, ${withAlpha(colors.accent.cyan, 0.15)} ${sweepProgress * 100}%, transparent ${sweepProgress * 100 + 30}%)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

/* ------------------------------------------------------------------ */
/*  Main composition                                                   */
/* ------------------------------------------------------------------ */

export const CountryVsVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const globalOpacity = fadeWindow(frame, 0, durationInFrames, 15, 25);
  const sfxCues = useMemo(() => buildSfxCues(), []);

  return (
    <AbsoluteFill style={{ opacity: globalOpacity }}>
      {/* Cinematic background with Ken Burns */}
      <Background variant="cinematic" />

      {/* SVG filters */}
      <SvgFilters />

      {/* Sound layer */}
      <SoundLayer ambientSrc={SFX.ambient} sfxCues={sfxCues} />

      {/* Main title card (first 4 seconds) */}
      <Sequence from={0} durationInFrames={MAIN_TITLE_DURATION} layout="none">
        <MainTitleCard />
      </Sequence>

      {/* Matchups rendered sequentially */}
      {matchups.map((matchup, idx) => {
        const matchStart = MAIN_TITLE_DURATION + idx * MATCHUP_TOTAL;

        return (
          <React.Fragment key={idx}>
            {/* Mini title card for this matchup */}
            <Sequence
              from={matchStart}
              durationInFrames={MATCHUP_TITLE_DURATION}
              layout="none"
            >
              <MatchupTitleCard
                title={matchup.title}
                flagA={matchup.data.flagA ?? ""}
                flagB={matchup.data.flagB ?? ""}
              />
            </Sequence>

            {/* CountryVsCountry component for this matchup */}
            <Sequence
              from={matchStart + MATCHUP_TITLE_DURATION}
              durationInFrames={MATCHUP_BODY_DURATION}
              layout="none"
            >
              <AbsoluteFill>
                <CountryVsCountry data={matchup.data} />
              </AbsoluteFill>
            </Sequence>

            {/* Transition overlay (except after last matchup) */}
            {idx < matchups.length - 1 && (
              <Sequence
                from={matchStart + MATCHUP_TITLE_DURATION + MATCHUP_BODY_DURATION}
                durationInFrames={TRANSITION_DURATION}
                layout="none"
              >
                <TransitionOverlay />
              </Sequence>
            )}
          </React.Fragment>
        );
      })}

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
        Source: World Bank, CIA Factbook
      </div>
    </AbsoluteFill>
  );
};
