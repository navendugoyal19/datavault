#!/usr/bin/env python3
"""Batch render Datavault videos from data/batch/ JSON files.

Reads *_data.json and *_timing.json, assembles inputProps, and renders
each video via `npx remotion render`.

Usage:
    python scripts/batch_render.py                          # render all
    python scripts/batch_render.py --name india_vs_japan     # render one
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCH_DIR = ROOT / "data" / "batch"
OUT_DIR = ROOT / "out"
ENTRY = "src/index.ts"

FRAME_BUFFER = 150  # extra frames after last timing line


def discover_videos(name_filter: str | None = None) -> list[dict]:
    """Find all *_data.json in batch dir, optionally filtering by name."""
    videos = []
    for data_file in sorted(BATCH_DIR.glob("*_data.json")):
        name = data_file.stem.replace("_data", "")
        if name_filter and name != name_filter:
            continue
        videos.append({"name": name, "data_file": data_file})
    return videos


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def is_country_vs(data: dict) -> bool:
    """Determine video type: country-vs has 'stats', size-comparison has 'items'."""
    return "stats" in data.get("data", data)


def build_country_vs_props(name: str, data: dict, timing: dict | None) -> dict:
    """Build CountryVsShortGeneric props from data + timing."""
    d = data.get("data", data)
    props: dict = {
        "countryA": d["countryA"],
        "countryB": d["countryB"],
        "flagA": d.get("flagA", ""),
        "flagB": d.get("flagB", ""),
        "colorA": d.get("colorA", "#00E5FF"),
        "colorB": d.get("colorB", "#FFB800"),
        "stats": d["stats"],
        "narrationSrc": f"audio/{name}_narration.wav",
        "timingLines": [],
    }
    if timing and "lines" in timing:
        props["timingLines"] = [
            {
                "index": line["index"],
                "text": line["text"],
                "startFrame": line["start_frame"],
                "endFrame": line["end_frame"],
            }
            for line in timing["lines"]
        ]
    return props


def build_size_comparison_props(name: str, data: dict, timing: dict | None) -> dict:
    """Build SizeComparisonShortGeneric props from data + timing."""
    # Derive title/subtitle from the first narration line or name
    lines = data.get("lines", [])
    title = name.replace("_", " ").upper()
    subtitle = "Size Comparison"
    if lines:
        # Use first line as subtitle hint
        subtitle = lines[0]

    props: dict = {
        "title": title,
        "subtitle": subtitle,
        "items": data["items"],
        "narrationSrc": f"audio/{name}_narration.wav",
        "timingLines": [],
        "bgVariant": "gradient",
    }
    if timing and "lines" in timing:
        props["timingLines"] = [
            {
                "index": line["index"],
                "text": line["text"],
                "startFrame": line["start_frame"],
                "endFrame": line["end_frame"],
            }
            for line in timing["lines"]
        ]
    return props


def calc_duration(timing: dict | None, fallback: int = 2700) -> int:
    """Calculate duration from timing (last endFrame + buffer) or use fallback."""
    if timing and "lines" in timing and timing["lines"]:
        last_end = max(line["end_frame"] for line in timing["lines"])
        return last_end + FRAME_BUFFER
    if timing and "duration_frames" in timing:
        return timing["duration_frames"] + FRAME_BUFFER
    return fallback


def render_video(name: str, composition_id: str, props: dict, duration: int) -> bool:
    """Write props JSON and invoke npx remotion render."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    props_file = BATCH_DIR / f"{name}_props.json"
    props_file.write_text(json.dumps(props, indent=2, ensure_ascii=False), encoding="utf-8")

    out_path = OUT_DIR / f"{name}.mp4"
    cmd = [
        "npx", "remotion", "render",
        ENTRY,
        composition_id,
        str(out_path),
        "--codec", "h264",
        "--crf", "18",
        "--props", str(props_file),
        f"--frames=0-{duration - 1}",
    ]

    print(f"\n{'='*60}")
    print(f"  Rendering: {name}")
    print(f"  Composition: {composition_id}")
    print(f"  Duration: {duration} frames ({duration/30:.1f}s)")
    print(f"  Output: {out_path}")
    print(f"{'='*60}\n")

    result = subprocess.run(cmd, cwd=str(ROOT))
    if result.returncode != 0:
        print(f"  [FAILED] {name} — exit code {result.returncode}")
        return False

    print(f"  [OK] {name} -> {out_path}")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch render Datavault videos")
    parser.add_argument("--name", default=None, help="Render only this video (stem name)")
    args = parser.parse_args()

    videos = discover_videos(args.name)
    if not videos:
        print(f"No videos found in {BATCH_DIR}" + (f" matching '{args.name}'" if args.name else ""))
        sys.exit(1)

    print(f"Found {len(videos)} video(s) to render\n")

    results: list[tuple[str, bool]] = []

    for v in videos:
        name = v["name"]
        data = load_json(v["data_file"])

        # Load timing if available
        timing_file = BATCH_DIR / f"{name}_timing.json"
        timing = load_json(timing_file) if timing_file.exists() else None

        # Determine composition type
        country_vs = is_country_vs(data)
        composition_id = "CountryVsShortGeneric" if country_vs else "SizeComparisonShortGeneric"

        # Build props
        if country_vs:
            props = build_country_vs_props(name, data, timing)
        else:
            props = build_size_comparison_props(name, data, timing)

        # Calculate duration
        duration = calc_duration(timing, fallback=2700 if country_vs else 2400)

        # Render
        ok = render_video(name, composition_id, props, duration)
        results.append((name, ok))

    # Summary
    print(f"\n{'='*60}")
    print("  BATCH RENDER SUMMARY")
    print(f"{'='*60}")
    for name, ok in results:
        status = "OK" if ok else "FAILED"
        print(f"  [{status}] {name}")

    # List output files
    mp4s = sorted(OUT_DIR.glob("*.mp4"))
    if mp4s:
        print(f"\nOutput files ({len(mp4s)}):")
        for f in mp4s:
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"  {f.name}  ({size_mb:.1f} MB)")

    failed = sum(1 for _, ok in results if not ok)
    if failed:
        print(f"\n{failed} render(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
