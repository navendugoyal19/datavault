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
import type { BarChartFrame, BarChartEntry } from "../lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BarChartRaceProps {
  data: BarChartFrame[];
  maxBars?: number;
  metricTitle?: string;
  timelineSegments?: TimelineSegment[];
}

export interface TimelineSegment {
  startFrame: number;
  endFrame: number;
  startIndex: number;
  endIndex: number;
}

interface InterpolatedBar {
  name: string;
  value: number;
  color: string;
  rank: number;
  prevRank: number | null;
  growthRate: number;
}

/* ------------------------------------------------------------------ */
/*  Color map — stable color per entity across all frames              */
/* ------------------------------------------------------------------ */

function buildColorMap(data: BarChartFrame[]): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  for (const frame of data) {
    for (const entry of frame.entries) {
      if (!map.has(entry.name)) {
        map.set(entry.name, entry.color ?? getBarColor(idx));
        idx++;
      }
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Rank tracking — previous rank for arrow indicators                 */
/* ------------------------------------------------------------------ */

function buildPrevRanks(
  a: BarChartFrame,
  maxBars: number,
): Map<string, number> {
  const sorted = [...a.entries].sort((x, y) => y.value - x.value);
  const map = new Map<string, number>();
  sorted.slice(0, maxBars).forEach((e, i) => map.set(e.name, i));
  return map;
}

/* ------------------------------------------------------------------ */
/*  Interpolation between two keyframes                                */
/* ------------------------------------------------------------------ */

function lerpBars(
  a: BarChartFrame,
  b: BarChartFrame,
  t: number,
  colorMap: Map<string, string>,
  maxBars: number,
): InterpolatedBar[] {
  const allNames = new Set<string>();
  a.entries.forEach((e) => allNames.add(e.name));
  b.entries.forEach((e) => allNames.add(e.name));

  const aMap = new Map<string, number>();
  a.entries.forEach((e) => aMap.set(e.name, e.value));
  const bMap = new Map<string, number>();
  b.entries.forEach((e) => bMap.set(e.name, e.value));

  const prevRanks = buildPrevRanks(a, maxBars + 2);

  const bars: InterpolatedBar[] = [];
  for (const name of allNames) {
    const va = aMap.get(name) ?? 0;
    const vb = bMap.get(name) ?? 0;
    const value = va + (vb - va) * t;
    const growthRate = va > 0 ? Math.abs(vb - va) / va : 0;
    bars.push({
      name,
      value,
      color: colorMap.get(name) ?? colors.bars[0],
      rank: 0,
      prevRank: prevRanks.get(name) ?? null,
      growthRate,
    });
  }

  bars.sort((x, y) => y.value - x.value);
  bars.forEach((bar, i) => (bar.rank = i));

  return bars.slice(0, maxBars);
}

/* ------------------------------------------------------------------ */
/*  Year interpolation                                                 */
/* ------------------------------------------------------------------ */

function lerpYear(a: BarChartFrame, b: BarChartFrame, t: number): string {
  const ya = typeof a.year === "number" ? a.year : parseFloat(String(a.year));
  const yb = typeof b.year === "number" ? b.year : parseFloat(String(b.year));
  if (isNaN(ya) || isNaN(yb)) {
    return t < 0.5 ? String(a.year) : String(b.year);
  }
  const v = ya + (yb - ya) * t;
  return Number.isInteger(ya) && Number.isInteger(yb)
    ? String(Math.round(v))
    : v.toFixed(1);
}

/* ------------------------------------------------------------------ */
/*  Value formatting                                                   */
/* ------------------------------------------------------------------ */

function formatValue(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return Math.round(v).toLocaleString("en-US");
}

/* ------------------------------------------------------------------ */
/*  Grid line values for the chart background                          */
/* ------------------------------------------------------------------ */

function computeGridValues(maxValue: number): number[] {
  if (maxValue <= 0) return [];
  const rawStep = maxValue / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  let step: number;
  if (normalized <= 1.5) step = magnitude;
  else if (normalized <= 3.5) step = 2.5 * magnitude;
  else if (normalized <= 7.5) step = 5 * magnitude;
  else step = 10 * magnitude;

  const values: number[] = [];
  let val = step;
  while (val < maxValue * 1.05) {
    values.push(val);
    val += step;
  }
  return values;
}

/* ------------------------------------------------------------------ */
/*  Rank change arrow component                                        */
/* ------------------------------------------------------------------ */

const RankArrow: React.FC<{ currentRank: number; prevRank: number | null }> = ({
  currentRank,
  prevRank,
}) => {
  if (prevRank === null || prevRank === currentRank) return null;
  const isUp = currentRank < prevRank;
  return (
    <span
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: isUp ? colors.accent.green : colors.accent.red,
        marginLeft: 4,
        fontFamily: fontFamily.numbers,
      }}
    >
      {isUp ? "\u2191" : "\u2193"}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export const BarChartRace: React.FC<BarChartRaceProps> = ({
  data,
  maxBars = 10,
  metricTitle,
  timelineSegments,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const colorMap = useMemo(() => buildColorMap(data), [data]);

  /* ---- Keyframe interpolation ---- */
  const resolvedTimeline = useMemo(() => {
    if (!timelineSegments || timelineSegments.length === 0) {
      return null;
    }

    const valid = timelineSegments
      .filter((segment) => segment.endFrame >= segment.startFrame)
      .sort((a, b) => a.startFrame - b.startFrame);

    return valid.length > 0 ? valid : null;
  }, [timelineSegments]);

  let segIdx = 0;
  let nextIdx = Math.min(1, Math.max(0, data.length - 1));
  let segT = 0;

  if (resolvedTimeline) {
    const first = resolvedTimeline[0];
    const last = resolvedTimeline[resolvedTimeline.length - 1];
    const active = resolvedTimeline.find(
      (segment) => frame >= segment.startFrame && frame <= segment.endFrame,
    );
    const fallback =
      active ??
      (frame < first.startFrame ? first : last);

    segIdx = Math.min(fallback.startIndex, Math.max(0, data.length - 1));
    nextIdx = Math.min(fallback.endIndex, Math.max(0, data.length - 1));
    const span = Math.max(1, fallback.endFrame - fallback.startFrame);
    segT = Math.min(
      Math.max((frame - fallback.startFrame) / span, 0),
      1,
    );
  } else {
    const totalSegments = Math.max(1, data.length - 1);
    const framesPerSegment = durationInFrames / totalSegments;
    const rawSegment = frame / framesPerSegment;
    segIdx = Math.min(Math.floor(rawSegment), totalSegments - 1);
    nextIdx = Math.min(segIdx + 1, data.length - 1);
    segT = Math.min(Math.max(rawSegment - segIdx, 0), 1);
  }

  const easedT = segT * segT * (3 - 2 * segT); // smoothstep

  const bars = lerpBars(
    data[segIdx],
    data[nextIdx] ?? data[segIdx],
    easedT,
    colorMap,
    maxBars,
  );
  const yearLabel = data[nextIdx]
    ? lerpYear(data[segIdx], data[nextIdx], easedT)
    : String(data[segIdx].year);

  const maxValue = Math.max(...bars.map((b) => b.value), 1);
  const gridValues = useMemo(() => computeGridValues(maxValue), [maxValue]);

  /* ---- Layout constants ---- */
  const chartLeft = 260;
  const chartRight = width - 140;
  const chartWidth = chartRight - chartLeft;
  const barHeight = 46;
  const barGap = 10;
  const chartTop = 80;
  const metricTitleHeight = metricTitle ? 50 : 0;

  /* ---- Entrance spring ---- */
  const entranceProgress = spring({
    frame,
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        opacity: entranceProgress,
      }}
    >
      <SvgFilters />

      {/* ---- SVG layer for glow filters specific to bars ---- */}
      <svg
        style={{ position: "absolute", width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter id="bar-glow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter
            id="bar-glow-intense"
            x="-20%"
            y="-50%"
            width="140%"
            height="200%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* ---- Metric title (e.g. "POPULATION") ---- */}
      {metricTitle && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: chartLeft,
            fontFamily: fontFamily.mono,
            fontSize: metricTitle.length > 22 ? 13 : 16,
            fontWeight: 700,
            color: colors.accent.cyan,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.8,
          }}
        >
          {metricTitle}
        </div>
      )}

      {/* ---- Grid lines ---- */}
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {gridValues.map((val, i) => {
          const x = chartLeft + (val / maxValue) * chartWidth;
          if (x > chartRight) return null;
          return (
            <React.Fragment key={`grid-${i}`}>
              <line
                x1={x}
                y1={chartTop + metricTitleHeight - 10}
                x2={x}
                y2={chartTop + metricTitleHeight + maxBars * (barHeight + barGap)}
                stroke={colors.text.dim}
                strokeWidth={0.5}
                opacity={0.18}
                strokeDasharray="4 6"
              />
              <text
                x={x}
                y={chartTop + metricTitleHeight - 16}
                fill={colors.text.dim}
                fontSize={11}
                fontFamily={fontFamily.numbers}
                fontWeight={500}
                textAnchor="middle"
                opacity={0.5}
              >
                {formatValue(val)}
              </text>
            </React.Fragment>
          );
        })}
      </svg>

      {/* ---- Year counter — large, bottom-right ---- */}
      <div
        style={{
          position: "absolute",
          right: 50,
          bottom: 30,
          fontFamily: fontFamily.display,
          fontSize: 160,
          fontWeight: 400,
          color: colors.text.dim,
          opacity: 0.35,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 0 60px ${withAlpha(colors.accent.cyan, 0.12)}`,
        }}
      >
        {yearLabel}
      </div>

      {/* ---- Bars ---- */}
      {bars.map((bar, i) => {
        const barWidth = Math.max((bar.value / maxValue) * chartWidth, 4);
        const targetY = chartTop + metricTitleHeight + i * (barHeight + barGap);

        /* Spring-based Y position for smooth reordering */
        const yProgress = spring({
          frame,
          fps,
          config: SPRING_CONFIGS.snappy,
        });
        const yPos = interpolate(yProgress, [0, 1], [targetY, targetY], CLAMP);

        /* Staggered entrance for new bars */
        const entranceDelay = staggerDelay(i, 3);
        const barEntrance = spring({
          frame: Math.max(0, frame - entranceDelay),
          fps,
          config: SPRING_CONFIGS.snappy,
        });
        const barWidthAnimated = barWidth * barEntrance;
        const barOpacity = interpolate(barEntrance, [0, 0.3], [0, 1], CLAMP);

        /* Glow intensity — stronger when bar is growing fastest */
        const glowIntensity = interpolate(
          bar.growthRate,
          [0, 0.05, 0.15],
          [0, 0.3, 0.8],
          CLAMP,
        );

        /* Bar gradient — lighter at top, darker at bottom */
        const barGradient = `linear-gradient(180deg, ${withAlpha(bar.color, 0.95)} 0%, ${withAlpha(bar.color, 0.65)} 100%)`;

        /* Neon glow shadow — intensifies with growth rate */
        const glowShadow = glowIntensity > 0.1
          ? `0 0 ${8 + glowIntensity * 18}px ${withAlpha(bar.color, 0.3 + glowIntensity * 0.35)}, 0 0 ${4 + glowIntensity * 8}px ${withAlpha(bar.color, 0.15 + glowIntensity * 0.2)}`
          : `0 0 8px ${withAlpha(bar.color, 0.2)}`;

        return (
          <div
            key={bar.name}
            style={{
              position: "absolute",
              top: yPos,
              left: 0,
              width: "100%",
              height: barHeight,
              opacity: barOpacity,
            }}
          >
            {/* Rank number */}
            <div
              style={{
                position: "absolute",
                left: 16,
                top: 0,
                height: barHeight,
                width: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fontFamily.numbers,
                fontSize: 20,
                fontWeight: 700,
                color: colors.text.dim,
              }}
            >
              {i + 1}
              <RankArrow currentRank={bar.rank} prevRank={bar.prevRank} />
            </div>

            {/* Name label */}
            <div
              style={{
                position: "absolute",
                left: 60,
                top: 0,
                width: chartLeft - 72,
                height: barHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 14,
                fontFamily: fontFamily.body,
                fontSize: bar.name.length > 18 ? 15 : 17,
                fontWeight: 600,
                color: colors.text.primary,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {bar.name}
            </div>

            {/* Bar fill */}
            <div
              style={{
                position: "absolute",
                left: chartLeft,
                top: 5,
                height: barHeight - 10,
                width: barWidthAnimated,
                borderRadius: 5,
                background: barGradient,
                boxShadow: glowShadow,
              }}
            >
              {/* Highlight line at top edge of bar */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  borderRadius: "5px 5px 0 0",
                  background: `linear-gradient(90deg, ${withAlpha("#ffffff", 0.35)}, ${withAlpha("#ffffff", 0.05)})`,
                }}
              />
            </div>

            {/* Value label */}
            <div
              style={{
                position: "absolute",
                left: chartLeft + barWidthAnimated + 12,
                top: 0,
                height: barHeight,
                display: "flex",
                alignItems: "center",
                fontFamily: fontFamily.numbers,
                fontSize: 17,
                fontWeight: 700,
                color: colors.text.secondary,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.01em",
              }}
            >
              {formatValue(bar.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
