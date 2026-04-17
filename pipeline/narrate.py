#!/usr/bin/env python3
"""TTS narration pipeline for Datavault.

Takes a script JSON (from generate_script.py), generates audio for each
segment using edge-tts or Kokoro TTS, combines into a single narration
track, and produces an SRT subtitle file (edge) or timing.json (kokoro).

Usage:
    # Edge TTS (default fallback)
    python narrate.py data/population_script.json --out public/audio/narration.mp3 --engine edge

    # Kokoro TTS (high quality, local — requires Aperion venv)
    python narrate.py data/population_script.json --out public/audio/narration.wav --engine kokoro
"""

import argparse
import asyncio
import json
import logging
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]
APERION_VENV_PYTHON = (
    Path(__file__).resolve().parents[2]
    / "Aperion" / ".venv" / "bin" / "python3"
)
KOKORO_SCRIPT = Path(__file__).resolve().parent / "narrate_kokoro.py"

DEFAULT_VOICE = "en-US-GuyNeural"
# Fallback voices if the default is unavailable
FALLBACK_VOICES = [
    "en-US-ChristopherNeural",
    "en-US-EricNeural",
    "en-US-AndrewNeural",
]


def _resolve_kokoro_python() -> Path:
    """Find a Python interpreter with the Kokoro runtime available."""
    candidates = [APERION_VENV_PYTHON, Path(sys.executable)]
    for candidate in candidates:
        if not candidate.exists():
            continue
        probe = subprocess.run(
            [
                str(candidate),
                "-c",
                "import kokoro, soundfile",
            ],
            capture_output=True,
            text=True,
        )
        if probe.returncode == 0:
            return candidate

    raise FileNotFoundError(
        "No Python interpreter with both 'kokoro' and 'soundfile' is available. "
        f"Checked: {', '.join(str(path) for path in candidates)}"
    )


async def generate_segment_audio(
    text: str,
    output_path: Path,
    voice: str = DEFAULT_VOICE,
    rate: str = "+0%",
) -> Path:
    """Generate a single audio segment using edge-tts.

    Args:
        text: The narration text to synthesize.
        output_path: Where to save the .mp3 file.
        voice: Microsoft Neural TTS voice name.
        rate: Speech rate adjustment (e.g. "+10%", "-5%").

    Returns:
        Path to the generated audio file.
    """
    import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate=rate)
    await communicate.save(str(output_path))
    log.info("Generated: %s (%d chars)", output_path.name, len(text))
    return output_path


def combine_audio_files(
    audio_files: list[Path],
    output_path: Path,
    gap_ms: int = 400,
) -> Path:
    """Combine multiple audio segments into a single track with gaps.

    Args:
        audio_files: Ordered list of audio file paths.
        output_path: Where to save the combined .mp3.
        gap_ms: Milliseconds of silence between segments.

    Returns:
        Path to the combined audio file.
    """
    from pydub import AudioSegment

    combined = AudioSegment.empty()
    silence = AudioSegment.silent(duration=gap_ms)

    for i, path in enumerate(audio_files):
        segment = AudioSegment.from_file(str(path))
        if i > 0:
            combined += silence
        combined += segment

    output_path.parent.mkdir(parents=True, exist_ok=True)
    combined.export(str(output_path), format="mp3", bitrate="192k")
    log.info("Combined %d segments → %s (%.1fs)", len(audio_files), output_path, len(combined) / 1000)
    return output_path


def generate_srt(
    segments: list[dict],
    audio_files: list[Path],
    output_path: Path,
    gap_ms: int = 400,
) -> Path:
    """Generate an SRT subtitle file with accurate timing from audio durations.

    Args:
        segments: List of script segments with 'text' keys.
        audio_files: Corresponding audio files (for duration measurement).
        output_path: Where to save the .srt file.
        gap_ms: Gap between segments in milliseconds.

    Returns:
        Path to the generated SRT file.
    """
    from pydub import AudioSegment

    srt_lines: list[str] = []
    current_ms = 0

    for i, (seg, audio_path) in enumerate(zip(segments, audio_files)):
        audio = AudioSegment.from_file(str(audio_path))
        duration_ms = len(audio)

        start = _ms_to_srt_time(current_ms)
        end = _ms_to_srt_time(current_ms + duration_ms)

        srt_lines.append(str(i + 1))
        srt_lines.append(f"{start} --> {end}")
        srt_lines.append(seg["text"])
        srt_lines.append("")

        current_ms += duration_ms + gap_ms

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(srt_lines), encoding="utf-8")
    log.info("Generated SRT with %d entries → %s", len(segments), output_path)
    return output_path


def _ms_to_srt_time(ms: int) -> str:
    """Convert milliseconds to SRT timestamp format (HH:MM:SS,mmm)."""
    hours = ms // 3_600_000
    ms %= 3_600_000
    minutes = ms // 60_000
    ms %= 60_000
    seconds = ms // 1_000
    millis = ms % 1_000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"


