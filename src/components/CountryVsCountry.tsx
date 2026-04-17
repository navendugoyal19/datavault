import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import { SPRING_CONFIGS, CLAMP, springIn, staggerDelay } from "../lib/animation";
import { getActiveLineAtFrame } from "../lib/timing";
import type { LineTiming } from "../lib/timing";
import type { CountryVsData, ComparisonStat } from "../lib/types";
import { SvgFilters } from "./SvgFilters";
import { NumberCounter } from "./NumberCounter";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface CountryVsCountryProps {
  data: CountryVsData;
  /** Optional narration timings — one per stat. Falls back to even distribution. */
  timings?: LineTiming[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const BAR_MAX_WIDTH = 380;
const STAT_COUNT_UP_DURATION = 30;
const BAR_FILL_DELAY = 20;
const WINNER_GLOW_DELAY = 15;
const PARTICLE_COUNT = 24;

/** Deterministic pseudo-random for particle bursts */
const hash = (n: number): number =>
  ((Math.sin(n * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;

/* ------------------------------------------------------------------ */
/*  Winner particle burst                                              */
/* ------------------------------------------------------------------ */
const WinnerBurst: React.FC<{
  startFrame: number;
  color: string;
  side: "left" | "right";
}> = ({ startFrame, color, side }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = frame - startFrame;
  if (elapsed < 0) return null;

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        angle: hash(i * 17) * Math.PI * 2,
        speed: 2 + hash(i * 31) * 6,
        size: 3 + hash(i * 47) * 5,
        delay: Math.floor(hash(i * 61) * 6),
      })),
    [],
  );

  const originX = side === "left" ? 270 : 810;
  const originY = 60;

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width: 1080, height: 300, pointerEvents: "none" }}
    >
      {particles.map((p, i) => {
        const t = springIn(elapsed, fps, p.delay, SPRING_CONFIGS.bouncy);
        const dist = t * p.speed * 30;
        const cx = originX + Math.cos(p.angle) * dist;
        const cy = originY + Math.sin(p.angle) * dist;
        const opacity = interpolate(t, [0, 0.3, 1], [0, 1, 0], CLAMP);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={p.size * (1 - t * 0.4)}
            fill={color}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Glass card wrapper                                                 */
/* ------------------------------------------------------------------ */
const GlassCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      background: `linear-gradient(180deg, ${withAlpha(
        colors.bg.card,
        0.82,
      )}, ${withAlpha(colors.bg.secondary, 0.72)})`,
      border: `1px solid ${withAlpha(colors.text.dim, 0.22)}`,
      borderRadius: 20,
      padding: "28px 36px",
      backdropFilter: "blur(12px)",
      boxShadow: `0 18px 45px ${withAlpha(colors.bg.primary, 0.42)}`,
      ...style,
    }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Stat row                                                           */
/* ------------------------------------------------------------------ */
const StatRow: React.FC<{
  stat: ComparisonStat;
  index: number;
}> = ({ stat, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const higherIsBetter = stat.higherIsBetter ?? true;
  const aWins = higherIsBetter ? stat.valueA > stat.valueB : stat.valueA < stat.valueB;
  const bWins = !aWins && stat.valueA !== stat.valueB;
  const isTie = stat.valueA === stat.valueB;

  // Staggered entrance
  const delay = staggerDelay(0, 0); // already sequenced, no extra stagger needed
  const slideIn = springIn(frame, fps, delay, SPRING_CONFIGS.snappy);
  const translateY = interpolate(slideIn, [0, 1], [50, 0], CLAMP);
  const opacity = interpolate(slideIn, [0, 1], [0, 1], CLAMP);

  // Bar fill — delayed after count-up finishes
  const barProgress = interpolate(
    frame,
    [STAT_COUNT_UP_DURATION + BAR_FILL_DELAY, STAT_COUNT_UP_DURATION + BAR_FILL_DELAY + 25],
    [0, 1],
    CLAMP,
  );
  const barEased = 1 - Math.pow(1 - barProgress, 3);

  // Winner highlight — after bars settle
  const winnerStart = STAT_COUNT_UP_DURATION + BAR_FILL_DELAY + 25 + WINNER_GLOW_DELAY;
  const winnerGlow = interpolate(frame, [winnerStart, winnerStart + 12], [0, 1], CLAMP);

  // Bar widths proportional to values
  const maxVal = Math.max(stat.valueA, stat.valueB);
  const barATarget = maxVal > 0 ? (stat.valueA / maxVal) * BAR_MAX_WIDTH : 0;
  const barBTarget = maxVal > 0 ? (stat.valueB / maxVal) * BAR_MAX_WIDTH : 0;

  const winnerColorA = colors.accent.cyan;
  const winnerColorB = colors.accent.amber;
  const loserBarColor = colors.text.dim;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        gap: 16,
      }}
    >
      <GlassCard style={{ width: 960 }}>
        {/* Stat label */}
        <div
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 22,
            fontWeight: 700,
            color: colors.text.secondary,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          {stat.label}
        </div>

        {/* Values row */}
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {/* Country A side */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: 1 }}>
            <div
              style={{
                filter: aWins && winnerGlow > 0.5 ? "url(#neon-cyan)" : "none",
              }}
            >
              <NumberCounter
                value={stat.valueA}
                duration={STAT_COUNT_UP_DURATION}
                suffix={stat.unit ?? ""}
                fontSize={42}
                color={aWins && winnerGlow > 0.5 ? winnerColorA : colors.text.primary}
                glowOnComplete={aWins}
                glowColor={winnerColorA}
              />
            </div>
            {/* Bar — gradient sweep from right */}
            <div
              style={{
                width: BAR_MAX_WIDTH,
                height: 14,
                backgroundColor: withAlpha(colors.bg.card, 0.6),
                borderRadius: 5,
                marginTop: 10,
                display: "flex",
                justifyContent: "flex-end",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: barATarget * barEased,
                  height: "100%",
                  borderRadius: 5,
                  background: aWins
                    ? `linear-gradient(90deg, ${withAlpha(winnerColorA, 0.3)}, ${winnerColorA})`
                    : loserBarColor,
                  boxShadow:
                    aWins && winnerGlow > 0.5
                      ? `0 0 14px ${withAlpha(winnerColorA, 0.6)}`
                      : "none",
                }}
              />
            </div>
          </div>

          {/* VS divider — glowing circle */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: withAlpha(colors.bg.card, 0.7),
              border: `2px solid ${withAlpha(colors.text.dim, 0.3)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 16px ${withAlpha(colors.accent.purple, 0.2)}`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 14,
                fontWeight: 800,
                color: colors.text.dim,
                letterSpacing: "0.05em",
              }}
            >
              VS
            </span>
          </div>

          {/* Country B side */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
            <div
              style={{
                filter: bWins && winnerGlow > 0.5 ? "url(#neon-amber)" : "none",
              }}
            >
              <NumberCounter
                value={stat.valueB}
                duration={STAT_COUNT_UP_DURATION}
                suffix={stat.unit ?? ""}
                fontSize={42}
                color={bWins && winnerGlow > 0.5 ? winnerColorB : colors.text.primary}
                glowOnComplete={bWins}
                glowColor={winnerColorB}
              />
            </div>
            {/* Bar — gradient sweep from left */}
            <div
              style={{
                width: BAR_MAX_WIDTH,
                height: 14,
                backgroundColor: withAlpha(colors.bg.card, 0.6),
                borderRadius: 5,
                marginTop: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: barBTarget * barEased,
                  height: "100%",
                  borderRadius: 5,
                  background: bWins
                    ? `linear-gradient(90deg, ${winnerColorB}, ${withAlpha(winnerColorB, 0.3)})`
                    : loserBarColor,
                  boxShadow:
                    bWins && winnerGlow > 0.5
                      ? `0 0 14px ${withAlpha(winnerColorB, 0.6)}`
                      : "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Winner indicator */}
        {winnerGlow > 0.5 && !isTie && (
          <div
            style={{
              textAlign: "center",
              marginTop: 14,
              fontFamily: fontFamily.mono,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: aWins ? winnerColorA : winnerColorB,
              opacity: winnerGlow,
              textTransform: "uppercase",
            }}
          >
            {aWins ? "\u25C0 WINNER" : "WINNER \u25B6"}
          </div>
        )}
      </GlassCard>

      {/* Particle burst for winner */}
      {winnerGlow > 0.3 && aWins && (
        <WinnerBurst startFrame={winnerStart} color={winnerColorA} side="left" />
      )}
      {winnerGlow > 0.3 && bWins && (
        <WinnerBurst startFrame={winnerStart} color={winnerColorB} side="right" />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Score display                                                      */
/* ------------------------------------------------------------------ */
const ScoreDisplay: React.FC<{
  scoreA: number;
  scoreB: number;
}> = ({ scoreA, scoreB }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bounce on score change
  const bounceA = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });
  const bounceB = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.bouncy,
  });
  const scaleA = interpolate(bounceA, [0, 1], [1.3, 1], CLAMP);
  const scaleB = interpolate(bounceB, [0, 1], [1.3, 1], CLAMP);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "14px 32px",
        background: `linear-gradient(180deg, ${withAlpha(
          colors.bg.card,
          0.78,
        )}, ${withAlpha(colors.bg.secondary, 0.68)})`,
        borderRadius: 18,
        border: `1px solid ${withAlpha(colors.text.dim, 0.24)}`,
        boxShadow: `0 4px 24px ${withAlpha(colors.bg.primary, 0.5)}`,
      }}
    >
      <span
        style={{
          fontFamily: fontFamily.numbers,
          fontSize: 52,
          fontWeight: 700,
          color: colors.accent.cyan,
          fontVariantNumeric: "tabular-nums",
          transform: `scale(${scaleA})`,
          display: "inline-block",
        }}
      >
        {scoreA}
      </span>
      <span
        style={{
          fontFamily: fontFamily.display,
          fontSize: 30,
          fontWeight: 400,
          color: colors.text.dim,
        }}
      >
        :
      </span>
      <span
        style={{
          fontFamily: fontFamily.numbers,
          fontSize: 52,
          fontWeight: 700,
          color: colors.accent.amber,
          fontVariantNumeric: "tabular-nums",
          transform: `scale(${scaleB})`,
          display: "inline-block",
        }}
      >
        {scoreB}
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Final verdict overlay                                              */
/* ------------------------------------------------------------------ */
const FinalVerdict: React.FC<{
  winner: string | null;
  isTie: boolean;
  winnerColor: string;
}> = ({ winner, isTie, winnerColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = springIn(frame, fps, 0, SPRING_CONFIGS.bouncy);
  const opacity = interpolate(scale, [0, 1], [0, 1], CLAMP);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        opacity,
        transform: `scale(${interpolate(scale, [0, 1], [0.6, 1], CLAMP)})`,
      }}
    >
      <div
        style={{
          fontFamily: fontFamily.display,
          fontSize: 72,
          fontWeight: 400,
          color: isTie ? colors.accent.purple : winnerColor,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          filter: "url(#glow-strong)",
          textAlign: "center",
        }}
      >
        {isTie ? "IT'S A TIE!" : `${winner} WINS!`}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export const CountryVsCountry: React.FC<CountryVsCountryProps> = ({ data, timings }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const statCount = data.stats.length;

  // Timing: if narration timings provided, use them; otherwise distribute evenly
  const framesPerStat = timings
    ? 0 // unused when timings provided
    : Math.floor(durationInFrames / (statCount + 2)); // +2 for header + verdict
  const headerDuration = timings ? (timings[0]?.startFrame ?? 90) : Math.floor(framesPerStat * 1.2);

  /** Get the start frame for stat index i */
  const getStatStart = (i: number): number => {
    if (timings && timings[i]) return timings[i].startFrame;
    return headerDuration + i * framesPerStat;
  };

  /** Get the duration for stat index i */
  const getStatDuration = (i: number): number => {
    if (timings && timings[i]) return timings[i].endFrame - timings[i].startFrame;
    return framesPerStat;
  };

  // Compute running score based on how many stats have been revealed + settled
  let scoreA = 0;
  let scoreB = 0;
  const winnerRevealOffset = STAT_COUNT_UP_DURATION + BAR_FILL_DELAY + 25 + WINNER_GLOW_DELAY;
  for (let i = 0; i < statCount; i++) {
    const statStart = getStatStart(i);
    const elapsed = frame - statStart;
    if (elapsed > winnerRevealOffset) {
      const s = data.stats[i];
      const hib = s.higherIsBetter ?? true;
      if (hib ? s.valueA > s.valueB : s.valueA < s.valueB) scoreA++;
      else if (s.valueA !== s.valueB) scoreB++;
    }
  }

  // Header entrance
  const headerSpring = springIn(frame, fps, 0, SPRING_CONFIGS.gentle);
  const headerY = interpolate(headerSpring, [0, 1], [-40, 0], CLAMP);
  const headerOpacity = interpolate(headerSpring, [0, 1], [0, 1], CLAMP);

  // Final verdict — show after last stat has settled
  const lastStatEnd = getStatStart(statCount - 1) + getStatDuration(statCount - 1);
  const showVerdict = frame >= lastStatEnd;
  const finalIsTie = scoreA === scoreB;
  const finalWinner = scoreA > scoreB ? data.countryA : data.countryB;
  const finalWinnerColor = scoreA > scoreB ? colors.accent.cyan : colors.accent.amber;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 60,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* SVG filter definitions */}
      <SvgFilters />

      {/* Header — country names + flags + score */}
      <div
        style={{
          opacity: headerOpacity,
          transform: `translateY(${headerY}px)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          marginBottom: 40,
          width: "100%",
        }}
      >
        {/* Country A */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {data.flagA && <div style={{ fontSize: 88, marginBottom: 8 }}>{data.flagA}</div>}
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: 56,
              color: colors.accent.cyan,
              letterSpacing: "0.06em",
              textShadow: `0 0 20px ${withAlpha(colors.accent.cyan, 0.4)}`,
            }}
          >
            {data.countryA}
          </div>
        </div>

        {/* Score */}
        <ScoreDisplay scoreA={scoreA} scoreB={scoreB} />

        {/* Country B */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {data.flagB && <div style={{ fontSize: 88, marginBottom: 8 }}>{data.flagB}</div>}
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: 56,
              color: colors.accent.amber,
              letterSpacing: "0.06em",
              textShadow: `0 0 20px ${withAlpha(colors.accent.amber, 0.4)}`,
            }}
          >
            {data.countryB}
          </div>
        </div>
      </div>

      {/* VS divider under header */}
      <div
        style={{
          opacity: headerOpacity,
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: withAlpha(colors.bg.card, 0.7),
          border: `2px solid ${withAlpha(colors.accent.purple, 0.3)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 24px ${withAlpha(colors.accent.purple, 0.15)}`,
          marginBottom: 40,
        }}
      >
        <span
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 20,
            fontWeight: 900,
            color: colors.text.secondary,
            letterSpacing: "0.08em",
          }}
        >
          VS
        </span>
      </div>

      {/* Stats — one at a time via Sequence */}
      {data.stats.map((stat, idx) => (
        <Sequence
          key={idx}
          from={getStatStart(idx)}
          durationInFrames={getStatDuration(idx)}
          layout="none"
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              position: "absolute",
              top: 340,
              bottom: 200,
              alignItems: "flex-start",
            }}
          >
            <StatRow stat={stat} index={idx} />
          </div>
        </Sequence>
      ))}

      {/* Stat progress dots at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 16,
          alignItems: "center",
        }}
      >
        {data.stats.map((stat, idx) => {
          const statStart = getStatStart(idx);
          const isRevealed = frame >= statStart + winnerRevealOffset;
          const isCurrent = frame >= statStart && !isRevealed;
          const hib = stat.higherIsBetter ?? true;
          const aWon = hib ? stat.valueA > stat.valueB : stat.valueA < stat.valueB;
          const dotColor = isRevealed
            ? (aWon ? colors.accent.cyan : colors.accent.amber)
            : isCurrent
              ? colors.text.secondary
              : colors.text.dim;
          return (
            <div
              key={idx}
              style={{
                width: isCurrent ? 32 : 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: dotColor,
                opacity: isRevealed ? 1 : isCurrent ? 0.8 : 0.3,
                transition: "all 0.3s ease",
                boxShadow: isRevealed ? `0 0 10px ${dotColor}` : "none",
              }}
            />
          );
        })}
      </div>

      {/* Current stat label at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          width: "100%",
          textAlign: "center",
          fontFamily: fontFamily.body,
          fontSize: 18,
          color: colors.text.dim,
          letterSpacing: "0.08em",
        }}
      >
        {(() => {
          for (let i = statCount - 1; i >= 0; i--) {
            if (frame >= getStatStart(i)) {
              return `${i + 1} of ${statCount}`;
            }
          }
          return "";
        })()}
      </div>

      {/* Final verdict */}
      {showVerdict && (
        <Sequence from={lastStatEnd} layout="none">
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(180deg, ${withAlpha(
                colors.bg.primary,
                0.72,
              )}, ${withAlpha(colors.bg.secondary, 0.82)})`,
            }}
          >
            <FinalVerdict
              winner={finalWinner}
              isTie={finalIsTie}
              winnerColor={finalWinnerColor}
            />
          </div>
        </Sequence>
      )}
    </div>
  );
};
