import React, { useMemo } from "react";
import { CameraMotionBlur } from "@remotion/motion-blur";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { colors, gradients, withAlpha } from "../lib/colors";
import { ParticleField } from "./ParticleField";

interface BackgroundProps {
  variant?: "grid" | "particles" | "gradient" | "cinematic" | "versus";
  /** Left side color for versus variant */
  colorA?: string;
  /** Right side color for versus variant */
  colorB?: string;
}

/* ------------------------------------------------------------------ */
/*  Shared vignette overlay                                           */
/* ------------------------------------------------------------------ */
const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background: gradients.vignette,
      pointerEvents: "none",
    }}
  />
);

const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "repeating-linear-gradient(180deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 4px)",
      opacity: 0.08,
      mixBlendMode: "screen",
      pointerEvents: "none",
    }}
  />
);

/* ------------------------------------------------------------------ */
/*  Grid variant — glowing intersections with animated pulse          */
/* ------------------------------------------------------------------ */
const GridBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const spacing = 60;
  const cols = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / spacing) + 1;

  const dots = useMemo(() => {
    const result: { x: number; y: number; phase: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result.push({ x: c * spacing, y: r * spacing, phase: (c + r) * 0.3 });
      }
    }
    return result;
  }, [cols, rows, spacing]);

  // Horizontal and vertical grid lines
  const lines = useMemo(() => {
    const h: number[] = [];
    const v: number[] = [];
    for (let r = 0; r < rows; r++) h.push(r * spacing);
    for (let c = 0; c < cols; c++) v.push(c * spacing);
    return { h, v };
  }, [cols, rows, spacing]);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg.primary }}>
      <svg width={width} height={height}>
        {/* Grid lines */}
        {lines.h.map((y, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke={colors.text.dim}
            strokeWidth={0.5}
            opacity={0.12}
          />
        ))}
        {lines.v.map((x, i) => (
          <line
            key={`v-${i}`}
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke={colors.text.dim}
            strokeWidth={0.5}
            opacity={0.12}
          />
        ))}

        {/* Glowing intersection dots */}
        {dots.map((dot, i) => {
          const pulse = interpolate(
            Math.sin(frame * 0.03 + dot.phase),
            [-1, 1],
            [0.15, 0.55],
          );
          const glowRadius = interpolate(
            Math.sin(frame * 0.03 + dot.phase),
            [-1, 1],
            [4, 8],
          );
          return (
            <React.Fragment key={i}>
              {/* Glow halo */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={glowRadius}
                fill={colors.accent.cyan}
                opacity={pulse * 0.15}
              />
              {/* Core dot */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={2}
                fill={colors.text.dim}
                opacity={pulse}
              />
            </React.Fragment>
          );
        })}
      </svg>
      <Vignette />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Particles variant — depth layers + colored accents                */
/* ------------------------------------------------------------------ */
const ParticlesBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // 3 large blurred depth circles drifting slowly
  const depthCircles = useMemo(
    () => [
      { cx: width * 0.25, cy: height * 0.3, r: 180, color: colors.accent.cyan, speed: 0.003 },
      { cx: width * 0.7, cy: height * 0.6, r: 220, color: colors.accent.purple, speed: 0.004 },
      { cx: width * 0.5, cy: height * 0.8, r: 160, color: colors.accent.amber, speed: 0.002 },
    ],
    [width, height],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg.primary }}>
      <CameraMotionBlur shutterAngle={100} samples={6}>
        {/* Depth layer — large soft blurred circles */}
        <svg width={width} height={height} style={{ position: "absolute" }}>
          <defs>
            <filter id="depth-blur">
              <feGaussianBlur stdDeviation="60" />
            </filter>
          </defs>
          {depthCircles.map((c, i) => {
            const dx = Math.sin(frame * c.speed + i * 2) * 80;
            const dy = Math.cos(frame * c.speed * 0.7 + i * 3) * 50;
            return (
              <circle
                key={i}
                cx={c.cx + dx}
                cy={c.cy + dy}
                r={c.r}
                fill={c.color}
                opacity={0.18}
                filter="url(#depth-blur)"
              />
            );
          })}
        </svg>

        {/* Foreground particle field */}
        <ParticleField count={120} speed={0.8} drift={25} />
      </CameraMotionBlur>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Gradient variant — overlapping radial gradients orbiting slowly   */
/* ------------------------------------------------------------------ */
const GradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cx1 = interpolate(Math.sin(frame * 0.008), [-1, 1], [width * 0.3, width * 0.7]);
  const cy1 = interpolate(Math.cos(frame * 0.006), [-1, 1], [height * 0.3, height * 0.7]);
  const cx2 = interpolate(Math.sin(frame * 0.01 + 2), [-1, 1], [width * 0.2, width * 0.8]);
  const cy2 = interpolate(Math.cos(frame * 0.007 + 2), [-1, 1], [height * 0.2, height * 0.8]);
  const cx3 = interpolate(Math.sin(frame * 0.005 + 4), [-1, 1], [width * 0.4, width * 0.6]);
  const cy3 = interpolate(Math.cos(frame * 0.009 + 4), [-1, 1], [height * 0.4, height * 0.6]);
  const cx4 = interpolate(Math.sin(frame * 0.012 + 6), [-1, 1], [width * 0.1, width * 0.9]);
  const cy4 = interpolate(Math.cos(frame * 0.004 + 6), [-1, 1], [height * 0.3, height * 0.7]);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg.primary }}>
      <CameraMotionBlur shutterAngle={90} samples={5}>
        <svg width={width} height={height}>
          <defs>
            <radialGradient id="bg-grad-1" cx={cx1 / width} cy={cy1 / height} r="0.6">
              <stop offset="0%" stopColor={colors.accent.cyan} stopOpacity={0.08} />
              <stop offset="100%" stopColor={colors.bg.primary} stopOpacity={0} />
            </radialGradient>
            <radialGradient id="bg-grad-2" cx={cx2 / width} cy={cy2 / height} r="0.5">
              <stop offset="0%" stopColor={colors.accent.purple} stopOpacity={0.06} />
              <stop offset="100%" stopColor={colors.bg.primary} stopOpacity={0} />
            </radialGradient>
            <radialGradient id="bg-grad-3" cx={cx3 / width} cy={cy3 / height} r="0.45">
              <stop offset="0%" stopColor={colors.accent.amber} stopOpacity={0.05} />
              <stop offset="100%" stopColor={colors.bg.primary} stopOpacity={0} />
            </radialGradient>
            <radialGradient id="bg-grad-4" cx={cx4 / width} cy={cy4 / height} r="0.55">
              <stop offset="0%" stopColor={colors.accent.green} stopOpacity={0.04} />
              <stop offset="100%" stopColor={colors.bg.primary} stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect width={width} height={height} fill="url(#bg-grad-1)" />
          <rect width={width} height={height} fill="url(#bg-grad-2)" />
          <rect width={width} height={height} fill="url(#bg-grad-3)" />
          <rect width={width} height={height} fill="url(#bg-grad-4)" />
        </svg>
      </CameraMotionBlur>

      {/* Subtle noise-like pattern via tiny dots */}
      <svg width={width} height={height} style={{ position: "absolute", opacity: 0.03 }}>
        {Array.from({ length: 200 }, (_, i) => {
          const nx = ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1;
          const ny = ((Math.sin(i * 311.7) * 43758.5453) % 1 + 1) % 1;
          return (
            <circle
              key={i}
              cx={nx * width}
              cy={ny * height}
              r={1}
              fill="#ffffff"
            />
          );
        })}
      </svg>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Cinematic variant — Ken Burns zoom + particles                    */
