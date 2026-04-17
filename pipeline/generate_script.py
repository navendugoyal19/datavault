#!/usr/bin/env python3
"""Script generation for Datavault narration.

Reads a data JSON file and generates a narration script with timing cues.
Output matches the segment format expected by narrate.py.

Usage:
    python generate_script.py data/population.json --type bar-race --out data/population_script.json
    python generate_script.py data/usa-vs-china.json --type country-vs --out data/usa-vs-china_script.json
"""

import argparse
import json
import logging
import math
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]

# Rendering constants
FPS = 30
FRAMES_PER_YEAR = 60  # 2 seconds per year in a bar race
FRAMES_PER_STAT = 150  # 5 seconds per comparison stat
INTRO_FRAMES = 90  # 3 second intro
OUTRO_FRAMES = 120  # 4 second outro


def _fmt_value(value: float, unit: str | None = None) -> str:
    """Format a number for narration (human-readable)."""
    if value >= 1_000_000_000_000:
        formatted = f"{value / 1_000_000_000_000:.1f} trillion"
    elif value >= 1_000_000_000:
        formatted = f"{value / 1_000_000_000:.1f} billion"
    elif value >= 1_000_000:
        formatted = f"{value / 1_000_000:.1f} million"
    elif value >= 1_000:
        formatted = f"{value / 1_000:.1f} thousand"
    else:
        formatted = f"{value:,.1f}"

    if unit and unit not in ("people", "USD"):
        formatted += f" {unit}"
    elif unit == "USD":
        formatted = f"${formatted}"

    return formatted


def generate_bar_race_script(data: dict[str, Any]) -> dict[str, Any]:
    """Generate narration segments for a bar chart race.

    Picks out interesting moments: the start, major overtakes, and the end.
    """
    title = data.get("title", "Data")
    frames_data: list[dict] = data["frames"]

    if not frames_data:
        raise ValueError("No frames in data")

    segments: list[dict[str, Any]] = []
    current_frame = 0

    # ── Intro ───────────────────────────────────────────────────────────
    first_year = frames_data[0]["year"]
    last_year = frames_data[-1]["year"]
    leader_first = frames_data[0]["entries"][0]["name"] if frames_data[0]["entries"] else "Unknown"
    leader_last = frames_data[-1]["entries"][0]["name"] if frames_data[-1]["entries"] else "Unknown"

    segments.append({
        "text": f"Let's look at how {title.lower()} has changed around the world, "
                f"from {first_year} to {last_year}.",
        "startFrame": current_frame,
        "endFrame": current_frame + INTRO_FRAMES,
    })
    current_frame += INTRO_FRAMES

    # ── Opening ─────────────────────────────────────────────────────────
    first_entries = frames_data[0]["entries"][:3]
    names = ", ".join(e["name"] for e in first_entries[:-1]) + f", and {first_entries[-1]['name']}" if len(first_entries) > 1 else first_entries[0]["name"]
    val = _fmt_value(first_entries[0]["value"])
    segments.append({
        "text": f"In {first_year}, {leader_first} leads with {val}. "
                f"The top three are {names}.",
        "startFrame": current_frame,
        "endFrame": current_frame + FRAMES_PER_YEAR * 2,
    })
    current_frame += FRAMES_PER_YEAR * 2

    # ── Key transitions (detect leader changes) ────────────────────────
    prev_leader = leader_first
    milestone_years = _pick_milestone_years(frames_data)

    for frame_data in frames_data:
        year = frame_data["year"]
        if not frame_data["entries"]:
            continue
        current_leader = frame_data["entries"][0]["name"]

        # Leader change
        if current_leader != prev_leader:
            val = _fmt_value(frame_data["entries"][0]["value"])
            segments.append({
                "text": f"By {year}, {current_leader} surges ahead with {val}, "
                        f"overtaking {prev_leader}.",
                "startFrame": current_frame,
                "endFrame": current_frame + FRAMES_PER_YEAR * 3,
            })
            current_frame += FRAMES_PER_YEAR * 3
            prev_leader = current_leader

        # Milestone year commentary
        elif year in milestone_years:
            top = frame_data["entries"][0]
            val = _fmt_value(top["value"])
            segments.append({
                "text": f"In {year}, {top['name']} holds the lead at {val}.",
                "startFrame": current_frame,
                "endFrame": current_frame + FRAMES_PER_YEAR * 2,
            })
            current_frame += FRAMES_PER_YEAR * 2

    # ── Finale ──────────────────────────────────────────────────────────
    last_entries = frames_data[-1]["entries"][:3]
    podium = " — ".join(f"{e['name']}: {_fmt_value(e['value'])}" for e in last_entries)
    segments.append({
        "text": f"And here's where we stand in {last_year}. {podium}.",
        "startFrame": current_frame,
        "endFrame": current_frame + FRAMES_PER_YEAR * 3,
    })
    current_frame += FRAMES_PER_YEAR * 3

    # ── Outro ───────────────────────────────────────────────────────────
    segments.append({
        "text": "If you found this interesting, like and subscribe for more data stories.",
        "startFrame": current_frame,
        "endFrame": current_frame + OUTRO_FRAMES,
    })
    current_frame += OUTRO_FRAMES

    return {
        "type": "bar-race",
        "title": title,
        "totalFrames": current_frame,
        "fps": FPS,
        "segments": segments,
    }


