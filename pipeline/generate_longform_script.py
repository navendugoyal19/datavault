#!/usr/bin/env python3
"""Long-form bar-race script generator with era transitions and spotlights.

Usage:
    python generate_longform_script.py data/great_convergence_data.json \
        --title "The Great Convergence" \
        --subtitle "How the World Got Rich" \
        --out data/great_convergence_script.json
"""

import argparse
import json
import logging
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]

FPS = 30

# ── Timing configuration for ~10 minute video ──────────────────────────────
TOTAL_FRAMES = 18_000  # 10 minutes @ 30fps
INTRO_FRAMES = 150      # 5 seconds
OUTRO_FRAMES = 300      # 10 seconds
ERA_TRANSITION_FRAMES = 300  # 10 seconds each
SPOTLIGHT_FRAMES = 240   # 8 seconds each

# Define eras: (start_year, end_year, title, subtitle, description)
ERAS = [
    (1990, 2000, "The Post-Cold War Order", "American Century's Peak",
     "The collapse of the Soviet Union left the United States as the undisputed economic superpower."),
    (2000, 2008, "The Asian Renaissance", "China Enters the Stage",
     "While Japan's bubble economy deflated, China began its historic transformation from poverty to power."),
    (2008, 2019, "The Great Divergence", "Resource Wealth vs. Innovation",
     "The financial crisis reshaped global wealth. Small resource-rich nations surged while traditional powers struggled."),
    (2019, 2023, "The New Normal", "Pandemic, Recovery, and Rivalry",
     "COVID-19 tested every economy. Some emerged stronger; others face new challenges in a fragmented world."),
]

# Country spotlights: (year, country, narrative)
SPOTLIGHTS = [
    (1995, "United States", "In the mid-nineties, America's economy soared on the back of the tech revolution, cementing its position as the world's wealthiest major nation."),
    (2001, "China", "After joining the WTO, China began a historic transformation that would lift hundreds of millions from poverty and reshape global trade."),
    (2005, "Germany", "As the engine of European expansion, Germany's manufacturing prowess drove its per capita wealth to new heights."),
    (2010, "Saudi Arabia", "Riding a wave of oil wealth, Saudi Arabia transformed desert into prosperity, becoming one of the world's richest nations per person."),
    (2015, "Switzerland", "With precision engineering and banking mastery, Switzerland consistently ranked among the world's wealthiest nations."),
    (2020, "United States", "Despite the pandemic's devastation, America's tech-driven recovery pushed its per capita wealth to new records."),
]


def _fmt_value(value: float) -> str:
    """Format GDP per capita for narration."""
    return f"${value:,.0f}"


