import React from "react";
import { LightLeak } from "@remotion/light-leaks";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "../components/Background";
import { ChromeFrame } from "../components/ChromeFrame";
import { DataOrb3D } from "../components/DataOrb3D";
import { SoundLayer } from "../components/SoundLayer";
import { SvgFilters } from "../components/SvgFilters";
import { colors, withAlpha } from "../lib/colors";
import { fontFamily } from "../lib/fonts";
import { CLAMP, SPRING_CONFIGS, springIn } from "../lib/animation";
import { LINES } from "../generated/india_vs_pakistan_timing";
import { SFX, SFX_VOLUME, type SfxCue } from "../lib/sfx";

const INDIA = {
  name: "INDIA",
  flag: "🇮🇳",
  color: "#FF9933",
};

const PAKISTAN = {
  name: "PAKISTAN",
  flag: "🇵🇰",
  color: "#0B8457",
};

const ROUNDS = [
  {
    label: "Population",
    valueA: 1_450_935_791,
    valueB: 251_269_164,
    unit: "people",
    note: "India's population advantage is overwhelming.",
    narrative: "Scale advantage",
  },
  {
    label: "GDP",
    valueA: 3_909_891_533_858,
    valueB: 371_570_000_121,
    unit: "USD",
    note: "India's economy is roughly ten times larger.",
    narrative: "Economic power",
  },
  {
    label: "Land Area",
    valueA: 3_287_263,
    valueB: 881_913,
    unit: "km²",
    note: "More territory means more strategic depth.",
    narrative: "Strategic depth",
  },
  {
    label: "Life Expectancy",
    valueA: 72.235,
    valueB: 67.799,
    unit: "years",
    note: "A quieter but important edge for India.",
    narrative: "Human development",
  },
  {
    label: "Military Spending",
    valueA: 86_125_976_249,
    valueB: 10_165_952_756,
    unit: "USD",
    note: "This is where the spending gap becomes dramatic.",
    narrative: "Defense budget",
  },
  {
    label: "Internet Users",
    valueA: 70,
    valueB: 57.253,
    unit: "%",
    note: "India also leads in digital reach.",
    narrative: "Digital reach",
  },
  {
    label: "Nuclear Warheads",
    valueA: 172,
    valueB: 170,
    unit: "warheads",
    note: "Too close for comfort.",
    narrative: "Deterrence balance",
    closeCall: true,
  },
] as const;

const formatValue = (value: number, unit: string) => {
  if (unit === "USD") {
    if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(1)}T`;
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(0)}B`;
  }
  if (unit === "people") {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  }
  if (unit === "km²") {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  }
  if (unit === "years") {
    return value.toFixed(1);
  }
  if (unit === "%") {
    return `${value.toFixed(0)}%`;
  }
  return value.toLocaleString("en-US");
};

