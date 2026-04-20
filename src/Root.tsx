import React from "react";
import { Composition } from "remotion";
import { BarChartRaceVideo } from "./compositions/BarChartRaceVideo";
import { SizeComparisonShort } from "./compositions/SizeComparisonShort";
import { CountryVsShort } from "./compositions/CountryVsShort";
import { CountryVsVideo } from "./compositions/CountryVsVideo";
import { IndiaVsPakistanOriginal } from "./compositions/IndiaVsPakistanOriginal";
import { SizeComparisonVideo } from "./compositions/SizeComparisonVideo";
import { CountryVsShortGeneric } from "./compositions/CountryVsShortGeneric";
import { SizeComparisonShortGeneric } from "./compositions/SizeComparisonShortGeneric";
import { ComparisonThumbnailGeneric } from "./compositions/ComparisonThumbnailGeneric";
import { GreatConvergenceLong } from "./compositions/GreatConvergenceLong";
import { TOTAL_DURATION_FRAMES as INDIA_PAKISTAN_DURATION } from "./generated/india_vs_pakistan_timing";

export const Root: React.FC = () => {
  return (
    <>
      {/* Long-form: bar chart race (landscape 1920x1080, 30fps) */}
      <Composition
        id="BarChartRaceVideo"
        component={BarChartRaceVideo}
        durationInFrames={3600}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Long-form: country comparison (landscape 1920x1080, 30fps) */}
      <Composition
        id="CountryVsVideo"
        component={CountryVsVideo}
        durationInFrames={2700}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Long-form: size comparison (landscape 1920x1080, 30fps) */}
      <Composition
        id="SizeComparisonVideo"
        component={SizeComparisonVideo}
        durationInFrames={2400}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Long-form: The Great Convergence — GDP per capita PPP bar chart race (~8 min) */}
      <Composition
        id="GreatConvergenceLong"
        component={GreatConvergenceLong}
        durationInFrames={14400}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Short: size comparison (portrait 1080x1920, 30fps) */}
      <Composition
        id="SizeComparisonShort"
        component={SizeComparisonShort}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* Short: country vs country (portrait 1080x1920, 30fps) */}
      <Composition
        id="CountryVsShort"
        component={CountryVsShort}
        durationInFrames={2450}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="IndiaVsPakistanOriginal"
        component={IndiaVsPakistanOriginal}
        durationInFrames={INDIA_PAKISTAN_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* Generic: country vs country — driven by inputProps */}
      <Composition
        id="CountryVsShortGeneric"
        component={CountryVsShortGeneric as React.FC}
        durationInFrames={2700}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          countryA: "USA",
          countryB: "CHINA",
          flagA: "\uD83C\uDDFA\uD83C\uDDF8",
          flagB: "\uD83C\uDDE8\uD83C\uDDF3",
          colorA: "#00E5FF",
          colorB: "#FFB800",
          stats: [
            { label: "Population", valueA: 340_000_000, valueB: 1_410_000_000, unit: "people", higherIsBetter: true },
            { label: "GDP", valueA: 28_780_000_000_000, valueB: 18_530_000_000_000, unit: "USD", higherIsBetter: true },
          ],
          narrationSrc: "audio/usa_vs_china_narration.wav",
          timingLines: [
            { index: 0, text: "USA versus China. Who wins?", startFrame: 0, endFrame: 95 },
            { index: 1, text: "Population.", startFrame: 102, endFrame: 340 },
            { index: 2, text: "GDP.", startFrame: 346, endFrame: 628 },
          ],
        }}
      />

      {/* Generic: size comparison — driven by inputProps */}
      <Composition
        id="SizeComparisonShortGeneric"
        component={SizeComparisonShortGeneric as React.FC}
        durationInFrames={2400}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          title: "SOLAR SYSTEM",
          subtitle: "Planet Size Comparison",
          items: [
            { name: "Mercury", size: 4879, unit: "km", color: "#8B8FA3" },
            { name: "Earth", size: 12742, unit: "km", color: "#00E5FF" },
            { name: "Jupiter", size: 139820, unit: "km", color: "#F72585" },
          ],
          narrationSrc: "audio/solar_system_narration.wav",
          timingLines: [
            { index: 0, text: "The planets of our solar system.", startFrame: 0, endFrame: 90 },
            { index: 1, text: "Mercury.", startFrame: 100, endFrame: 300 },
            { index: 2, text: "Earth.", startFrame: 310, endFrame: 500 },
            { index: 3, text: "Jupiter.", startFrame: 510, endFrame: 700 },
          ],
          bgVariant: "gradient",
        }}
      />

      <Composition
        id="ComparisonThumbnailGeneric"
        component={ComparisonThumbnailGeneric as React.FC}
        durationInFrames={1}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{
          mode: "country",
          title: "USA VS CHINA",
          subtitle: "Who really leads?",
          countryA: "USA",
          countryB: "CHINA",
          flagA: "\uD83C\uDDFA\uD83C\uDDF8",
          flagB: "\uD83C\uDDE8\uD83C\uDDF3",
          colorA: "#00E5FF",
          colorB: "#FFB800",
          stats: [
            { label: "Population", valueA: 340_000_000, valueB: 1_410_000_000, unit: "people" },
            { label: "GDP", valueA: 28_780_000_000_000, valueB: 18_530_000_000_000, unit: "USD" },
          ],
        }}
      />
    </>
  );
};
