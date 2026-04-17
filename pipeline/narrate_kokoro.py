#!/usr/bin/env python3
"""Kokoro TTS narration pipeline for Datavault.

Generates high-quality local TTS narration using Kokoro 0.9.4, producing a WAV
file and a timing.json with per-line frame-accurate timestamps.

Run with Aperion's venv:
    "/Users/navendugoyal/Desktop/Nav AI Projects /youtube channel/Aperion/.venv/bin/python3" \
        pipeline/narrate_kokoro.py --input script.json --wav out.wav --timing timing.json

Input script.json format:
    {"lines": ["line 1", "line 2", ...]}
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline

# ── Constants ────────────────────────────────────────────────────────────────

VOICE = "af_bella"
SPEED = 0.95
SAMPLE_RATE = 24000
FPS = 30
PAUSE_SECONDS = 0.22
LONG_PAUSE = 0.55


# ── Core generation ─────────────────────────────────────────────────────────

def generate_narration(
    lines: list[str],
    output_wav: str,
    output_timing: str,
) -> dict:
    """Generate narration audio and timing data from a list of text lines.

    Args:
        lines: List of narration strings.
        output_wav: Path to write the combined WAV file.
        output_timing: Path to write timing.json.

    Returns:
        The timing metadata dict (also written to output_timing).
    """
    pipeline = KPipeline(lang_code="a")

    pause_samples = int(SAMPLE_RATE * PAUSE_SECONDS)
    pause = np.zeros(pause_samples, dtype=np.float32)

    chunks: list[np.ndarray] = []
    timings: list[dict] = []
    cursor = 0  # sample cursor

    print(f"Kokoro: generating {len(lines)} lines (voice={VOICE}, speed={SPEED})")

    for i, line in enumerate(lines):
        if not line.strip():
            continue

        if i % 5 == 0:
            print(f"  [{i + 1}/{len(lines)}] {line[:60]}...")

        generator = pipeline(line, voice=VOICE, speed=SPEED)
        result = next(generator)
        audio = result.audio.detach().cpu().numpy().astype(np.float32)

        start_sample = cursor
        end_sample = cursor + len(audio)

        timings.append({
            "index": i,
            "text": line,
            "start_seconds": round(start_sample / SAMPLE_RATE, 3),
            "end_seconds": round(end_sample / SAMPLE_RATE, 3),
            "start_frame": int(round(start_sample / SAMPLE_RATE * FPS)),
            "end_frame": int(round(end_sample / SAMPLE_RATE * FPS)),
        })

        chunks.append(audio)
        cursor = end_sample

        # Add inter-line pause (except after the last line)
        if i < len(lines) - 1:
            chunks.append(pause)
            cursor += pause_samples

    # Concatenate and normalize
    full_audio = np.concatenate(chunks)
    peak = np.abs(full_audio).max()
    if peak > 0:
        full_audio = full_audio * (0.85 / peak)

    # Write WAV
    wav_path = Path(output_wav)
    wav_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(wav_path), full_audio, SAMPLE_RATE)

    duration_seconds = len(full_audio) / SAMPLE_RATE
    duration_frames = int(math.ceil(duration_seconds * FPS))

    timing_data = {
        "voice": VOICE,
        "speed": SPEED,
        "fps": FPS,
        "sample_rate": SAMPLE_RATE,
        "duration_seconds": round(duration_seconds, 3),
        "duration_frames": duration_frames,
        "lines": timings,
    }

    # Write timing JSON
    timing_path = Path(output_timing)
    timing_path.parent.mkdir(parents=True, exist_ok=True)
    timing_path.write_text(json.dumps(timing_data, indent=2), encoding="utf-8")

    print(f"Kokoro done: {wav_path.name} ({duration_seconds:.1f}s, {len(timings)} lines)")
    return timing_data


# ── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate Kokoro TTS narration from a script JSON",
    )
    parser.add_argument(
        "--input", required=True,
        help='Path to script JSON (format: {"lines": ["...", ...]})',
    )
    parser.add_argument(
        "--wav", required=True,
        help="Output WAV file path",
    )
    parser.add_argument(
        "--timing", required=True,
        help="Output timing JSON file path",
    )
    args = parser.parse_args()

    script_path = Path(args.input)
    if not script_path.exists():
        raise FileNotFoundError(f"Script not found: {script_path}")

    script = json.loads(script_path.read_text(encoding="utf-8"))
    lines = script["lines"]

    generate_narration(lines, args.wav, args.timing)


if __name__ == "__main__":
    main()
