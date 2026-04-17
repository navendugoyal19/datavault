#!/usr/bin/env python3
"""Convert timing.json to TypeScript constants.

Reads the timing.json produced by narrate_kokoro.py and outputs a .ts file
with frame-accurate constants for use in Remotion compositions.

Usage:
    python scripts/timing_to_ts.py timing.json --output src/generated/timing.ts
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def timing_to_ts(timing_path: str, output_path: str) -> None:
    """Convert timing.json to a TypeScript file with constants."""
    data = json.loads(Path(timing_path).read_text(encoding="utf-8"))

    lines = data["lines"]
    total_frames = data["duration_frames"]
    total_seconds = data["duration_seconds"]
    fps = data["fps"]

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    parts: list[str] = []
    parts.append("// Auto-generated from timing.json — do not edit")
    parts.append(f"export const TOTAL_DURATION_FRAMES = {total_frames};")
    parts.append(f"export const TOTAL_DURATION_SECONDS = {total_seconds};")
    parts.append(f"export const FPS = {fps};")
    parts.append("")
    parts.append("export interface LineTiming {")
    parts.append("  index: number;")
    parts.append("  text: string;")
    parts.append("  startFrame: number;")
    parts.append("  endFrame: number;")
    parts.append("}")
    parts.append("")
    parts.append("export const LINES: LineTiming[] = [")

    for line in lines:
        text_escaped = line["text"].replace("\\", "\\\\").replace('"', '\\"')
        parts.append(
            f'  {{ index: {line["index"]}, text: "{text_escaped}", '
            f'startFrame: {line["start_frame"]}, endFrame: {line["end_frame"]} }},'
        )

    parts.append("];")
    parts.append("")
    parts.append("// Convenience constants for section boundaries")

    for line in lines:
        idx = line["index"]
        parts.append(f"export const LINE_{idx}_START = {line['start_frame']};")
        parts.append(f"export const LINE_{idx}_END = {line['end_frame']};")

    parts.append("")  # trailing newline

    out.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {out} ({len(lines)} lines, {total_frames} frames)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert timing.json to TypeScript constants",
    )
    parser.add_argument("timing", help="Path to timing.json")
    parser.add_argument("--output", required=True, help="Output .ts file path")
    args = parser.parse_args()

    timing_to_ts(args.timing, args.output)


if __name__ == "__main__":
    main()
