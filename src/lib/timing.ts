// Narration timing types and helpers for Datavault compositions

export interface LineTiming {
  index: number;
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface NarrationTiming {
  fps: number;
  durationFrames: number;
  durationSeconds: number;
  lines: LineTiming[];
}

/**
 * Returns the line that is actively being spoken at the given frame,
 * or null if no line covers that frame.
 */
export function getActiveLineAtFrame(
  lines: LineTiming[],
  frame: number,
): LineTiming | null {
  for (const line of lines) {
    if (frame >= line.startFrame && frame <= line.endFrame) {
      return line;
    }
  }
  return null;
}

/**
 * Returns true if the given frame falls within the line's time range.
 */
export function isLineActive(line: LineTiming, frame: number): boolean {
  return frame >= line.startFrame && frame <= line.endFrame;
}

/**
 * Returns a 0-1 progress value for how far through the line we are.
 * Returns 0 before the line starts and 1 after it ends.
 */
export function getLineProgress(line: LineTiming, frame: number): number {
  if (frame <= line.startFrame) return 0;
  if (frame >= line.endFrame) return 1;
  return (frame - line.startFrame) / (line.endFrame - line.startFrame);
}