def generate_longform_script(data: dict[str, Any]) -> dict[str, Any]:
    frames_data: list[dict] = data["frames"]
    if not frames_data:
        raise ValueError("No frames in data")

    segments: list[dict[str, Any]] = []
    current_frame = 0

    # ── Intro ───────────────────────────────────────────────────────────
    first_year = frames_data[0]["year"]
    last_year = frames_data[-1]["year"]

    segments.append({
        "text": f"This is the story of how the world got rich. From {first_year} to {last_year}, "
                f"we'll trace GDP per capita across nations, revealing four distinct eras of global wealth.",
        "startFrame": current_frame,
        "endFrame": current_frame + INTRO_FRAMES,
        "type": "intro",
    })
    current_frame += INTRO_FRAMES

    # Calculate bar race frames per year
    num_years = len(frames_data)
    total_era_time = sum(
        ERA_TRANSITION_FRAMES + SPOTLIGHT_FRAMES * sum(1 for s in SPOTLIGHTS if era[0] <= s[0] <= era[1])
        for era in ERAS
    )
    bar_race_total_frames = TOTAL_FRAMES - INTRO_FRAMES - OUTRO_FRAMES - total_era_time
    frames_per_year = bar_race_total_frames // num_years

    log.info("Bar race: %d years, %d frames/year (%.1fs/year)",
             num_years, frames_per_year, frames_per_year / FPS)

    # ── Process each era ────────────────────────────────────────────────
    for era_idx, (era_start, era_end, era_title, era_subtitle, era_desc) in enumerate(ERAS):
        era_frames = [f for f in frames_data if era_start <= f["year"] <= era_end]
        if not era_frames:
            continue

        # Era intro (first era doesn't need transition, just starts)
        if era_idx > 0:
            segments.append({
                "text": f"{era_title}. {era_desc}",
                "startFrame": current_frame,
                "endFrame": current_frame + ERA_TRANSITION_FRAMES,
                "type": "era_transition",
                "eraTitle": era_title,
                "eraSubtitle": era_subtitle,
            })
            current_frame += ERA_TRANSITION_FRAMES

        # Bar race within this era
        for frame_data in era_frames:
            year = frame_data["year"]
            bars = frame_data["bars"]
            if not bars:
                continue

            leader = bars[0]
            top3 = bars[:3]
            top3_text = " — ".join(f"{e['name']}: {_fmt_value(e['value'])}" for e in top3)

            # Check for spotlight in this year
            spotlight = next((s for s in SPOTLIGHTS if s[0] == year), None)

            if spotlight:
                # Spotlight segment
                _, country, narrative = spotlight
                country_entry = next((e for e in bars if e["name"] == country), None)
                if country_entry:
                    val = _fmt_value(country_entry["value"])
                    rank = next(i for i, e in enumerate(bars, 1) if e["name"] == country)
                    segments.append({
                        "text": f"{narrative} In {year}, {country} ranked #{rank} with {val} per person.",
                        "startFrame": current_frame,
                        "endFrame": current_frame + SPOTLIGHT_FRAMES,
                        "type": "spotlight",
                        "country": country,
                        "rank": rank,
                        "value": country_entry["value"],
                    })
                    current_frame += SPOTLIGHT_FRAMES

            # Regular year commentary (every 3 years or on leader changes)
            if year % 3 == 0 or (len(bars) > 1 and bars[0]["name"] != bars[1]["name"]):
                segments.append({
                    "text": f"{year}. {top3_text}.",
                    "startFrame": current_frame,
                    "endFrame": current_frame + frames_per_year,
                    "type": "year",
                    "year": year,
                })
            current_frame += frames_per_year

    # ── Outro ───────────────────────────────────────────────────────────
    final_bars = frames_data[-1]["bars"][:3]
    podium = " — ".join(f"{e['name']}: {_fmt_value(e['value'])}" for e in final_bars)

    segments.append({
        "text": f"And so we arrive at {last_year}. The podium: {podium}. "
                f"The great convergence continues—but the destination remains unwritten.",
        "startFrame": current_frame,
        "endFrame": current_frame + OUTRO_FRAMES,
        "type": "outro",
    })
    current_frame += OUTRO_FRAMES

    # Ensure we don't exceed total frames
    if current_frame > TOTAL_FRAMES:
        log.warning("Script exceeds target by %d frames, adjusting", current_frame - TOTAL_FRAMES)
        # Trim from the end
        excess = current_frame - TOTAL_FRAMES
        for seg in reversed(segments):
            seg_len = seg["endFrame"] - seg["startFrame"]
            if excess <= 0:
                break
            trim = min(excess, seg_len - 60)  # minimum 2 seconds per segment
            seg["endFrame"] -= trim
            excess -= trim

    return {
        "type": "bar-race-longform",
        "title": "The Great Convergence",
        "subtitle": "How the World Got Rich",
        "totalFrames": current_frame,
        "fps": FPS,
        "segments": segments,
        "eras": [
            {
                "startYear": e[0],
                "endYear": e[1],
                "title": e[2],
                "subtitle": e[3],
                "description": e[4],
            }
            for e in ERAS
        ],
        "spotlights": [
            {
                "year": s[0],
                "country": s[1],
                "narrative": s[2],
            }
            for s in SPOTLIGHTS
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate longform narration script")
    parser.add_argument("data", help="Path to data JSON file")
    parser.add_argument("--title", default="The Great Convergence")
    parser.add_argument("--subtitle", default="How the World Got Rich")
    parser.add_argument("--out", required=True, help="Output script JSON path")
    args = parser.parse_args()

    data_path = ROOT / args.data if not Path(args.data).is_absolute() else Path(args.data)
    out_path = ROOT / args.out if not Path(args.out).is_absolute() else Path(args.out)

    data = json.loads(data_path.read_text())
    log.info("Loaded data from %s (%d frames)", data_path, len(data["frames"]))

    script = generate_longform_script(data)

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
