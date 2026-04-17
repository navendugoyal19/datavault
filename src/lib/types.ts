/** A single entry in a bar chart (one bar) */
export interface BarChartEntry {
  name: string;
  value: number;
  color?: string;
  icon?: string;
}

/** A single frame/keyframe in a bar chart race (snapshot at a point in time) */
export interface BarChartFrame {
  year: number | string;
  entries: BarChartEntry[];
}

/** A single comparison stat for country-vs-country videos */
export interface ComparisonStat {
  label: string;
  valueA: number;
  valueB: number;
  unit?: string;
  higherIsBetter?: boolean;
}

/** Full data shape for a country-vs-country video */
export interface CountryVsData {
  countryA: string;
  countryB: string;
  flagA?: string;
  flagB?: string;
  stats: ComparisonStat[];
}

/** A single item in a size comparison video */
export interface SizeItem {
  name: string;
  size: number;
  unit: string;
  color?: string;
}

/** Top-level video configuration */
export interface VideoConfig {
  title: string;
  type: 'bar-race' | 'size-comparison' | 'country-vs';
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  data: BarChartFrame[] | SizeItem[] | CountryVsData;
}
