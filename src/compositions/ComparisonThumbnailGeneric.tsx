import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import { Background } from "../components/Background";
import { ChromeFrame } from "../components/ChromeFrame";
import { DataOrb3D } from "../components/DataOrb3D";
import { SvgFilters } from "../components/SvgFilters";

type CountryThumbProps = {
  mode: "country";
  title: string;
  subtitle?: string;
  countryA: string;
  countryB: string;
  flagA: string;
  flagB: string;
  colorA: string;
  colorB: string;
  stats: Array<{
    label: string;
    valueA: number;
    valueB: number;
    unit?: string;
  }>;
};

type SizeThumbProps = {
  mode: "size";
  title: string;
  subtitle?: string;
  items: Array<{
    name: string;
    size: number;
    unit?: string;
    color?: string;
  }>;
};

export type ComparisonThumbnailProps = CountryThumbProps | SizeThumbProps;

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-US");
};

const StatChip: React.FC<{ text: string; accent: string }> = ({ text, accent }) => (
  <div
    style={{
      padding: "14px 22px",
      borderRadius: 999,
      background: `linear-gradient(90deg, ${withAlpha(accent, 0.18)}, ${withAlpha(
        colors.bg.card,
        0.8,
      )})`,
      border: `1px solid ${withAlpha(accent, 0.28)}`,
      boxShadow: `0 12px 24px ${withAlpha(colors.bg.primary, 0.35)}`,
      fontFamily: fontFamily.mono,
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: "0.08em",
      color: colors.text.primary,
      textTransform: "uppercase",
    }}
  >
    {text}
  </div>
);