/* ------------------------------------------------------------------ */
const CinematicBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Slow Ken Burns zoom: scale from 1.0 to 1.15 over the full duration
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow drift of the gradient focal point
  const translateX = interpolate(
    Math.sin(frame * 0.002),
    [-1, 1],
    [-3, 3],
  );
  const translateY = interpolate(
    Math.cos(frame * 0.0015),
    [-1, 1],
    [-2, 2],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg.primary }}>
      {/* Ken Burns layer with radial gradient */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
          background: [
            gradients.deepSpace,
            gradients.cyanSpot,
            gradients.amberSpot,
            gradients.purpleHaze,
          ].join(", "),
        }}
      />

      <CameraMotionBlur shutterAngle={80} samples={5}>
        {/* Particle overlay */}
        <ParticleField count={80} speed={0.5} drift={20} />
      </CameraMotionBlur>
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Versus variant — split-color rivalry background                   */
/* ------------------------------------------------------------------ */
const VersusBackground: React.FC<{ colorA: string; colorB: string }> = ({
  colorA,
  colorB,
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  // Slow breathing pulse on the light pools
  const pulseA = interpolate(Math.sin(frame * 0.015), [-1, 1], [0.85, 1.0]);
  const pulseB = interpolate(Math.sin(frame * 0.015 + Math.PI), [-1, 1], [0.85, 1.0]);

  // Slow Ken Burns drift
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Deterministic floating geometric shapes for depth
  const shapes = useMemo(() => {
    const hash = (n: number) => ((Math.sin(n * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;
    return Array.from({ length: 12 }, (_, i) => ({
      x: hash(i * 17) * width,
      y: hash(i * 31) * height,
      size: 30 + hash(i * 47) * 80,
      rotation: hash(i * 61) * 360,
      speed: 0.001 + hash(i * 73) * 0.003,
      drift: 20 + hash(i * 89) * 40,
      side: i < 6 ? "left" : "right",
      opacity: 0.03 + hash(i * 97) * 0.06,
    }));
  }, [width, height]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#050714" }}>
      {/* Base gradient — deeper than default */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          background: "linear-gradient(180deg, #060820 0%, #08092A 40%, #0A0B1E 100%)",
        }}
      />

      <CameraMotionBlur shutterAngle={95} samples={6}>
        {/* Left side — Country A color pool */}
        <svg width={width} height={height} style={{ position: "absolute" }}>
          <defs>
            <filter id="versus-blur-a">
              <feGaussianBlur stdDeviation="100" />
            </filter>
            <filter id="versus-blur-b">
              <feGaussianBlur stdDeviation="100" />
            </filter>
            <filter id="shape-blur">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Large color pool — left side */}
          <ellipse
            cx={width * 0.2}
            cy={height * 0.35}
            rx={width * 0.45}
            ry={height * 0.4}
            fill={colorA}
            opacity={0.20 * pulseA}
            filter="url(#versus-blur-a)"
          />
          {/* Secondary pool — left bottom */}
          <ellipse
            cx={width * 0.15}
            cy={height * 0.75}
            rx={width * 0.3}
            ry={height * 0.25}
            fill={colorA}
            opacity={0.10 * pulseA}
            filter="url(#versus-blur-a)"
          />

          {/* Large color pool — right side */}
          <ellipse
            cx={width * 0.8}
            cy={height * 0.35}
            rx={width * 0.45}
            ry={height * 0.4}
            fill={colorB}
            opacity={0.20 * pulseB}
            filter="url(#versus-blur-b)"
          />
          {/* Secondary pool — right bottom */}
          <ellipse
            cx={width * 0.85}
            cy={height * 0.75}
            rx={width * 0.3}
            ry={height * 0.25}
            fill={colorB}
            opacity={0.10 * pulseB}
            filter="url(#versus-blur-b)"
          />

          {/* Center blend — subtle purple where colors meet */}
          <ellipse
            cx={width * 0.5}
            cy={height * 0.5}
            rx={width * 0.2}
            ry={height * 0.35}
            fill={colors.accent.purple}
            opacity={0.08}
            filter="url(#versus-blur-a)"
          />

          {/* Floating geometric shapes for depth */}
          {shapes.map((s, i) => {
            const dx = Math.sin(frame * s.speed + i) * s.drift;
            const dy = Math.cos(frame * s.speed * 0.7 + i * 2) * s.drift * 0.6;
            const rot = s.rotation + frame * s.speed * 15;
            const shapeColor = s.side === "left" ? colorA : colorB;
            return (
              <g
                key={i}
                transform={`translate(${s.x + dx}, ${s.y + dy}) rotate(${rot})`}
                opacity={s.opacity}
                filter="url(#shape-blur)"
              >
                {i % 3 === 0 ? (
                  <polygon
                    points={Array.from({ length: 6 }, (_, j) => {
                      const angle = (Math.PI / 3) * j - Math.PI / 6;
                      return `${Math.cos(angle) * s.size},${Math.sin(angle) * s.size}`;
                    }).join(" ")}
                    fill="none"
                    stroke={shapeColor}
                    strokeWidth={1.5}
                  />
                ) : i % 3 === 1 ? (
                  <polygon
                    points={`0,${-s.size} ${s.size * 0.6},0 0,${s.size} ${-s.size * 0.6},0`}
                    fill="none"
                    stroke={shapeColor}
                    strokeWidth={1.5}
                  />
                ) : (
                  <circle r={s.size * 0.5} fill="none" stroke={shapeColor} strokeWidth={1.5} />
                )}
              </g>
            );
          })}
        </svg>

        {/* Particles across both sides */}
        <ParticleField
          count={90}
          speed={0.4}
          drift={15}
          colors={[colorA, colorB, colors.accent.purple, "#ffffff"]}
        />
      </CameraMotionBlur>

      {/* Dividing line — subtle vertical glow in center */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 2,
          height: "100%",
          background: `linear-gradient(180deg, transparent 5%, ${withAlpha(colors.accent.purple, 0.15)} 30%, ${withAlpha(colors.accent.purple, 0.25)} 50%, ${withAlpha(colors.accent.purple, 0.15)} 70%, transparent 95%)`,
          transform: "translateX(-50%)",
        }}
      />

      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Main export                                                       */
/* ------------------------------------------------------------------ */
export const Background: React.FC<BackgroundProps> = ({
  variant = "particles",
  colorA = colors.accent.cyan,
  colorB = colors.accent.amber,
}) => {
  switch (variant) {
    case "grid":
      return <GridBackground />;
    case "particles":
      return <ParticlesBackground />;
    case "gradient":
      return <GradientBackground />;
    case "cinematic":
      return <CinematicBackground />;
    case "versus":
      return <VersusBackground colorA={colorA} colorB={colorB} />;
    default:
      return <ParticlesBackground />;
  }
};
