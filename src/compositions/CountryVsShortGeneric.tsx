import React, { useMemo } from "react";
import { LightLeak } from "@remotion/light-leaks";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from "remotion";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import { SPRING_CONFIGS, CLAMP, fadeWindow, springIn } from "../lib/animation";
import type { LineTiming } from "../lib/timing";
import type { ComparisonStat } from "../lib/types";
import { Background } from "../components/Background";
import { ChromeFrame } from "../components/ChromeFrame";
import { DataOrb3D } from "../components/DataOrb3D";
import { SvgFilters } from "../components/SvgFilters";
import { SoundLayer } from "../components/SoundLayer";
import { CountryVsCountry } from "../components/CountryVsCountry";

/* ------------------------------------------------------------------ */
/*  Props schema                                                       */
/* ------------------------------------------------------------------ */
export interface CountryVsProps {
  countryA: string;
  countryB: string;
  flagA: string;
  flagB: string;
  colorA: string;
  colorB: string;
  stats: ComparisonStat[];
  narrationSrc: string;
  timingLines: LineTiming[];
}

/* ------------------------------------------------------------------ */
/*  Timing constants                                                   */
/* ------------------------------------------------------------------ */
const TITLE_CARD_DURATION = 90;
const INTRO_TRANSITION_DURATION = 18;

/* ------------------------------------------------------------------ */
/*  Title card intro                                                   */
/* ------------------------------------------------------------------ */
const TitleCard: React.FC<{
  flagA: string;
  flagB: string;
  countryA: string;
  countryB: string;
  colorA: string;
  colorB: string;
}> = ({ flagA, flagB, countryA, countryB, colorA, colorB }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = springIn(frame, fps, 8, SPRING_CONFIGS.bouncy);
  const titleScale = interpolate(titleSpring, [0, 1], [0.4, 1], CLAMP);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1], CLAMP);

  const subtitleSpring = springIn(frame, fps, 30, SPRING_CONFIGS.snappy);
  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1], CLAMP);
  const subtitleY = interpolate(subtitleSpring, [0, 1], [20, 0], CLAMP);

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
            color: colorA,
            letterSpacing: "0.04em",
          }}
        >
          {countryA}
        </span>
        <span
          style={{
            fontFamily: fontFamily.display,
            fontSize: 64,
            color: colorB,
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
/*  Main composition                                                   */
/* ------------------------------------------------------------------ */
export const CountryVsShortGeneric: React.FC<CountryVsProps> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const containerOpacity = fadeWindow(frame, 0, durationInFrames, 15, 20);

  // Build CountryVsData from props
  const data = useMemo(
    () => ({
      countryA: props.countryA,
      countryB: props.countryB,
      flagA: props.flagA,
      flagB: props.flagB,
      stats: props.stats,
    }),
    [props.countryA, props.countryB, props.flagA, props.flagB, props.stats],
  );

  // Offset timing lines by title card duration for the CountryVsCountry component
  const offsetTimings: LineTiming[] = useMemo(() => {
    // Skip the first timing line (title/intro), use only stat lines
    const statLines = props.timingLines.slice(1, props.stats.length + 1);
    const mainStartFrame = TITLE_CARD_DURATION - INTRO_TRANSITION_DURATION;
    return statLines.map((l) => ({
      ...l,
      startFrame: l.startFrame - mainStartFrame,
      endFrame: l.endFrame - mainStartFrame,
    }));
  }, [props.timingLines, props.stats.length]);

  return (
    <AbsoluteFill>
      {/* Split-color rivalry background */}
      <Background variant="versus" colorA={props.colorA} colorB={props.colorB} />

      {/* SVG filters for glow effects */}
      <SvgFilters />

      {/* Audio -- narration */}
      <SoundLayer narrationSrc={staticFile(props.narrationSrc)} />

      <LightLeak
        durationInFrames={26}
        seed={2}
        hueShift={342}
        style={{ opacity: 0.13, mixBlendMode: "screen" }}
      />

      <LightLeak
        from={TITLE_CARD_DURATION - INTRO_TRANSITION_DURATION - 8}
        durationInFrames={40}
        seed={11}
        hueShift={24}
        style={{ opacity: 0.18, mixBlendMode: "screen" }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.33,
          transform: "translateY(120px)",
        }}
      >
        <DataOrb3D
          accent={props.colorA}
          secondary={props.colorB}
          opacity={0.85}
          scale={1.4}
          position={[0, 0.1, 0]}
        />
      </div>

      {/* Content with fade */}
      <AbsoluteFill style={{ opacity: containerOpacity }}>
        <TransitionSeries>
          <TransitionSeries.Sequence durationInFrames={TITLE_CARD_DURATION}>
            <TitleCard
              flagA={props.flagA}
              flagB={props.flagB}
              countryA={props.countryA}
              countryB={props.countryB}
              colorA={props.colorA}
              colorB={props.colorB}
            />
          </TransitionSeries.Sequence>
          <TransitionSeries.Transition
            timing={linearTiming({ durationInFrames: INTRO_TRANSITION_DURATION })}
            presentation={slide({ direction: "from-bottom" })}
          />
          <TransitionSeries.Sequence
            durationInFrames={durationInFrames - TITLE_CARD_DURATION + INTRO_TRANSITION_DURATION}
          >
            <AbsoluteFill>
              <CountryVsCountry data={data} timings={offsetTimings} />
            </AbsoluteFill>
          </TransitionSeries.Sequence>
        </TransitionSeries>
      </AbsoluteFill>

      <ChromeFrame
        topLabel="DATAVAULT // COUNTRY MATCHUP"
        bottomLabel={`${props.countryA} × ${props.countryB}`}
        accentLeft={props.colorA}
        accentRight={props.colorB}
      />

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
