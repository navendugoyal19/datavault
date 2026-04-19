import React from "react";
import {Composition} from "remotion";
import {BarChartRaceVideo} from "./compositions/BarChartRaceVideo";
import {SizeComparisonShort} from "./compositions/SizeComparisonShort";
import {CountryVsShort} from "./compositions/CountryVsShort";
import {CountryVsVideo} from "./compositions/CountryVsVideo";
import {IndiaVsPakistanOriginal} from "./compositions/IndiaVsPakistanOriginal";
import {SizeComparisonVideo} from "./compositions/SizeComparisonVideo";
import {CountryVsShortGeneric} from "./compositions/CountryVsShortGeneric";
import {SizeComparisonShortGeneric} from "./compositions/SizeComparisonShortGeneric";
import {ComparisonThumbnailGeneric} from "./compositions/ComparisonThumbnailGeneric";
import {GermanyVsJapanEditorialShort, GERMANY_JAPAN_EDITORIAL_DURATION} from "./compositions/GermanyVsJapanEditorialShort";
import {FranceVsCanadaBroadcastShort, FRANCE_CANADA_BROADCAST_DURATION} from "./compositions/FranceVsCanadaBroadcastShort";
import {WhereEightBillionLiveShort, WHERE_EIGHT_BILLION_LIVE_DURATION} from "./compositions/WhereEightBillionLiveShort";
import {ShippingDayIndustrialShort, SHIPPING_DAY_INDUSTRIAL_DURATION} from "./compositions/ShippingDayIndustrialShort";
import { LeaveHomeAgeDoorwayShort, LEAVE_HOME_AGE_DOORWAY_DURATION } from "./compositions/LeaveHomeAgeDoorwayShort";
import { FreshWaterReserveShort, FRESH_WATER_RESERVE_DURATION } from "./compositions/FreshWaterReserveShort";
import { BiggestStadiumsPhotoShort, BIGGEST_STADIUMS_PHOTO_DURATION } from "./compositions/BiggestStadiumsPhotoShort";
import { LeaveHomeAgeEuropeLong, LEAVE_HOME_AGE_EUROPE_LONG_DURATION } from "./compositions/LeaveHomeAgeEuropeLong";
import { ShippingDayWorldLong, SHIPPING_DAY_WORLD_LONG_DURATION } from "./compositions/ShippingDayWorldLong";
import { InternetTrafficOneMinuteLong, INTERNET_TRAFFIC_ONE_MINUTE_LONG_DURATION } from "./compositions/InternetTrafficOneMinuteLong";
import { GreatConvergenceLong, GREAT_CONVERGENCE_DURATION } from "./compositions/GreatConvergenceLong";
import { TOTAL_DURATION_FRAMES as INDIA_PAKISTAN_DURATION } from "./generated/india_vs_pakistan_timing";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="BarChartRaceVideo"
        component={BarChartRaceVideo}
        durationInFrames={3600}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="CountryVsVideo"
        component={CountryVsVideo}
        durationInFrames={2700}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="SizeComparisonVideo"
        component={SizeComparisonVideo}
        durationInFrames={2400}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="SizeComparisonShort"
        component={SizeComparisonShort}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
      />

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

      <Composition
        id="CountryVsShortGeneric"
        component={CountryVsShortGeneric as React.FC}
        durationInFrames={6000}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          countryA: "USA",
          countryB: "CHINA",
          flagA: "🇺🇸",
          flagB: "🇨🇳",
          colorA: "#00E5FF",
          colorB: "#FFB800",
          stats: [
            {label: "Population", valueA: 340_000_000, valueB: 1_410_000_000, unit: "people", higherIsBetter: true},
            {label: "GDP", valueA: 28_780_000_000_000, valueB: 18_530_000_000_000, unit: "USD", higherIsBetter: true},
          ],
          narrationSrc: "audio/usa_vs_china_narration.wav",
          timingLines: [
            {index: 0, text: "USA versus China. Who wins?", startFrame: 0, endFrame: 95},
            {index: 1, text: "Population.", startFrame: 102, endFrame: 340},
            {index: 2, text: "GDP.", startFrame: 346, endFrame: 628},
          ],
        }}
      />

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
            {name: "Mercury", size: 4879, unit: "km", color: "#8B8FA3"},
            {name: "Earth", size: 12742, unit: "km", color: "#00E5FF"},
            {name: "Jupiter", size: 139820, unit: "km", color: "#F72585"},
          ],
          narrationSrc: "audio/solar_system_narration.wav",
          timingLines: [
            {index: 0, text: "The planets of our solar system.", startFrame: 0, endFrame: 90},
            {index: 1, text: "Mercury.", startFrame: 100, endFrame: 300},
            {index: 2, text: "Earth.", startFrame: 310, endFrame: 500},
            {index: 3, text: "Jupiter.", startFrame: 510, endFrame: 700},
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
          flagA: "🇺🇸",
          flagB: "🇨🇳",
          colorA: "#00E5FF",
          colorB: "#FFB800",
          stats: [
            {label: "Population", valueA: 340_000_000, valueB: 1_410_000_000, unit: "people"},
            {label: "GDP", valueA: 28_780_000_000_000, valueB: 18_530_000_000_000, unit: "USD"},
          ],
        }}
      />

      <Composition
        id="GermanyVsJapanEditorialShort"
        component={GermanyVsJapanEditorialShort}
        durationInFrames={GERMANY_JAPAN_EDITORIAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="FranceVsCanadaBroadcastShort"
        component={FranceVsCanadaBroadcastShort}
        durationInFrames={FRANCE_CANADA_BROADCAST_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="WhereEightBillionLiveShort"
        component={WhereEightBillionLiveShort}
        durationInFrames={WHERE_EIGHT_BILLION_LIVE_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="ShippingDayIndustrialShort"
        component={ShippingDayIndustrialShort}
        durationInFrames={SHIPPING_DAY_INDUSTRIAL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="LeaveHomeAgeDoorwayShort"
        component={LeaveHomeAgeDoorwayShort}
        durationInFrames={LEAVE_HOME_AGE_DOORWAY_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="FreshWaterReserveShort"
        component={FreshWaterReserveShort}
        durationInFrames={FRESH_WATER_RESERVE_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="BiggestStadiumsPhotoShort"
        component={BiggestStadiumsPhotoShort}
        durationInFrames={BIGGEST_STADIUMS_PHOTO_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="LeaveHomeAgeEuropeLong"
        component={LeaveHomeAgeEuropeLong}
        durationInFrames={LEAVE_HOME_AGE_EUROPE_LONG_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="ShippingDayWorldLong"
        component={ShippingDayWorldLong}
        durationInFrames={SHIPPING_DAY_WORLD_LONG_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="InternetTrafficOneMinuteLong"
        component={InternetTrafficOneMinuteLong}
        durationInFrames={INTERNET_TRAFFIC_ONE_MINUTE_LONG_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="GreatConvergenceLong"
        component={GreatConvergenceLong}
        durationInFrames={GREAT_CONVERGENCE_DURATION}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "THE GREAT CONVERGENCE",
          metricTitle: "GDP PER CAPITA (PPP, INT'L $)",
          sourceLabel: "Source: World Bank",
        }}
      />
    </>
  );
};
