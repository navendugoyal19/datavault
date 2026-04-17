import React from "react";
import { Polygon, Rect } from "@remotion/shapes";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";

interface ChromeFrameProps {
  topLabel: string;
  bottomLabel?: string;
  accentLeft?: string;
  accentRight?: string;
}

const CornerBracket: React.FC<{
  side: "left" | "right";
  top: number;
  color: string;
}> = ({ side, top, color }) => {
  const horizontalStyle: React.CSSProperties =
    side === "left"
      ? { position: "absolute", left: 0, top: 0 }
      : { position: "absolute", right: 0, top: 0, transform: "scaleX(-1)" };

  const verticalStyle: React.CSSProperties =
    side === "left"
      ? { position: "absolute", left: 0, top: 0 }
      : { position: "absolute", right: 0, top: 0, transform: "scaleY(-1)" };

  return (
    <div
      style={{
        position: "absolute",
        top,
        ...(side === "left" ? { left: 42 } : { right: 42 }),
        width: 124,
        height: 82,
        opacity: 0.92,
      }}
    >
      <Rect
        width={124}
        height={6}
        cornerRadius={3}
        fill={withAlpha(color, 0.82)}
        style={horizontalStyle}
      />
      <Rect
        width={6}
        height={82}
        cornerRadius={3}
        fill={withAlpha(color, 0.82)}
        style={verticalStyle}
      />
    </div>
  );
};

export const ChromeFrame: React.FC<ChromeFrameProps> = ({
  topLabel,
  bottomLabel = "DATAVAULT",
  accentLeft = colors.accent.cyan,
  accentRight = colors.accent.amber,
}) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame * 0.03), [-1, 1], [0.28, 0.48]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Rect
        width={972}
        height={1772}
        cornerRadius={34}
        fill="none"
        stroke={withAlpha(colors.text.dim, 0.45)}
        strokeWidth={1.2}
        pathStyle={{
          filter: `drop-shadow(0 0 22px ${withAlpha(colors.bg.primary, 0.8)})`,
        }}
        style={{
          position: "absolute",
          left: 54,
          top: 74,
          opacity: 0.9,
        }}
      />

      <Rect
        width={940}
        height={1740}
        cornerRadius={28}
        fill="none"
        stroke={withAlpha(colors.text.dim, 0.12)}
        strokeWidth={1}
        style={{
          position: "absolute",
          left: 70,
          top: 90,
          opacity: 0.55,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 98,
          right: 72,
          height: 1,
          background: `linear-gradient(90deg, ${withAlpha(
            accentLeft,
            0.85,
          )}, ${withAlpha(colors.text.secondary, 0.2)} 50%, ${withAlpha(
            accentRight,
            0.85,
          )})`,
          opacity: 0.9,
        }}
      />

      <CornerBracket side="left" top={96} color={accentLeft} />
      <CornerBracket side="right" top={96} color={accentRight} />

      <Polygon
        points={6}
        radius={14}
        cornerRadius={4}
        fill={withAlpha(colors.bg.card, 0.72)}
        stroke={withAlpha(colors.text.secondary, 0.75)}
        strokeWidth={1.2}
        style={{
          position: "absolute",
          left: 540 - 14,
          top: 26,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 32,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 84,
            height: 1,
            backgroundColor: withAlpha(accentLeft, 0.7),
          }}
        />
        <div
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 13,
            fontWeight: 700,
            color: colors.text.secondary,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          {topLabel}
        </div>
        <div
          style={{
            width: 84,
            height: 1,
            backgroundColor: withAlpha(accentRight, 0.7),
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 126,
          left: 92,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: accentLeft,
            boxShadow: `0 0 14px ${withAlpha(accentLeft, 0.7)}`,
            opacity: pulse + 0.3,
          }}
        />
        <div
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 12,
            fontWeight: 700,
            color: colors.text.dim,
            letterSpacing: "0.16em",
          }}
        >
          AI VISUAL ENGINE
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 126,
          right: 92,
          fontFamily: fontFamily.mono,
          fontSize: 12,
          fontWeight: 700,
          color: colors.text.dim,
          letterSpacing: "0.16em",
        }}
      >
        4K MASTER PIPELINE
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 102,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${withAlpha(
              accentLeft,
              0.16,
            )}, ${withAlpha(colors.bg.card, 0.72)} 50%, ${withAlpha(
              accentRight,
              0.16,
            )})`,
            border: `1px solid ${withAlpha(colors.text.dim, 0.22)}`,
            boxShadow: `0 12px 34px ${withAlpha(colors.bg.primary, 0.45)}`,
          }}
        >
          <div
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 12,
              fontWeight: 700,
              color: colors.text.secondary,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {bottomLabel}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
