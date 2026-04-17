// Centralized audio component for Datavault compositions.
// Handles narration, background score, SFX cues, and ambient loops.

import React from 'react';
import {
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { SfxCue } from '../lib/sfx';

interface SoundLayerProps {
  /** Path to narration audio (WAV or MP3) */
  narrationSrc?: string;
  /** Path to background score/music */
  scoreSrc?: string;
  /** Timed SFX events */
  sfxCues?: SfxCue[];
  /** Path to ambient loop audio */
  ambientSrc?: string;
  /** Narration volume (default 1.0) */
  narrationVolume?: number;
  /** Score volume (default 0.15) */
  scoreVolume?: number;
}

export const SoundLayer: React.FC<SoundLayerProps> = ({
  narrationSrc,
  scoreSrc,
  sfxCues = [],
  ambientSrc,
  narrationVolume = 1.0,
  scoreVolume = 0.15,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Narration volume curve: fade in over 18 frames, fade out over last 24
  const narrationVol = narrationSrc
    ? interpolate(
        frame,
        [0, 18, durationInFrames - 24, durationInFrames],
        [0, narrationVolume, narrationVolume, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
      )
    : 0;

  return (
    <>
      {/* Narration track */}
      {narrationSrc && (
        <Audio src={narrationSrc} volume={narrationVol} />
      )}

      {/* Background score */}
      {scoreSrc && (
        <Audio src={scoreSrc} volume={scoreVolume} />
      )}

      {/* Ambient loop */}
      {ambientSrc && (
        <Audio src={ambientSrc} volume={0.12} loop />
      )}

      {/* SFX cues */}
      {sfxCues.map((cue, i) => (
        <Sequence
          key={`sfx-${i}-${cue.frame}`}
          from={cue.frame}
          durationInFrames={cue.duration}
        >
          <Audio src={cue.sfx} volume={cue.volume} />
        </Sequence>
      ))}
    </>
  );
};
