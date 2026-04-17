// SFX path constants and volume presets for Datavault compositions

import { staticFile } from 'remotion';

export const SFX = {
  whoosh: staticFile('sfx/whoosh_real.mp3'),
  reveal: staticFile('sfx/reveal_real.mp3'),
  chime: staticFile('sfx/chime_real.mp3'),
  impact: staticFile('sfx/impact_real.mp3'),
  sweep: staticFile('sfx/sweep_real.mp3'),
  pop: staticFile('sfx/pop_real.mp3'),
  ambient: staticFile('sfx/ambient_pad_10s.mp3'),
} as const;

export const SFX_VOLUME = {
  transition: 0.55,
  accent: 0.45,
  subtle: 0.30,
  ambient: 0.12,
} as const;

export interface SfxCue {
  /** Frame at which this SFX should start playing */
  frame: number;
  /** Path to the SFX audio file (use SFX constants) */
  sfx: string;
  /** Playback volume (0-1) */
  volume: number;
  /** Duration in frames */
  duration: number;
}
