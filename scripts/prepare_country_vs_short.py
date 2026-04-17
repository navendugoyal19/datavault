#!/usr/bin/env python3
"""Prepare a Datavault country-vs short end-to-end from data/script JSON.

Creates narration, timing, Remotion props, and thumbnail props.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def slug_to_paths(slug: str) -> dict[str, Path]:
    return {
        "data": ROOT / "data" / "batch" / f"{slug}_data.json",
        "script": ROOT / "data" / "batch" / f"{slug}_script.json",
        "timing": ROOT / "data" / "batch" / f"{slug}_timing.json",
        "props": ROOT / "data" / "batch" / f"{slug}_props.json",
        "thumb_props": ROOT / "data" / "batch" / f"{slug}_thumb_props.json",
        "audio": ROOT / "public" / "audio" / f"{slug}_narration.mp3",
        "srt": ROOT / "public" / "audio" / f"{slug}_narration.srt",
    }


def narrate(paths: dict[str, Path], voice: str, rate: str) -> None:
    subprocess.run(
        [
            "python3",
            "pipeline/narrate.py",
            str(paths["script"]),
            "--out",
            str(paths["audio"]),
            "--engine",
            "edge",
            "--voice",
            voice,
            "--rate",
            rate,
        ],
        cwd=str(ROOT),
        check=True,
    )


def srt_to_timing(srt_path: Path) -> list[dict]:
    text = srt_path.read_text(encoding="utf-8").strip()
    blocks = re.split(r"\n\s*\n", text)
    lines = []
    for block in blocks:
        parts = block.splitlines()
        if len(parts) < 3:
            continue
        idx = int(parts[0]) - 1
        start, end = parts[1].split(" --> ")

        def to_ms(value: str) -> int:
            h, m, sm = value.split(":")
            s, ms = sm.split(",")
            return ((int(h) * 60 + int(m)) * 60 + int(s)) * 1000 + int(ms)

        lines.append(
            {
                "index": idx,
                "start_frame": round(to_ms(start) / 1000 * 30),
                "end_frame": round(to_ms(end) / 1000 * 30),
            }
        )
    return lines


def create_artifacts(slug: str, subtitle: str, chip: str) -> None:
    paths = slug_to_paths(slug)
    data = json.loads(paths["data"].read_text(encoding="utf-8"))
    timing_lines = srt_to_timing(paths["srt"])
    timing_payload = {"fps": 30, "duration_frames": timing_lines[-1]["end_frame"] + 360, "lines": timing_lines}
    paths["timing"].write_text(json.dumps(timing_payload, indent=2, ensure_ascii=False), encoding="utf-8")

    d = data["data"]
    full_lines = data["lines"]
    props = {
        "countryA": d["countryA"],
        "countryB": d["countryB"],
        "flagA": d["flagA"],
        "flagB": d["flagB"],
        "colorA": d["colorA"],
        "colorB": d["colorB"],
        "stats": d["stats"],
        "narrationSrc": f"audio/{slug}_narration.mp3",
        "timingLines": [
            {
                "index": item["index"],
                "text": full_lines[item["index"]],
                "startFrame": item["start_frame"],
                "endFrame": item["end_frame"],
            }
            for item in timing_lines
        ],
    }
    paths["props"].write_text(json.dumps(props, indent=2, ensure_ascii=False), encoding="utf-8")

    thumb = {
        "mode": "country",
        "title": f"{d['countryA']} VS {d['countryB']}",
        "subtitle": subtitle,
        "countryA": d["countryA"],
        "countryB": d["countryB"],
        "flagA": d["flagA"],
        "flagB": d["flagB"],
        "colorA": d["colorA"],
        "colorB": d["colorB"],
        "stats": [
            {
                "label": chip,
                "valueA": d["stats"][0]["valueA"],
                "valueB": d["stats"][0]["valueB"],
                "unit": d["stats"][0].get("unit", ""),
            },
            {
                "label": d["stats"][1]["label"].upper(),
                "valueA": d["stats"][1]["valueA"],
                "valueB": d["stats"][1]["valueB"],
                "unit": d["stats"][1].get("unit", ""),
            },
            {
                "label": d["stats"][-1]["label"].upper(),
                "valueA": d["stats"][-1]["valueA"],
                "valueB": d["stats"][-1]["valueB"],
                "unit": d["stats"][-1].get("unit", ""),
            },
        ],
    }
    paths["thumb_props"].write_text(json.dumps(thumb, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug")
    parser.add_argument("--subtitle", required=True)
    parser.add_argument("--chip", required=True)
    parser.add_argument("--voice", default="en-US-AndrewNeural")
    parser.add_argument("--rate", default="+4%")
    args = parser.parse_args()

    paths = slug_to_paths(args.slug)
    narrate(paths, args.voice, args.rate)
    create_artifacts(args.slug, args.subtitle, args.chip)
    print(f"Prepared {args.slug}")


if __name__ == "__main__":
    main()