const buildSfxCues = (): SfxCue[] => {
  const cues: SfxCue[] = [
    { frame: 4, sfx: SFX.whoosh, volume: SFX_VOLUME.transition, duration: 28 },
    { frame: 18, sfx: SFX.reveal, volume: SFX_VOLUME.accent, duration: 38 },
  ];

  for (let i = 1; i < LINES.length - 1; i++) {
    cues.push({
      frame: Math.max(0, LINES[i].startFrame - 6),
      sfx: i === LINES.length - 2 ? SFX.chime : SFX.sweep,
      volume: i === LINES.length - 2 ? SFX_VOLUME.accent : SFX_VOLUME.subtle,
      duration: i === LINES.length - 2 ? 32 : 24,
    });
  }

  cues.push({
    frame: Math.max(0, LINES[LINES.length - 1].startFrame - 4),
    sfx: SFX.impact,
    volume: SFX_VOLUME.transition,
    duration: 44,
  });

  return cues;
};

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = springIn(frame, fps, 0, SPRING_CONFIGS.bouncy);
  const flagsSpring = springIn(frame, fps, 8, SPRING_CONFIGS.snappy);
  const subtitleSpring = springIn(frame, fps, 18, SPRING_CONFIGS.gentle);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.36,
        }}
      >
        <DataOrb3D
          accent={INDIA.color}
          secondary={PAKISTAN.color}
          opacity={0.75}
          scale={1.8}
          position={[0, 0.2, 0]}
        />
      </div>

      <div
        style={{
          width: 900,
          borderRadius: 36,
          padding: "48px 46px",
          background: `linear-gradient(180deg, ${withAlpha(
            colors.bg.card,
            0.74,
          )}, ${withAlpha(colors.bg.secondary, 0.82)})`,
          border: `1px solid ${withAlpha(colors.text.dim, 0.22)}`,
          boxShadow: `0 28px 60px ${withAlpha(colors.bg.primary, 0.55)}`,
          backdropFilter: "blur(16px)",
          transform: `scale(${interpolate(titleSpring, [0, 1], [0.86, 1], CLAMP)})`,
          opacity: titleSpring,
        }}
      >
        <div
          style={{
            fontFamily: fontFamily.mono,
            color: colors.text.secondary,
            fontSize: 18,
            letterSpacing: "0.2em",
            textAlign: "center",
            marginBottom: 22,
          }}
        >
          BY THE NUMBERS
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transform: `translateY(${interpolate(flagsSpring, [0, 1], [24, 0], CLAMP)}px)`,
              opacity: flagsSpring,
            }}
          >
            <div style={{ fontSize: 124 }}>{INDIA.flag}</div>
            <div
              style={{
                fontFamily: fontFamily.display,
                fontSize: 72,
                color: INDIA.color,
                letterSpacing: "0.06em",
              }}
            >
              INDIA
            </div>
          </div>

          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${withAlpha(
                colors.accent.purple,
                0.35,
              )}, ${withAlpha(colors.bg.card, 0.72)} 70%)`,
              border: `2px solid ${withAlpha(colors.accent.purple, 0.35)}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 34px ${withAlpha(colors.accent.purple, 0.28)}`,
              transform: `scale(${interpolate(flagsSpring, [0, 1], [0.6, 1], CLAMP)})`,
            }}
          >
            <div
              style={{
                fontFamily: fontFamily.display,
                fontSize: 66,
                color: colors.text.primary,
                letterSpacing: "0.08em",
              }}
            >
              VS
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transform: `translateY(${interpolate(flagsSpring, [0, 1], [24, 0], CLAMP)}px)`,
              opacity: flagsSpring,
            }}
          >
            <div style={{ fontSize: 124 }}>{PAKISTAN.flag}</div>
            <div
              style={{
                fontFamily: fontFamily.display,
                fontSize: 72,
                color: PAKISTAN.color,
                letterSpacing: "0.06em",
              }}
            >
              PAKISTAN
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            textAlign: "center",
            fontFamily: fontFamily.body,
            fontSize: 34,
            color: colors.text.primary,
            opacity: subtitleSpring,
            transform: `translateY(${interpolate(subtitleSpring, [0, 1], [14, 0], CLAMP)}px)`,
          }}
        >
          Who really comes out ahead?
        </div>
      </div>
    </AbsoluteFill>
  );
};

const MetricScene: React.FC<{ round: (typeof ROUNDS)[number]; roundIndex: number }> = ({
  round,
  roundIndex,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const intro = springIn(frame, fps, 0, SPRING_CONFIGS.snappy);
  const labelIn = springIn(frame, fps, 4, SPRING_CONFIGS.gentle);
  const panelIn = springIn(frame, fps, 10, SPRING_CONFIGS.bouncy);

  const max = Math.max(round.valueA, round.valueB);
  const widthA = (round.valueA / max) * 100;
  const widthB = (round.valueB / max) * 100;

  const isClose = "closeCall" in round && !!round.closeCall;
  const advantageText = isClose ? "TOO CLOSE" : "ADVANTAGE INDIA";
  const advantageColor = isClose ? colors.accent.purple : INDIA.color;

  return (
    <AbsoluteFill
      style={{
        padding: "220px 70px 160px",
        opacity: intro,
        transform: `translateY(${interpolate(intro, [0, 1], [30, 0], CLAMP)}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.22,
        }}
      >
        <DataOrb3D
          accent={roundIndex % 2 === 0 ? INDIA.color : PAKISTAN.color}
          secondary={colors.accent.purple}
          opacity={0.6}
          scale={1.55}
          position={[0, 0.05, 0]}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 26,
          opacity: labelIn,
        }}
      >
        <div
          style={{
            padding: "16px 28px",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${withAlpha(
              INDIA.color,
              0.18,
            )}, ${withAlpha(colors.bg.card, 0.82)} 50%, ${withAlpha(
              PAKISTAN.color,
              0.18,
            )})`,
            border: `1px solid ${withAlpha(colors.text.dim, 0.22)}`,
            boxShadow: `0 16px 30px ${withAlpha(colors.bg.primary, 0.4)}`,
          }}
        >
          <div
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: colors.text.secondary,
              textTransform: "uppercase",
            }}
          >
            {round.narrative}
          </div>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          fontFamily: fontFamily.display,
          fontSize: 90,
          color: colors.text.primary,
          letterSpacing: "0.04em",
          marginBottom: 28,
          opacity: labelIn,
          textShadow: `0 0 28px ${withAlpha(colors.text.primary, 0.18)}`,
        }}
      >
        {round.label}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 180px 1fr",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            borderRadius: 30,
            padding: "28px 28px 26px",
            background: `linear-gradient(180deg, ${withAlpha(
              INDIA.color,
              0.14,
            )}, ${withAlpha(colors.bg.card, 0.82)})`,
            border: `1px solid ${withAlpha(INDIA.color, 0.24)}`,
            boxShadow: `0 18px 40px ${withAlpha(colors.bg.primary, 0.35)}`,
            transform: `translateX(${interpolate(panelIn, [0, 1], [-44, 0], CLAMP)}px)`,
            opacity: panelIn,
          }}
        >
          <div style={{ fontSize: 84 }}>{INDIA.flag}</div>
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: 52,
              letterSpacing: "0.05em",
              color: INDIA.color,
              marginTop: 12,
            }}
          >
            INDIA
          </div>
          <div
            style={{
              marginTop: 22,
              fontFamily: fontFamily.numbers,
              fontSize: 64,
              fontWeight: 800,
              color: colors.text.primary,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatValue(round.valueA, round.unit)}
          </div>
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: 24,
              color: colors.text.secondary,
              marginTop: 14,
            }}
          >
            {round.unit === "USD" ? "latest estimate" : round.unit}
          </div>
          <div
            style={{
              marginTop: 28,
              height: 18,
              borderRadius: 999,
              backgroundColor: withAlpha(colors.text.dim, 0.14),
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${interpolate(panelIn, [0, 1], [0, widthA], CLAMP)}%`,
                height: "100%",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${withAlpha(INDIA.color, 0.25)}, ${INDIA.color})`,
                boxShadow: `0 0 18px ${withAlpha(INDIA.color, 0.4)}`,
              }}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${withAlpha(
                colors.accent.purple,
                0.35,
              )}, ${withAlpha(colors.bg.card, 0.8)} 72%)`,
              border: `2px solid ${withAlpha(colors.accent.purple, 0.32)}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 32px ${withAlpha(colors.accent.purple, 0.22)}`,
              transform: `scale(${interpolate(panelIn, [0, 1], [0.7, 1], CLAMP)})`,
              opacity: panelIn,
            }}
          >
            <div
              style={{
                fontFamily: fontFamily.display,
                fontSize: 42,
                color: colors.text.primary,
                letterSpacing: "0.08em",
              }}
            >
              VS
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: fontFamily.mono,
                fontSize: 16,
                color: advantageColor,
                letterSpacing: "0.14em",
              }}
            >
              {advantageText}
            </div>
          </div>
        </div>

        <div
          style={{
            borderRadius: 30,
            padding: "28px 28px 26px",
            background: `linear-gradient(180deg, ${withAlpha(
              PAKISTAN.color,
              0.14,
            )}, ${withAlpha(colors.bg.card, 0.82)})`,
            border: `1px solid ${withAlpha(PAKISTAN.color, 0.24)}`,
            boxShadow: `0 18px 40px ${withAlpha(colors.bg.primary, 0.35)}`,
            transform: `translateX(${interpolate(panelIn, [0, 1], [44, 0], CLAMP)}px)`,
            opacity: panelIn,
          }}
        >
          <div style={{ fontSize: 84, textAlign: "right" }}>{PAKISTAN.flag}</div>
          <div
            style={{
              fontFamily: fontFamily.display,
              fontSize: 52,
              letterSpacing: "0.05em",
              color: PAKISTAN.color,
              marginTop: 12,
              textAlign: "right",
            }}
          >
            PAKISTAN
          </div>
          <div
            style={{
              marginTop: 22,
              display: "flex",
              justifyContent: "flex-end",
              fontFamily: fontFamily.numbers,
              fontSize: 64,
              fontWeight: 800,
              color: colors.text.primary,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatValue(round.valueB, round.unit)}
          </div>
          <div
            style={{
              fontFamily: fontFamily.body,
              fontSize: 24,
              color: colors.text.secondary,
              marginTop: 14,
              textAlign: "right",
            }}
          >
            {round.unit === "USD" ? "latest estimate" : round.unit}
          </div>
          <div
            style={{
              marginTop: 28,
              height: 18,
              borderRadius: 999,
              backgroundColor: withAlpha(colors.text.dim, 0.14),
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${interpolate(panelIn, [0, 1], [0, widthB], CLAMP)}%`,
                height: "100%",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${withAlpha(PAKISTAN.color, 0.25)}, ${PAKISTAN.color})`,
                boxShadow: `0 0 18px ${withAlpha(PAKISTAN.color, 0.4)}`,
              }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 28,
          padding: "20px 26px",
          borderRadius: 24,
          background: `linear-gradient(180deg, ${withAlpha(
            colors.bg.card,
            0.78,
          )}, ${withAlpha(colors.bg.secondary, 0.76)})`,
          border: `1px solid ${withAlpha(advantageColor, 0.22)}`,
          boxShadow: `0 18px 34px ${withAlpha(colors.bg.primary, 0.34)}`,
        }}
      >
        <div
          style={{
            fontFamily: fontFamily.body,
            fontSize: 30,
            color: colors.text.primary,
            textAlign: "center",
          }}
        >
          {round.note}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FinalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const intro = springIn(frame, fps, 0, SPRING_CONFIGS.bouncy);
  const subtitle = springIn(frame, fps, 12, SPRING_CONFIGS.gentle);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.28,
        }}
      >
        <DataOrb3D
          accent={INDIA.color}
          secondary={PAKISTAN.color}
          opacity={0.68}
          scale={1.9}
          position={[0, 0.15, 0]}
        />
      </div>

      <div
        style={{
          width: 920,
          padding: "56px 54px",
          borderRadius: 40,
          background: `linear-gradient(180deg, ${withAlpha(
            colors.bg.card,
            0.76,
          )}, ${withAlpha(colors.bg.secondary, 0.84)})`,
          border: `1px solid ${withAlpha(colors.text.dim, 0.24)}`,
          boxShadow: `0 30px 70px ${withAlpha(colors.bg.primary, 0.6)}`,
          textAlign: "center",
          transform: `scale(${interpolate(intro, [0, 1], [0.82, 1], CLAMP)})`,
          opacity: intro,
        }}
      >
        <div
          style={{
            fontFamily: fontFamily.mono,
            color: colors.text.secondary,
            fontSize: 20,
            letterSpacing: "0.2em",
            marginBottom: 22,
          }}
        >
          FINAL TAKEAWAY
        </div>

        <div
          style={{
            fontFamily: fontFamily.display,
            fontSize: 90,
            color: colors.text.primary,
            letterSpacing: "0.04em",
            textShadow: `0 0 38px ${withAlpha(INDIA.color, 0.2)}`,
          }}
        >
          INDIA LEADS THE BIG NUMBERS
        </div>

        <div
          style={{
            marginTop: 26,
            fontFamily: fontFamily.body,
            fontSize: 34,
            color: colors.text.primary,
            opacity: subtitle,
            transform: `translateY(${interpolate(subtitle, [0, 1], [16, 0], CLAMP)}px)`,
          }}
        >
          But nuclear deterrence stays so close that the rivalry still matters.
        </div>

        <div
          style={{
            marginTop: 34,
            display: "flex",
            justifyContent: "center",
            gap: 18,
          }}
        >
          {[
            "Population",
            "GDP",
            "Land Area",
            "Life Expectancy",
            "Military Spending",
            "Internet",
          ].map((pill) => (
            <div
              key={pill}
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                background: withAlpha(INDIA.color, 0.12),
                border: `1px solid ${withAlpha(INDIA.color, 0.22)}`,
                fontFamily: fontFamily.mono,
                fontSize: 16,
                color: colors.text.primary,
                letterSpacing: "0.08em",
              }}
            >
              {pill.toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CaptionRail: React.FC = () => {
  const frame = useCurrentFrame();

  const activeLine =
    [...LINES]
      .reverse()
      .find((line) => frame >= line.startFrame && frame <= line.endFrame + 20) ??
    LINES[0];

  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 138,
        padding: "18px 22px",
        borderRadius: 24,
        background: `linear-gradient(90deg, ${withAlpha(
          INDIA.color,
          0.12,
        )}, ${withAlpha(colors.bg.card, 0.84)} 50%, ${withAlpha(
          PAKISTAN.color,
          0.12,
        )})`,
        border: `1px solid ${withAlpha(colors.text.dim, 0.18)}`,
        boxShadow: `0 16px 32px ${withAlpha(colors.bg.primary, 0.34)}`,
      }}
    >
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: 28,
          color: colors.text.primary,
          textAlign: "center",
          lineHeight: 1.25,
        }}
      >
        {activeLine.text}
      </div>
    </div>
  );
};