const CountryThumbnail: React.FC<CountryThumbProps> = (props) => {
  const frame = useCurrentFrame();
  const headlineGlow = interpolate(Math.sin(frame * 0.04), [-1, 1], [0.25, 0.55]);
  const primaryStat = props.stats[0];
  const secondaryStat = props.stats[1] ?? primaryStat;

  return (
    <>
      <Background variant="versus" colorA={props.colorA} colorB={props.colorB} />
      <SvgFilters />
      <div style={{ position: "absolute", inset: 0, opacity: 0.38 }}>
        <DataOrb3D
          accent={props.colorA}
          secondary={props.colorB}
          opacity={0.42}
          scale={1.75}
          position={[0, 0.25, 0]}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 84,
          left: 92,
          right: 92,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 24,
              fontWeight: 700,
              color: colors.text.secondary,
              letterSpacing: "0.16em",
              marginBottom: 16,
            }}
          >
            DATAVAULT BREAKDOWN
          </div>
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: 98,
              lineHeight: 0.92,
              color: colors.text.primary,
              letterSpacing: "0.03em",
              textShadow: `0 0 42px ${withAlpha(colors.accent.cyan, headlineGlow)}`,
              maxWidth: 780,
            }}
          >
            {props.title}
          </div>
          {props.subtitle ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: fontFamily.body,
              fontSize: 28,
              color: colors.text.secondary,
              letterSpacing: "0.03em",
            }}
          >
            {props.subtitle}
          </div>
        ) : null}
        </div>

        <StatChip text={primaryStat.label} accent={colors.accent.purple} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 92,
          right: 92,
          top: 250,
          display: "grid",
          gridTemplateColumns: "1fr 220px 1fr",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            borderRadius: 34,
            padding: "30px 34px",
            background: `linear-gradient(180deg, ${withAlpha(
              props.colorA,
              0.16,
            )}, ${withAlpha(colors.bg.card, 0.82)})`,
            border: `1px solid ${withAlpha(props.colorA, 0.35)}`,
            boxShadow: `0 24px 50px ${withAlpha(colors.bg.primary, 0.42)}`,
          }}
        >
          <div style={{ fontSize: 110, marginBottom: 10 }}>{props.flagA}</div>
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: 70,
              color: props.colorA,
              letterSpacing: "0.05em",
            }}
          >
            {props.countryA}
          </div>
          <div
            style={{
              marginTop: 22,
              fontFamily: fontFamily.numbers,
              fontSize: 88,
              fontWeight: 800,
              color: colors.text.primary,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCompact(primaryStat.valueA)}
          </div>
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: 24,
              color: colors.text.secondary,
              marginTop: 6,
            }}
          >
            {primaryStat.label}
          </div>
          <div
            style={{
              marginTop: 12,
              width: "100%",
              height: 14,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${props.colorA}, ${withAlpha(
                props.colorA,
                0.2,
              )})`,
            }}
          />
        </div>

        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: "50%",
            margin: "0 auto",
            background: `radial-gradient(circle, ${withAlpha(
              colors.accent.purple,
              0.34,
            )} 0%, ${withAlpha(colors.bg.card, 0.84)} 70%)`,
            border: `2px solid ${withAlpha(colors.accent.purple, 0.42)}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 36px ${withAlpha(colors.accent.purple, 0.26)}`,
          }}
        >
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: 58,
              color: colors.text.primary,
              letterSpacing: "0.06em",
            }}
          >
            VS
          </div>
          <div
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 18,
              color: colors.text.secondary,
              letterSpacing: "0.14em",
            }}
          >
            AI SCORECARD
          </div>
        </div>

        <div
          style={{
            borderRadius: 34,
            padding: "30px 34px",
            background: `linear-gradient(180deg, ${withAlpha(
              props.colorB,
              0.16,
            )}, ${withAlpha(colors.bg.card, 0.82)})`,
            border: `1px solid ${withAlpha(props.colorB, 0.35)}`,
            boxShadow: `0 24px 50px ${withAlpha(colors.bg.primary, 0.42)}`,
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 110, marginBottom: 10 }}>{props.flagB}</div>
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: 70,
              color: props.colorB,
              letterSpacing: "0.05em",
            }}
          >
            {props.countryB}
          </div>
          <div
            style={{
              marginTop: 22,
              fontFamily: fontFamily.numbers,
              fontSize: 88,
              fontWeight: 800,
              color: colors.text.primary,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatCompact(primaryStat.valueB)}
          </div>
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: 24,
              color: colors.text.secondary,
              marginTop: 6,
            }}
          >
            {primaryStat.unit ?? primaryStat.label}
          </div>
          <div
            style={{
              marginTop: 12,
              width: "100%",
              height: 14,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${withAlpha(
                props.colorB,
                0.2,
              )}, ${props.colorB})`,
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 92,
          right: 92,
          bottom: 120,
          display: "flex",
          gap: 18,
          justifyContent: "space-between",
        }}
      >
        <StatChip text={secondaryStat.label} accent={props.colorA} />
        <StatChip text="SHORTS / DATA / COMPARISON" accent={props.colorB} />
      </div>

      <ChromeFrame
        topLabel="DATAVAULT // THUMBNAIL SYSTEM"
        bottomLabel={`${props.countryA} × ${props.countryB}`}
        accentLeft={props.colorA}
        accentRight={props.colorB}
      />
    </>
  );
};

