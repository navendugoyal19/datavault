#!/usr/bin/env python3
"""Batch upload rendered Datavault videos to YouTube.

Reads data/batch/*_data.json for SEO metadata, uploads from out/,
and tracks in uploaded.json to prevent duplicates.

Usage:
    python scripts/batch_upload.py                        # upload all
    python scripts/batch_upload.py --name india_vs_japan   # upload one
"""

import argparse
import json
import sys
from pathlib import Path

# Add parent so we can import from pipeline/
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))

from upload import upload_video, load_state  # noqa: E402

BATCH_DIR = ROOT / "data" / "batch"
OUT_DIR = ROOT / "out"
THUMB_DIR = OUT_DIR / "thumbnails"


def discover_videos(name_filter: str | None = None) -> list[dict]:
    """Find all *_data.json with matching rendered mp4."""
    videos = []
    for data_file in sorted(BATCH_DIR.glob("*_data.json")):
        name = data_file.stem.replace("_data", "")
        if name_filter and name != name_filter:
            continue
        mp4 = OUT_DIR / f"{name}.mp4"
        if not mp4.exists():
            continue
        videos.append({"name": name, "data_file": data_file, "mp4": mp4})
    return videos


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def get_seo(data: dict, name: str) -> dict:
    """Extract SEO metadata from data JSON."""
    seo = data.get("seo", {})
    title = seo.get("title", name.replace("_", " ").title())
    tags = seo.get("tags", ["datavault", "data", "comparison"])

    # Build description from script lines if available
    lines = data.get("lines", [])
    description = "\n".join(lines[:3]) if lines else title
    description += "\n\n#datavault #shorts"

    return {"title": title, "tags": tags, "description": description}


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch upload Datavault videos")
    parser.add_argument("--name", default=None, help="Upload only this video (stem name)")
    parser.add_argument(
        "--schedule-base",
        default=None,
        help="Base ISO 8601 datetime for scheduling (videos spaced 8h apart)",
    )
    args = parser.parse_args()

    videos = discover_videos(args.name)
    if not videos:
        print(f"No rendered videos found in {OUT_DIR}" + (f" matching '{args.name}'" if args.name else ""))
        print("Run scripts/batch_render.py first.")
        sys.exit(1)

    # Check current upload state
    state = load_state()
    already = {e.get("source_file") for e in state.get("uploaded", [])}

    print(f"Found {len(videos)} video(s) to upload\n")

    results: list[tuple[str, str | None]] = []

    for i, v in enumerate(videos):
        name = v["name"]
        mp4 = v["mp4"]
        data = load_json(v["data_file"])
        seo = get_seo(data, name)

        # Skip already uploaded
        if str(mp4) in already:
            print(f"  [SKIP] {name} — already uploaded")
            results.append((name, "skipped"))
            continue

        # Determine schedule time if base provided
        schedule = None
        if args.schedule_base:
            from datetime import datetime, timedelta

            base = datetime.fromisoformat(args.schedule_base.replace("Z", "+00:00"))
            schedule_dt = base + timedelta(hours=8 * i)
            schedule = schedule_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        print(f"\n  Uploading: {name}")
        print(f"  Title: {seo['title']}")
        if schedule:
            print(f"  Scheduled: {schedule}")

        result = upload_video(
            video_path=mp4,
            title=seo["title"],
            description=seo["description"],
            tags=seo["tags"],
            category="education",
            schedule=schedule,
            is_short=True,
            thumbnail_path=THUMB_DIR / f"{name}.png",
        )

        if result:
            results.append((name, result.get("url")))
        else:
            results.append((name, None))

    # Summary
    print(f"\n{'='*60}")
    print("  BATCH UPLOAD SUMMARY")
    print(f"{'='*60}")
    for name, url_or_status in results:
        if url_or_status == "skipped":
            print(f"  [SKIP] {name}")
        elif url_or_status:
            print(f"  [OK]   {name} -> {url_or_status}")
        else:
            print(f"  [FAIL] {name}")

    failed = sum(1 for _, u in results if u is None)
    if failed:
        print(f"\n{failed} upload(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
