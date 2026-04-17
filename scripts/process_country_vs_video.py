#!/usr/bin/env python3
"""Prepare, render, thumbnail, and upload a Datavault country-vs video."""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, cwd=str(ROOT), check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug")
    parser.add_argument("--subtitle", required=True)
    parser.add_argument("--chip", required=True)
    args = parser.parse_args()

    data_path = ROOT / "data" / "batch" / f"{args.slug}_data.json"
    data = json.loads(data_path.read_text(encoding="utf-8"))
    seo = data["seo"]

    run(
        [
            "python3",
            "scripts/prepare_country_vs_short.py",
            args.slug,
            "--subtitle",
            args.subtitle,
            "--chip",
            args.chip,
        ]
    )

    run(
        [
            "npx",
            "remotion",
            "still",
            "src/index.ts",
            "ComparisonThumbnailGeneric",
            f"out/thumbnails/{args.slug}.png",
            "--props",
            f"data/batch/{args.slug}_thumb_props.json",
            "--frame=0",
        ]
    )

    timing = json.loads((ROOT / "data" / "batch" / f"{args.slug}_timing.json").read_text(encoding="utf-8"))
    frames = timing["duration_frames"]

    run(
        [
            "npx",
            "remotion",
            "render",
            "src/index.ts",
            "CountryVsShortGeneric",
            f"out/{args.slug}.mp4",
            "--codec",
            "h264",
            "--crf",
            "18",
            f"--frames=0-{frames - 1}",
            "--props",
            f"data/batch/{args.slug}_props.json",
        ]
    )

    tags = ",".join(seo.get("tags", []))
    run(
        [
            "python3",
            "pipeline/upload.py",
            f"out/{args.slug}.mp4",
            "--title",
            seo["title"],
            "--description",
            seo.get("description", ""),
            "--tags",
            tags,
            "--category",
            "education",
            "--short",
            "--thumbnail",
            f"out/thumbnails/{args.slug}.png",
        ]
    )

    uploaded = json.loads((ROOT / "uploaded.json").read_text(encoding="utf-8"))
    match = None
    for entry in reversed(uploaded.get("uploaded", [])):
        if entry.get("source_file") == f"out/{args.slug}.mp4":
            match = entry
            break

    if match:
        data["seo"]["published_url"] = match["url"]
        if match.get("share_url"):
            data["seo"]["share_url"] = match["share_url"]
        data["seo"]["video_id"] = match["video_id"]
        data_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