export const IndiaVsPakistanOriginal: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background variant="versus" colorA={INDIA.color} colorB={PAKISTAN.color} />
      <SvgFilters />

      <SoundLayer
        narrationSrc={staticFile("audio/india_vs_pakistan_narration.mp3")}
        ambientSrc={SFX.ambient}
        sfxCues={buildSfxCues()}
      />

      <LightLeak
        durationInFrames={28}
        seed={6}
        hueShift={18}
        style={{ opacity: 0.16, mixBlendMode: "screen" }}
      />
      <LightLeak
        from={LINES[7].startFrame - 8}
        durationInFrames={34}
        seed={18}
        hueShift={330}
        style={{ opacity: 0.18, mixBlendMode: "screen" }}
      />

      <Sequence from={0} durationInFrames={LINES[0].endFrame + 20}>
        <IntroScene />
      </Sequence>

      {ROUNDS.map((round, index) => {
        const timing = LINES[index + 1];
        return (
          <Sequence
            key={round.label}
            from={timing.startFrame}
            durationInFrames={timing.endFrame - timing.startFrame + 12}
          >
            <MetricScene round={round} roundIndex={index} />
          </Sequence>
        );
      })}

      <Sequence
        from={LINES[8].startFrame}
        durationInFrames={LINES[8].endFrame - LINES[8].startFrame + 12}
      >
        <FinalScene />
      </Sequence>

      <CaptionRail />

      <ChromeFrame
        topLabel="DATAVAULT // ORIGINAL BUILD"
        bottomLabel="INDIA × PAKISTAN"
        accentLeft={INDIA.color}
        accentRight={PAKISTAN.color}
      />
    </AbsoluteFill>
  );
};
