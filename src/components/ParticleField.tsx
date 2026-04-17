import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from "remotion";
import { colors } from "../lib/colors";

interface ParticleFieldProps {
  count?: number;
  colors?: string[];
  speed?: number;
  drift?: number;
  glowFilter?: string;
}

/** Deterministic pseudo-random hash — always produces the same value for a given n */
const hash = (n: number): number =>
  ((Math.sin(n * 127.1 + n * 311.7) * 43758.5453) % 1 + 1) % 1;

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  drift: number;
  color: string;
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 100,
  colors: particleColors,
  speed = 1,
  drift = 30,
  glowFilter,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const defaultColors = particleColors ?? [
    colors.text.dim,
    colors.accent.cyan,
    colors.accent.amber,
  ];

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      // Pick color: every 5th → cyan accent, every 7th → amber accent, rest → dim
      let color = defaultColors[0];
      if (i % 5 === 0) {
        color = defaultColors[1] ?? colors.accent.cyan;
      } else if (i % 7 === 0) {
        color = defaultColors[2] ?? colors.accent.amber;
      }

      return {
        x: hash(i) * width,
        y: hash(i + 1000) * height,
        size: 1.5 + hash(i + 2000) * 4,
        opacity: 0.1 + hash(i + 3000) * 0.25,
        speedX: (hash(i + 4000) - 0.5) * speed,
        speedY: (hash(i + 5000) - 0.5) * speed * 0.5,
        drift: hash(i + 6000) * drift,
        color,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, width, height, speed, drift]);

  return (
    <AbsoluteFill>
      <svg
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0 }}
        filter={glowFilter ? `url(#${glowFilter})` : undefined}
      >
        {particles.map((p, i) => {
          const cx =
            ((p.x + frame * p.speedX + Math.sin(frame * 0.008 + i) * p.drift) %
              (width + 20) +
              width +
              20) %
            (width + 20);
          const cy =
            ((p.y + frame * p.speedY + Math.cos(frame * 0.006 + i) * p.drift * 0.5) %
              (height + 20) +
              height +
              20) %
            (height + 20);

          const flicker = interpolate(
            Math.sin(frame * 0.04 + i * 0.7),
            [-1, 1],
            [p.opacity * 0.5, p.opacity],
          );

          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={p.size}
              fill={p.color}
              opacity={flicker}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