const SizeThumbnail: React.FC<SizeThumbProps> = (props) => {
  const sorted = useMemo(() => [...props.items].sort((a, b) => b.size - a.size), [props.items]);
  const hero = sorted[0];
  const supporting = sorted.slice(1, 4);

  return (
    <>
      <Background variant="cinematic" />
      <SvgFilters />
      <div style={{ position: "absolute", inset: 0, opacity: 0.3 }}>
        <DataOrb3D
          accent={hero?.color ?? colors.accent.purple}
          secondary={supporting[0]?.color ?? colors.accent.cyan}
          opacity={0.36}
          scale={1.95}
          position={[0.1, 0.2, 0]}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 88,
          left: 92,
          right: 92,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <div
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 24,
              fontWeight: 700,
              color: colors.accent.amber,
              letterSpacing: "0.16em",
              marginBottom: 16,
            }}
          >
            DATAVAULT SCALE INDEX
          </div>
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: 98,
              lineHeight: 0.92,
              color: colors.text.primary,
              letterSpacing: "0.03em",
              maxWidth: 780,
            }}
          >
            {props.title}
          </div>
          {props.subtitle ? (
            <div
              style={{
                marginTop: 18,
                fontFamily: fontFamily.body,
                fontSize: 28,
                color: colors.text.secondary,
              }}
            >
              {props.subtitle}
            </div>
          ) : null}
        </div>
        <StatChip text={hero.name.toUpperCase()} accent={hero.color ?? colors.accent.purple} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 84,
          right: 84,
          top: 248,
          bottom: 168,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 26,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 360,
              height: 360,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 35%, ${withAlpha(
                hero.color ?? colors.accent.purple,
                0.95,
              )}, ${withAlpha(hero.color ?? colors.accent.purple, 0.34)} 65%, transparent 100%)`,
              border: `4px solid ${withAlpha(hero.color ?? colors.accent.purple, 0.85)}`,
              boxShadow: `0 0 60px ${withAlpha(hero.color ?? colors.accent.purple, 0.35)}`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 92,
                left: 0,
                width: "100%",
                textAlign: "center",
                fontFamily: fontFamily.display,
                fontSize: 60,
                color: colors.text.primary,
                letterSpacing: "0.05em",
              }}
            >
              {hero.name.toUpperCase()}
            </div>
            <div
              style={{
                position: "absolute",
                top: 170,
                left: 0,
                width: "100%",
                textAlign: "center",
                fontFamily: fontFamily.numbers,
                fontSize: 62,
                fontWeight: 800,
                color: colors.text.primary,
              }}
            >
              {formatCompact(hero.size)}
            </div>
            <div
              style={{
                position: "absolute",
                top: 236,
                left: 0,
                width: "100%",
                textAlign: "center",
                fontFamily: fontFamily.body,
                fontSize: 26,
                color: colors.text.secondary,
              }}
            >
              {hero.unit ?? "units"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {supporting.map((item, index) => (
            <div
              key={item.name}
              style={{
                padding: "24px 28px",
                borderRadius: 28,
                background: `linear-gradient(180deg, ${withAlpha(
                  item.color ?? colors.accent.cyan,
                  0.14,
                )}, ${withAlpha(colors.bg.card, 0.82)})`,
                border: `1px solid ${withAlpha(item.color ?? colors.accent.cyan, 0.3)}`,
              }}
            >
              <div
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: 46,
                  color: colors.text.primary,
                  letterSpacing: "0.04em",
                }}
              >
                #{index + 2} {item.name.toUpperCase()}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontFamily: fontFamily.numbers,
                  fontSize: 44,
                  color: item.color ?? colors.accent.cyan,
                }}
              >
                {formatCompact(item.size)} {item.unit}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 92,
          right: 92,
          bottom: 120,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <StatChip text="AI-BUILT VISUAL COMPARISON" accent={hero.color ?? colors.accent.purple} />
        <StatChip text="RANKED LARGEST TO SMALLEST" accent={supporting[0]?.color ?? colors.accent.cyan} />
      </div>

      <ChromeFrame
        topLabel="DATAVAULT // THUMBNAIL SYSTEM"
        bottomLabel={props.subtitle ?? "SIZE COMPARISON"}
        accentLeft={supporting[0]?.color ?? colors.accent.cyan}
        accentRight={hero.color ?? colors.accent.purple}
      />
    </>
  );
};

export const ComparisonThumbnailGeneric: React.FC<ComparisonThumbnailProps> = (props) => {
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        width,
        height,
        overflow: "hidden",
      }}
    >
      {props.mode === "country" ? (
        <CountryThumbnail {...props} />
      ) : (
        <SizeThumbnail {...props} />
      )}
    </AbsoluteFill>
  );
};