def _pick_milestone_years(frames: list[dict], count: int = 4) -> set:
    """Pick evenly-spaced milestone years for commentary."""
    years = [f["year"] for f in frames]
    if len(years) <= count:
        return set(years)
    step = max(1, len(years) // (count + 1))
    return {years[i * step] for i in range(1, count + 1)}


def generate_country_vs_script(data: dict[str, Any]) -> dict[str, Any]:
    """Generate narration segments for a country-vs-country video."""
    a = data["countryA"]
    b = data["countryB"]
    stats: list[dict] = data["stats"]

    segments: list[dict[str, Any]] = []
    current_frame = 0

    # ── Intro ───────────────────────────────────────────────────────────
    segments.append({
        "text": f"{a} versus {b}. Two giants compared across every metric that matters. "
                f"Let's see who comes out on top.",
        "startFrame": current_frame,
        "endFrame": current_frame + INTRO_FRAMES,
    })
    current_frame += INTRO_FRAMES

    # ── Stats ───────────────────────────────────────────────────────────
    score_a, score_b = 0, 0
    for stat in stats:
        val_a = _fmt_value(stat["valueA"], stat.get("unit"))
        val_b = _fmt_value(stat["valueB"], stat.get("unit"))

        higher = stat.get("higherIsBetter", True)
        if higher:
            winner = a if stat["valueA"] > stat["valueB"] else b
        else:
            winner = a if stat["valueA"] < stat["valueB"] else b

        if winner == a:
            score_a += 1
        else:
            score_b += 1

        segments.append({
            "text": f"{stat['label']}. {a}: {val_a}. {b}: {val_b}. "
                    f"This one goes to {winner}.",
            "startFrame": current_frame,
            "endFrame": current_frame + FRAMES_PER_STAT,
        })
        current_frame += FRAMES_PER_STAT

    # ── Verdict ─────────────────────────────────────────────────────────
    if score_a > score_b:
        verdict = f"{a} takes the lead with {score_a} to {score_b}."
    elif score_b > score_a:
        verdict = f"{b} takes the lead with {score_b} to {score_a}."
    else:
        verdict = f"It's a tie at {score_a} all!"

    segments.append({
        "text": f"Final score: {verdict} "
                f"But of course, there's more to a country than numbers.",
        "startFrame": current_frame,
        "endFrame": current_frame + OUTRO_FRAMES,
    })
    current_frame += OUTRO_FRAMES

    segments.append({
        "text": "Which comparison should we do next? Drop it in the comments.",
        "startFrame": current_frame,
        "endFrame": current_frame + 90,
    })
    current_frame += 90

    return {
        "type": "country-vs",
        "title": f"{a} vs {b}",
        "totalFrames": current_frame,
        "fps": FPS,
        "segments": segments,
    }


# ── CLI ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate narration script from data JSON",
    )
    parser.add_argument("data", help="Path to data JSON file")
    parser.add_argument(
        "--type",
        choices=["bar-race", "country-vs"],
        required=True,
        help="Video type",
    )
    parser.add_argument("--out", required=True, help="Output script JSON path")
    args = parser.parse_args()

    data_path = ROOT / args.data if not Path(args.data).is_absolute() else Path(args.data)
    out_path = ROOT / args.out if not Path(args.out).is_absolute() else Path(args.out)

    data = json.loads(data_path.read_text())
    log.info("Loaded data from %s", data_path)

    if args.type == "bar-race":
        script = generate_bar_race_script(data)
    elif args.type == "country-vs":
        script = generate_country_vs_script(data)
    else:
        raise ValueError(f"Unknown type: {args.type}")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(script, indent=2, ensure_ascii=False))
    log.info(
        "Generated %d segments (%d total frames / %.1fs) → %s",
        len(script["segments"]),
        script["totalFrames"],
        script["totalFrames"] / script["fps"],
        out_path,
    )


if __name__ == "__main__":
    main()
