import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import { SPRING_CONFIGS, CLAMP } from "../lib/animation";

interface EraMarkerProps {
  title: string;
  subtitle: string;
  description?: string;
  startFrame: number;
  endFrame: number;
}

export const EraMarker: React.FC<EraMarkerProps> = ({
  title,
  subtitle,
  description,
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const duration = endFrame - startFrame;
  const localFrame = frame - startFrame;

  if (localFrame < 0 || localFrame >= duration) return null;

  const entranceEnd = Math.min(30, duration * 0.3);
  const exitStart = Math.max(duration - 30, duration * 0.7);

  const titleScale = spring({
    frame: localFrame,
    fps,
    config: { ...SPRING_CONFIGS.bouncy, damping: 14 },
  });

  const subtitleOpacity = spring({
    frame: Math.max(0, localFrame - 8),
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  const descOpacity = spring({
    frame: Math.max(0, localFrame - 16),
    fps,
    config: SPRING_CONFIGS.gentle,
  });

  const bgOpacity = interpolate(
    localFrame,
    [0, entranceEnd, exitStart, duration],
    [0, 0.85, 0.85, 0],
    CLAMP
  );

  const contentOpacity = interpolate(
    localFrame,
    [0, entranceEnd, exitStart, duration],
    [0, 1, 1, 0],
    CLAMP
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: withAlpha(colors.bg.primary, bgOpacity),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      <div style={{ opacity: contentOpacity, textAlign: "center", maxWidth: "70%" }}>
        <div
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 14,
            fontWeight: 600,
            color: colors.accent.amber,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: 20,
            opacity: subtitleOpacity * 0.8,
          }}
        >
          Era
        </div>

        <div
          style={{
            fontFamily: fontFamily.display,
            fontSize: 72,
            fontWeight: 400,
            color: colors.text.primary,
            lineHeight: 1.1,
            letterSpacing: "0.02em",
            transform: `scale(${titleScale})`,
            textShadow: `0 0 40px ${withAlpha(colors.accent.cyan, 0.3)}`,
          }}
        >
          {title}
        </div>

        <div
          style={{
            width: 120 * titleScale,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${colors.accent.amber}, transparent)`,
            margin: "24px auto",
            opacity: subtitleOpacity * 0.6,
          }}
        />

        <div
          style={{
            fontFamily: fontFamily.body,
            fontSize: 32,
            color: colors.accent.cyan,
            fontWeight: 500,
            letterSpacing: "0.06em",
            opacity: subtitleOpacity,
          }}
        >
          {subtitle}
        </div>

        {description && (
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: 20,
              color: colors.text.dim,
              marginTop: 20,
              lineHeight: 1.5,
              maxWidth: 600,
              margin: "20px auto 0",
              opacity: descOpacity,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
