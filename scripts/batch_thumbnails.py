#!/usr/bin/env python3
"""Batch render Datavault thumbnails from data/batch JSON files."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BATCH_DIR = ROOT / "data" / "batch"
OUT_DIR = ROOT / "out" / "thumbnails"
ENTRY = "src/index.ts"
COMPOSITION_ID = "ComparisonThumbnailGeneric"


def discover_videos(name_filter: str | None = None) -> list[dict]:
    videos: list[dict] = []
    for data_file in sorted(BATCH_DIR.glob("*_data.json")):
        name = data_file.stem.replace("_data", "")
        if name_filter and name != name_filter:
            continue
        videos.append({"name": name, "data_file": data_file})
    return videos


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def title_from_seo(name: str, data: dict) -> str:
    seo_title = data.get("seo", {}).get("title", name.replace("_", " ").title())
    return seo_title.replace("—", " ").replace("#shorts", "").strip()


def build_country_thumbnail_props(name: str, payload: dict) -> dict:
    data = payload.get("data", payload)
    return {
      "mode": "country",
      "title": f"{data['countryA']} VS {data['countryB']}",
      "subtitle": "WHO ACTUALLY WINS?",
      "countryA": data["countryA"],
      "countryB": data["countryB"],
      "flagA": data.get("flagA", ""),
      "flagB": data.get("flagB", ""),
      "colorA": data.get("colorA", "#00E5FF"),
      "colorB": data.get("colorB", "#FFB800"),
      "stats": data["stats"][:3],
    }


def build_size_thumbnail_props(name: str, payload: dict) -> dict:
    title = name.replace("_", " ").upper()
    subtitle = "SMALLEST TO LARGEST"
    if "solar" in name:
        title = "SOLAR SYSTEM"
    elif "universe" in name:
        title = "UNIVERSE SIZE"
    elif "building" in name:
        title = "TALLEST BUILDINGS"
    elif "animal" in name:
        title = "FASTEST ANIMALS"
    return {
      "mode": "size",
      "title": title,
      "subtitle": subtitle,
      "items": payload["items"],
    }


def render_thumbnail(name: str, props: dict) -> bool:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    props_file = BATCH_DIR / f"{name}_thumb_props.json"
    props_file.write_text(json.dumps(props, indent=2, ensure_ascii=False), encoding="utf-8")

    out_path = OUT_DIR / f"{name}.png"
    cmd = [
        "npx",
        "remotion",
        "still",
        ENTRY,
        COMPOSITION_ID,
        str(out_path),
        "--props",
        str(props_file),
        "--frame=0",
    ]

    print(f"Rendering thumbnail: {name} -> {out_path}")
    result = subprocess.run(cmd, cwd=str(ROOT))
    return result.returncode == 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch render Datavault thumbnails")
    parser.add_argument("--name", default=None, help="Render only this video (stem name)")
    args = parser.parse_args()

    videos = discover_videos(args.name)
    if not videos:
        print("No videos found")
        sys.exit(1)

    failures = 0
    for video in videos:
        payload = load_json(video["data_file"])
        if "data" in payload:
            props = build_country_thumbnail_props(video["name"], payload)
        else:
            props = build_size_thumbnail_props(video["name"], payload)
        if not render_thumbnail(video["name"], props):
            failures += 1

    if failures:
        print(f"{failures} thumbnail(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
