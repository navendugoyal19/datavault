#!/usr/bin/env python3
"""Long-form script generation for Datavault narration."""

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
FRAMES_PER_YEAR = 480
INTRO_FRAMES = 180
OUTRO_FRAMES = 180
ERA_TRANSITION_FRAMES = 300
SPOTLIGHT_FRAMES = 360

ERAS = [
    {
        "name": "The Post-Cold War Order",
        "start_year": 1990,
        "end_year": 1999,
        "description": "The United States dominates as the sole superpower, while Europe rebuilds and Asia begins its quiet rise.",
    },
    {
        "name": "The Great Divergence",
        "start_year": 2000,
        "end_year": 2008,
        "description": "Globalization accelerates, but the benefits are unevenly distributed. China enters the World Trade Organization and begins its economic miracle.",
    },
    {
        "name": "The Rise of Asia",
        "start_year": 2009,
        "end_year": 2019,
        "description": "The financial crisis reshapes the global order. Asian economies surge forward while Western growth stagnates.",
    },
    {
        "name": "The Great Convergence",
        "start_year": 2020,
        "end_year": 2023,
        "description": "The pandemic and its aftermath accelerate the narrowing gap between East and West. The world enters a new multipolar era.",
    },
]

SPOTLIGHTS = [
    {"year": 1995, "country": "United States", "text": "The American tech revolution drives unprecedented wealth creation, with Silicon Valley redefining the global economy."},
    {"year": 2001, "country": "China", "text": "China's entry into the WTO marks the beginning of the greatest economic transformation in human history."},
    {"year": 2005, "country": "Germany", "text": "German engineering and the expanding European Union create an economic powerhouse at the heart of Europe."},
    {"year": 2010, "country": "Saudi Arabia", "text": "Oil wealth and strategic vision position the Kingdom as a pivotal force in global energy markets."},
    {"year": 2015, "country": "Switzerland", "text": "Swiss precision in banking, pharmaceuticals, and engineering propels this small nation to the top of global wealth rankings."},
    {"year": 2020, "country": "United States", "text": "Even amid pandemic disruption, American innovation and resilience maintain its position at the forefront of global wealth."},
]


def _fmt_value(value: float) -> str:
    return f"${value:,.0f}"


def _generate_year_narration(year: int, bars: list[dict], prev_bars: list[dict] | None) -> str:
    leader = bars[0]["name"]
    leader_val = _fmt_value(bars[0]["value"])
    
    if prev_bars is None:
        return f"In {year}, {leader} leads with {leader_val}."
    
    prev_leader = prev_bars[0]["name"]
    
    changes = []
    for i, bar in enumerate(bars[:5]):
        prev_pos = next((j for j, pb in enumerate(prev_bars) if pb["name"] == bar["name"]), None)
        if prev_pos is not None and prev_pos != i:
            direction = "up" if i < prev_pos else "down"
            changes.append(f"{bar['name']} moves {direction} to {i+1}")
    
    if leader != prev_leader:
        return f"{year} brings a seismic shift. {leader} overtakes {prev_leader} with {leader_val}, rewriting the global economic order."
    elif changes:
        return f"In {year}, {leader} holds the lead at {leader_val}. Meanwhile, {changes[0]}."
    elif year % 10 == 0:
        top3 = bars[:3]
        return f"The year is {year}. {leader} leads with {leader_val}, followed by {top3[1]['name']} and {top3[2]['name']}."
    else:
        growth = ((bars[0]["value"] / prev_bars[0]["value"]) - 1) * 100 if prev_bars[0]["value"] > 0 else 0
        if abs(growth) > 5:
            direction = "surges" if growth > 0 else "falls"
            return f"In {year}, {leader} {direction} to {leader_val} as global wealth reshuffles."
        return f"{year}. {leader} maintains the lead with {leader_val}."


