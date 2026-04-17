import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { colors } from "../lib/colors";

interface DataOrb3DProps {
  accent?: string;
  secondary?: string;
  opacity?: number;
  scale?: number;
  position?: [number, number, number];
}

const OrbScene: React.FC<{
  accent: string;
  secondary: string;
  opacity: number;
  scale: number;
  position: [number, number, number];
}> = ({ accent, secondary, opacity, scale, position }) => {
  const frame = useCurrentFrame();

  const nodes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const theta = (index / 18) * Math.PI * 2;
        const radius = 1.65 + (index % 4) * 0.16;
        return {
          position: [
            Math.cos(theta) * radius,
            Math.sin(theta * 1.7) * 0.9,
            Math.sin(theta) * 1.2,
          ] as [number, number, number],
          size: 0.045 + (index % 3) * 0.02,
          color: index % 2 === 0 ? accent : secondary,
        };
      }),
    [accent, secondary],
  );

  const rotationY = frame * 0.018;
  const rotationX = Math.sin(frame * 0.015) * 0.24;
  const ringTilt = Math.sin(frame * 0.02) * 0.6;

  return (
    <>
      <ambientLight intensity={0.65} />
      <pointLight position={[2, 2, 4]} intensity={2.6} color={accent} />
      <pointLight position={[-3, -1, 2]} intensity={1.5} color={secondary} />

      <group
        position={position}
        rotation={[rotationX, rotationY, 0]}
        scale={scale}
      >
        <mesh>
          <icosahedronGeometry args={[1.42, 1]} />
          <meshStandardMaterial
            color={accent}
            wireframe
            transparent
            opacity={0.33 * opacity}
            emissive={accent}
            emissiveIntensity={0.8}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2.3, ringTilt, frame * 0.01]}>
          <torusGeometry args={[1.95, 0.038, 16, 120]} />
          <meshStandardMaterial
            color={secondary}
            transparent
            opacity={0.72 * opacity}
            emissive={secondary}
            emissiveIntensity={1.3}
          />
        </mesh>

        <mesh rotation={[Math.PI / 1.6, -ringTilt * 0.8, -frame * 0.012]}>
          <torusGeometry args={[1.68, 0.018, 12, 100]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.32 * opacity}
            emissive="#ffffff"
            emissiveIntensity={0.45}
          />
        </mesh>

        <mesh>
          <sphereGeometry args={[0.88, 48, 48]} />
          <meshPhysicalMaterial
            color={new THREE.Color(accent).offsetHSL(0.02, -0.08, -0.08)}
            transparent
            opacity={0.22 * opacity}
            emissive={accent}
            emissiveIntensity={0.55}
            roughness={0.18}
            metalness={0.48}
            clearcoat={1}
            clearcoatRoughness={0.15}
          />
        </mesh>

        {nodes.map((node, index) => (
          <mesh
            key={index}
            position={node.position}
            rotation={[frame * 0.01 + index, frame * 0.02, 0]}
          >
            <sphereGeometry args={[node.size, 16, 16]} />
            <meshStandardMaterial
              color={node.color}
              emissive={node.color}
              emissiveIntensity={1.4}
              transparent
              opacity={opacity}
            />
          </mesh>
        ))}
      </group>
    </>
  );
};

export const DataOrb3D: React.FC<DataOrb3DProps> = ({
  accent = colors.accent.cyan,
  secondary = colors.accent.purple,
  opacity = 0.9,
  scale = 1,
  position = [0, 0, 0],
}) => {
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    >
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 6.8], fov: 42 }}
        gl={{ alpha: true, antialias: true }}
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#050714", 6, 14]} />
        <OrbScene
          accent={accent}
          secondary={secondary}
          opacity={opacity}
          scale={scale}
          position={position}
        />
      </ThreeCanvas>
    </div>
  );
};
