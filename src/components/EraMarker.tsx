import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import { SPRING_CONFIGS, CLAMP } from "../lib/animation";

export interface EraMarkerData {
  startFrame: number;
  endFrame: number;
  title: string;
  subtitle?: string;
  description?: string;
  color?: string;
}

export const EraMarker: React.FC<{
  eraMarkers: EraMarkerData[];
}> = ({ eraMarkers }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeEra = eraMarkers.find(
    (era) => frame >= era.startFrame && frame <= era.endFrame
  );

  if (!activeEra) return null;

  const { startFrame, endFrame, title, subtitle, description, color } = activeEra;

  const primaryColor = color || colors.accent.cyan;
  const duration = endFrame - startFrame;
  const elapsed = frame - startFrame;

  const entranceDuration = Math.min(duration * 0.2, 60);
  const entranceProgress = interpolate(
    elapsed,
    [0, entranceDuration],
    [0, 1],
    CLAMP
  );

  const exitStart = duration - Math.min(duration * 0.2, 60);
  const exitProgress = interpolate(
    elapsed,
    [exitStart, duration],
    [1, 0],
    CLAMP
  );

  const opacity = entranceProgress * exitProgress;

  const scaleProgress = spring({
    frame: Math.max(0, elapsed),
    fps,
    config: SPRING_CONFIGS.bouncy,
  });

  const titleX = interpolate(
    entranceProgress,
    [0, 1],
    [-200, 0],
    CLAMP
  );

  const subtitleX = interpolate(
    entranceProgress,
    [0.2, 1],
    [200, 0],
    CLAMP
  );

  const descOpacity = interpolate(
    entranceProgress,
    [0.4, 0.8],
    [0, 1],
    CLAMP
  );

  const bgPulse = spring({
    frame: Math.max(0, elapsed),
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, ${withAlpha(colors.primary.dark, 0.7)} 0%, ${withAlpha(colors.primary.dark, 0.9)} 100%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "10%",
          right: "10%",
          bottom: "10%",
          border: `2px solid ${withAlpha(primaryColor, 0.3 * bgPulse)}`,
          borderRadius: 8,
          boxShadow: `inset 0 0 60px ${withAlpha(primaryColor, 0.1 * bgPulse)}`,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "70%",
          textAlign: "center",
          transform: `scale(${0.8 + 0.2 * scaleProgress})`,
        }}
      >
        <div
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: primaryColor,
            marginBottom: 16,
            opacity: entranceProgress,
          }}
        >
          Era Transition
        </div>

        <div
          style={{
            fontFamily: fontFamily.display,
            fontSize: 72,
            fontWeight: 400,
            color: colors.text.primary,
            lineHeight: 1.1,
            marginBottom: 12,
            transform: `translateX(${titleX}px)`,
            textShadow: `0 0 40px ${withAlpha(primaryColor, 0.3)}`,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </div>

        <div
          style={{
            width: 120 * entranceProgress,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
            marginBottom: 16,
          }}
        />

        {subtitle && (
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: 32,
              fontWeight: 500,
              color: colors.accent.amber,
              marginBottom: 20,
              transform: `translateX(${subtitleX}px)`,
              letterSpacing: "0.04em",
            }}
          >
            {subtitle}
          </div>
        )}

        {description && (
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: 18,
              fontWeight: 400,
              color: colors.text.secondary,
              lineHeight: 1.6,
              maxWidth: 600,
              opacity: descOpacity,
            }}
          >
            {description}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "8%",
          width: 40,
          height: 40,
          borderTop: `2px solid ${withAlpha(primaryColor, 0.5 * entranceProgress)}`,
          borderLeft: `2px solid ${withAlpha(primaryColor, 0.5 * entranceProgress)}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "8%",
          right: "8%",
          width: 40,
          height: 40,
          borderTop: `2px solid ${withAlpha(primaryColor, 0.5 * entranceProgress)}`,
          borderRight: `2px solid ${withAlpha(primaryColor, 0.5 * entranceProgress)}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "8%",
          left: "8%",
          width: 40,
          height: 40,
          borderBottom: `2px solid ${withAlpha(primaryColor, 0.5 * entranceProgress)}`,
          borderLeft: `2px solid ${withAlpha(primaryColor, 0.5 * entranceProgress)}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "8%",
          right: "8%",
          width: 40,
          height: 40,
          borderBottom: `2px solid ${withAlpha(primaryColor, 0.5 * entranceProgress)}`,
          borderRight: `2px solid ${withAlpha(primaryColor, 0.5 * entranceProgress)}`,
        }}
      />
    </AbsoluteFill>
  );
};
