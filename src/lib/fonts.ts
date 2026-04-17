import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadRajdhani } from "@remotion/google-fonts/Rajdhani";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadOrbitron } from "@remotion/google-fonts/Orbitron";

const bebasNeue = loadBebasNeue();

const rajdhani = loadRajdhani("normal", {
  weights: ["400", "500", "600", "700"],
});

const poppins = loadPoppins("normal", {
  weights: ["300", "400", "500", "600", "700", "800"],
});

const orbitron = loadOrbitron("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
});

export const fontFamily = {
  /** Bebas Neue — tall condensed uppercase for title cards */
  display: bebasNeue.fontFamily,
  /** Rajdhani — angular tech numerals for counters and stats */
  numbers: rajdhani.fontFamily,
  /** Poppins — geometric sans for bar labels and descriptions */
  body: poppins.fontFamily,
  /** Orbitron — sci-fi kicker labels ("POPULATION", "GDP") */
  mono: orbitron.fontFamily,
  /** @deprecated Use `display` instead — kept for backward compatibility */
  heading: bebasNeue.fontFamily,
} as const;