def generate_longform_script(data: dict[str, Any]) -> dict[str, Any]:
    title = data.get("title", "Data")
    frames_data: list[dict] = data["frames"]

    if not frames_data:
        raise ValueError("No frames in data")

    segments: list[dict[str, Any]] = []
    current_frame = 0
    first_year = frames_data[0]["year"]
    last_year = frames_data[-1]["year"]
    total_years = len(frames_data)

    reserved = INTRO_FRAMES + OUTRO_FRAMES
    reserved += len(ERAS) * ERA_TRANSITION_FRAMES
    reserved += len(SPOTLIGHTS) * SPOTLIGHT_FRAMES
    regular_frames = (18000 - reserved) // total_years
    
    segments.append({
        "text": "The Great Convergence. How the World Got Rich. A story of nations, numbers, and the narrowing gap between East and West.",
        "startFrame": current_frame,
        "endFrame": current_frame + INTRO_FRAMES,
        "type": "intro",
    })
    current_frame += INTRO_FRAMES

    era_map = {era["start_year"]: era for era in ERAS[1:]}
    spotlight_map = {s["year"]: s for s in SPOTLIGHTS}
    prev_bars = None

    for idx, frame_data in enumerate(frames_data):
        year = frame_data["year"]
        bars = frame_data.get("bars", frame_data.get("entries", []))
        if not bars:
            continue

        if year in era_map and year != first_year:
            era = era_map[year]
            segments.append({
                "text": f"{era['name']}. {era['description']}",
                "startFrame": current_frame,
                "endFrame": current_frame + ERA_TRANSITION_FRAMES,
                "type": "era",
                "eraName": era["name"],
            })
            current_frame += ERA_TRANSITION_FRAMES

        if year in spotlight_map:
            spot = spotlight_map[year]
            rank = next((i + 1 for i, b in enumerate(bars) if b["name"] == spot["country"]), None)
            rank_text = f"ranked {rank}" if rank else "in the rankings"
            segments.append({
                "text": f"Spotlight on {spot['country']}, currently {rank_text}. {spot['text']}",
                "startFrame": current_frame,
                "endFrame": current_frame + SPOTLIGHT_FRAMES,
                "type": "spotlight",
                "country": spot["country"],
            })
            current_frame += SPOTLIGHT_FRAMES

        narration = _generate_year_narration(year, bars, prev_bars)
        segments.append({
            "text": narration,
            "startFrame": current_frame,
            "endFrame": current_frame + regular_frames,
            "type": "year",
            "year": year,
        })
        current_frame += regular_frames

        prev_bars = bars

    final_bars = frames_data[-1].get("bars", frames_data[-1].get("entries", []))
    final_leader = final_bars[0]["name"]
    final_val = _fmt_value(final_bars[0]["value"])
    top5 = final_bars[:5]
    podium = ", ".join(f"{b['name']} at {_fmt_value(b['value'])}" for b in top5[:-1])
    podium += f", and {top5[-1]['name']} at {_fmt_value(top5[-1]['value'])}"

    segments.append({
        "text": f"And so we arrive at {last_year}. {final_leader} leads with {final_val}. The top five: {podium}. But look closer — the gap between rich and poor nations has never been narrower.",
        "startFrame": current_frame,
        "endFrame": current_frame + FRAMES_PER_YEAR,
        "type": "finale",
    })
    current_frame += FRAMES_PER_YEAR

    segments.append({
        "text": "This is the Great Convergence. The story of how billions rose from poverty, how technology spread, and how the world's economic center of gravity shifted. If you want to see more stories hidden in the data, like and subscribe.",
        "startFrame": current_frame,
        "endFrame": current_frame + OUTRO_FRAMES,
        "type": "outro",
    })
    current_frame += OUTRO_FRAMES

    return {
        "type": "bar-race",
        "title": "The Great Convergence: How the World Got Rich",
        "totalFrames": current_frame,
        "fps": FPS,
        "segments": segments,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate long-form narration script")
    parser.add_argument("data", help="Path to data JSON file")
    parser.add_argument("--out", required=True, help="Output script JSON path")
    args = parser.parse_args()

    data_path = ROOT / args.data if not Path(args.data).is_absolute() else Path(args.data)
    out_path = ROOT / args.out if not Path(args.out).is_absolute() else Path(args.out)

    data = json.loads(data_path.read_text())
    log.info("Loaded data from %s", data_path)

    script = generate_longform_script(data)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(script, indent=2, ensure_ascii=False))
    log.info(
        "Generated %d segments (%d total frames / %.1fs ≈ %.1f min) → %s",
        len(script["segments"]),
        script["totalFrames"],
        script["totalFrames"] / script["fps"],
        (script["totalFrames"] / script["fps"]) / 60,
        out_path,
    )


if __name__ == "__main__":
    main()