async def run_pipeline(
    script_path: Path,
    output_path: Path,
    voice: str = DEFAULT_VOICE,
    rate: str = "+0%",
    gap_ms: int = 400,
) -> dict[str, Path]:
    """Run the full narration pipeline.

    Args:
        script_path: Path to script JSON.
        output_path: Path for the combined MP3 output.
        voice: TTS voice name.
        rate: Speech rate adjustment.
        gap_ms: Silence between segments.

    Returns:
        Dict with paths: {"audio": ..., "srt": ...}
    """
    script = json.loads(script_path.read_text())
    segments = script["segments"]
    log.info("Loaded %d segments from %s", len(segments), script_path)

    # Generate individual segments in a temp directory
    tmp_dir = Path(tempfile.mkdtemp(prefix="datavault_tts_"))
    audio_files: list[Path] = []

    try:
        for i, seg in enumerate(segments):
            seg_path = tmp_dir / f"seg_{i:03d}.mp3"
            try:
                await generate_segment_audio(seg["text"], seg_path, voice=voice, rate=rate)
            except Exception as exc:
                log.warning("Voice '%s' failed on segment %d: %s", voice, i, exc)
                # Try fallback voices
                generated = False
                for fallback in FALLBACK_VOICES:
                    try:
                        log.info("Trying fallback voice: %s", fallback)
                        await generate_segment_audio(seg["text"], seg_path, voice=fallback, rate=rate)
                        generated = True
                        break
                    except Exception:
                        continue
                if not generated:
                    raise RuntimeError(f"All voices failed for segment {i}: {seg['text'][:50]}...")
            audio_files.append(seg_path)

        # Combine
        combined = combine_audio_files(audio_files, output_path, gap_ms=gap_ms)

        # Generate SRT
        srt_path = output_path.with_suffix(".srt")
        generate_srt(segments, audio_files, srt_path, gap_ms=gap_ms)

        return {"audio": combined, "srt": srt_path}

    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── Kokoro engine ────────────────────────────────────────────────────────────

def run_kokoro(script_path: Path, output_path: Path) -> dict[str, Path]:
    """Run Kokoro TTS via narrate_kokoro.py using Aperion's venv.

    Converts the segments-based script JSON into a lines-based format that
    narrate_kokoro.py expects, then invokes it as a subprocess.
    """
    kokoro_python = _resolve_kokoro_python()

    script = json.loads(script_path.read_text(encoding="utf-8"))

    # Support both {"segments": [{"text": ...}]} and {"lines": [...]} formats
    if "lines" in script:
        lines = script["lines"]
    elif "segments" in script:
        lines = [seg["text"] for seg in script["segments"]]
    else:
        raise ValueError("Script JSON must have 'lines' or 'segments' key")

    # Write a temp lines-format JSON for narrate_kokoro.py
    tmp = Path(tempfile.mktemp(suffix=".json", prefix="kokoro_input_"))
    tmp.write_text(json.dumps({"lines": lines}), encoding="utf-8")

    wav_path = output_path.with_suffix(".wav")
    timing_path = output_path.with_suffix(".json")

    try:
        subprocess.run(
            [
                str(kokoro_python),
                str(KOKORO_SCRIPT),
                "--input", str(tmp),
                "--wav", str(wav_path),
                "--timing", str(timing_path),
            ],
            check=True,
        )
    finally:
        tmp.unlink(missing_ok=True)

    log.info("Kokoro done: %s  |  Timing: %s", wav_path, timing_path)
    return {"audio": wav_path, "timing": timing_path}


# ── CLI ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate TTS narration from a script JSON",
    )
    parser.add_argument("script", help="Path to script JSON file")
    parser.add_argument("--out", required=True, help="Output audio path")
    parser.add_argument(
        "--engine", choices=["kokoro", "edge"], default="kokoro",
        help="TTS engine: kokoro (high quality, local) or edge (free cloud)",
    )
    parser.add_argument("--voice", default=DEFAULT_VOICE, help=f"Edge TTS voice (default: {DEFAULT_VOICE})")
    parser.add_argument("--rate", default="+0%", help="Edge TTS speech rate (e.g. '+10%%', '-5%%')")
    parser.add_argument("--gap", type=int, default=400, help="Gap between segments in ms (edge only)")
    args = parser.parse_args()

    script_path = ROOT / args.script if not Path(args.script).is_absolute() else Path(args.script)
    output_path = ROOT / args.out if not Path(args.out).is_absolute() else Path(args.out)

    if args.engine == "kokoro":
        result = run_kokoro(script_path, output_path)
        log.info("Done! Audio: %s  |  Timing: %s", result["audio"], result["timing"])
    else:
        result = asyncio.run(run_pipeline(
            script_path=script_path,
            output_path=output_path,
            voice=args.voice,
            rate=args.rate,
            gap_ms=args.gap,
        ))
        log.info("Done! Audio: %s  |  SRT: %s", result["audio"], result["srt"])


if __name__ == "__main__":
    main()
