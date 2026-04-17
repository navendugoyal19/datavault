#!/usr/bin/env python3
"""Datavault sequential campaign runner.

Builds a fresh Datavault slate without depending on the old batch queue:
20 long-form bar-chart stories first, then 50 axis-driven rivalry Shorts.

The runner is resume-safe. It records progress in campaign_state/ and can be
invoked repeatedly to continue the queue one item at a time.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PIPELINE_DIR = ROOT / "pipeline"
sys.path.insert(0, str(PIPELINE_DIR))

from narrate import run_kokoro  # noqa: E402
from source_data import _resolve_country_code, fetch_world_bank, save_bar_race_data  # noqa: E402


FPS = 30
INTRO_DURATION_FRAMES = 90
LONGFORM_BUFFER_FRAMES = 120
SHORT_BUFFER_FRAMES = 90

CAMPAIGN_VERSION = "datavault-ragl-2026-04-16-v1"
STATE_DIR = ROOT / "campaign_state"
STATE_PATH = STATE_DIR / "ragl_state.json"
CACHE_PATH = STATE_DIR / "indicator_cache.json"

DATA_DIR = ROOT / "data" / "ragl"
SCRIPT_DIR = DATA_DIR / "scripts"
PROPS_DIR = DATA_DIR / "props"
AUDIO_DIR = ROOT / "public" / "audio" / "ragl"
OUT_DIR = ROOT / "out" / "ragl"
THUMB_DIR = OUT_DIR / "thumbnails"


LONGFORM_QUEUE: list[dict[str, Any]] = [
    {
        "slug": "world-population-rankings",
        "title": "How World Population Rankings Changed Since 1960",
        "chart_title": "WORLD POPULATION RANKINGS",
        "indicator": "SP.POP.TOTL",
        "metric_title": "Population",
        "metric_phrase": "population rankings",
        "thesis": "India's climb to the top and the steady rise of Africa's biggest populations",
        "year_range": [1960, 2024],
        "tags": ["population", "demographics", "world population", "animated data"],
    },
    {
        "slug": "world-gdp-race",
        "title": "The Rise of the World's Largest Economies",
        "chart_title": "WORLD GDP RACE",
        "indicator": "NY.GDP.MKTP.CD",
        "metric_title": "GDP",
        "metric_phrase": "economic size",
        "thesis": "how the United States stayed on top while China and India changed the table underneath it",
        "year_range": [1960, 2024],
        "tags": ["gdp", "economy", "richest countries", "data visualization"],
    },
    {
        "slug": "gdp-per-capita-rankings",
        "title": "GDP Per Person: Who Actually Got Rich",
        "chart_title": "GDP PER PERSON",
        "indicator": "NY.GDP.PCAP.CD",
        "metric_title": "GDP per Capita",
        "metric_phrase": "wealth per person",
        "thesis": "the difference between large economies and truly rich societies",
        "year_range": [1960, 2024],
        "tags": ["gdp per capita", "wealth", "standard of living", "bar chart race"],
    },
    {
        "slug": "internet-takeover",
        "title": "The Internet Takeover by Country",
        "chart_title": "INTERNET USERS",
        "indicator": "IT.NET.USER.ZS",
        "metric_title": "Internet Users",
        "metric_phrase": "internet adoption",
        "thesis": "which countries got online first and which ones made the fastest leap",
        "year_range": [1990, 2024],
        "tags": ["internet", "technology", "digital adoption", "country rankings"],
    },
    {
        "slug": "military-spending-race",
        "title": "Military Spending: Cold War to Now",
        "chart_title": "MILITARY SPENDING",
        "indicator": "MS.MIL.XPND.CD",
        "metric_title": "Military Spending",
        "metric_phrase": "military spending",
        "thesis": "how power shifted from the Cold War map to today's multipolar arms race",
        "year_range": [1960, 2024],
        "tags": ["military", "defense", "military spending", "world data"],
    },
    {
        "slug": "co2-emitters-race",
        "title": "CO2 Emitters: How the Map Changed",
        "chart_title": "CO2 EMITTERS",
        "indicator": "EN.ATM.CO2E.KT",
        "metric_title": "CO2 Emissions (kt)",
        "metric_phrase": "carbon emissions",
        "thesis": "the long shift from Western heavy industry to Asia's manufacturing boom",
        "year_range": [1960, 2024],
        "tags": ["co2", "emissions", "climate", "carbon"],
    },
    {
        "slug": "life-expectancy-rankings",
        "title": "Life Expectancy: Who Lives Longest Now?",
        "chart_title": "LIFE EXPECTANCY",
        "indicator": "SP.DYN.LE00.IN",
        "metric_title": "Life Expectancy",
        "metric_phrase": "life expectancy",
        "thesis": "which countries turned health gains into decades of extra life",
        "year_range": [1960, 2024],
        "tags": ["life expectancy", "health", "longevity", "statistics"],
    },
    {
        "slug": "urban-population-explosion",
        "title": "Urban Population Explosion by Country",
        "chart_title": "URBAN POPULATION",
        "indicator": "SP.URB.TOTL",
        "metric_title": "Urban Population",
        "metric_phrase": "urban population",
        "thesis": "the countries where cities swallowed the century",
        "year_range": [1960, 2024],
        "tags": ["cities", "urbanization", "urban population", "data story"],
    },
    {
        "slug": "fertility-collapse",
        "title": "Fertility Collapse Around the World",
        "chart_title": "FERTILITY RATE",
        "indicator": "SP.DYN.TFRT.IN",
        "metric_title": "Fertility Rate",
        "metric_phrase": "fertility rates",
        "thesis": "how fast birth rates fell and which countries stayed young the longest",
        "year_range": [1960, 2024],
        "tags": ["fertility", "birth rate", "population", "demographics"],
    },
    {
        "slug": "electricity-access-race",
        "title": "Electricity Access: Who Connected Fastest",
        "chart_title": "ELECTRICITY ACCESS",
        "indicator": "EG.ELC.ACCS.ZS",
        "metric_title": "Electricity Access",
        "metric_phrase": "electricity access",
        "thesis": "how basic infrastructure spread and where the biggest gaps still remain",
        "year_range": [1990, 2024],
        "tags": ["electricity", "infrastructure", "development", "world bank"],
    },
    {
        "slug": "mobile-phone-revolution",
        "title": "The Mobile Phone Revolution by Country",
        "chart_title": "MOBILE SUBSCRIPTIONS",
        "indicator": "IT.CEL.SETS.P2",
        "metric_title": "Mobile Subscriptions",
        "metric_phrase": "mobile adoption",
        "thesis": "the countries that skipped straight into the phone-first era",
        "year_range": [1990, 2024],
        "tags": ["mobile", "phones", "technology", "animated ranking"],
    },
    {
        "slug": "inflation-shocks",
        "title": "Inflation Shocks Around the World",
        "chart_title": "INFLATION SHOCKS",
        "indicator": "FP.CPI.TOTL.ZG",
        "metric_title": "Inflation",
        "metric_phrase": "inflation spikes",
        "thesis": "how crises hit countries differently and which economies spun out hardest",
        "year_range": [1990, 2024],
        "tags": ["inflation", "prices", "economy", "country ranking"],
    },
    {
        "slug": "unemployment-swings",
        "title": "Unemployment Swings Through the Crises",
        "chart_title": "UNEMPLOYMENT",
        "indicator": "SL.UEM.TOTL.ZS",
        "metric_title": "Unemployment",
        "metric_phrase": "unemployment",
        "thesis": "which labor markets cracked, recovered, and cracked again",
        "year_range": [1991, 2024],
        "tags": ["unemployment", "jobs", "economy", "data visualization"],
    },
    {
        "slug": "forest-cover-rankings",
        "title": "Forest Cover: Winners and Losers",
        "chart_title": "FOREST COVER",
        "indicator": "AG.LND.FRST.ZS",
        "metric_title": "Forest Cover",
        "metric_phrase": "forest cover",
        "thesis": "where forests held on, where they shrank, and how land use changed the map",
        "year_range": [1990, 2024],
        "tags": ["forests", "environment", "land use", "climate"],
    },
    {
        "slug": "export-powerhouses",
        "title": "Export Powerhouses Since Globalization",
        "chart_title": "EXPORT POWERHOUSES",
        "indicator": "NE.EXP.GNFS.ZS",
        "metric_title": "Exports Share",
        "metric_phrase": "export intensity",
        "thesis": "which countries built their growth on selling to the world",
        "year_range": [1960, 2024],
        "tags": ["exports", "trade", "globalization", "economics"],
    },
    {
        "slug": "renewable-energy-shift",
        "title": "The Renewable Energy Shift by Country",
        "chart_title": "RENEWABLE ENERGY",
        "indicator": "EG.FEC.RNEW.ZS",
        "metric_title": "Renewable Energy",
        "metric_phrase": "renewable energy use",
        "thesis": "which countries stayed closest to renewables and which ones moved away",
        "year_range": [1990, 2024],
        "tags": ["renewables", "energy", "climate", "green transition"],
    },
    {
        "slug": "tourism-superpowers",
        "title": "Tourism Superpowers by Arrivals",
        "chart_title": "TOURISM ARRIVALS",
        "indicator": "ST.INT.ARVL",
        "metric_title": "International Tourism Arrivals",
        "metric_phrase": "tourism arrivals",
        "thesis": "the places the world kept flying to, even as shocks reset the rankings",
        "year_range": [1995, 2024],
        "tags": ["tourism", "travel", "international arrivals", "bar chart race"],
    },
    {
        "slug": "education-spending-race",
        "title": "Education Spending: Who Invested Most?",
        "chart_title": "EDUCATION SPENDING",
        "indicator": "SE.XPD.TOTL.GD.ZS",
        "metric_title": "Education Spending",
        "metric_phrase": "education spending",
        "thesis": "which countries treated schooling like a core national investment",
        "year_range": [2000, 2024],
        "tags": ["education", "public spending", "schools", "world bank"],
    },
    {
        "slug": "infant-mortality-decline",
        "title": "Infant Mortality Collapse by Country",
        "chart_title": "INFANT MORTALITY",
        "indicator": "SP.DYN.IMRT.IN",
        "metric_title": "Infant Mortality Rate",
        "metric_phrase": "infant mortality",
        "thesis": "how child survival improved and where progress was fastest",
        "year_range": [1960, 2024],
        "tags": ["infant mortality", "health", "child survival", "global data"],
    },
    {
        "slug": "trade-openness-race",
        "title": "Trade Openness: Who Depends on the World Most?",
        "chart_title": "TRADE OPENNESS",
        "indicator": "NE.TRD.GNFS.ZS",
        "metric_title": "Trade (% of GDP)",
        "metric_phrase": "trade openness",
        "thesis": "which economies became the most plugged into global flows",
        "year_range": [1960, 2024],
        "tags": ["trade", "global economy", "imports exports", "country rankings"],
    },
]

SHORT_PAIRS: list[dict[str, str]] = [
    {"a": "United States", "b": "China", "flagA": "🇺🇸", "flagB": "🇨🇳", "colorA": "#3C8DFF", "colorB": "#FF4D4D"},
    {"a": "India", "b": "China", "flagA": "🇮🇳", "flagB": "🇨🇳", "colorA": "#FF9933", "colorB": "#FF4D4D"},
    {"a": "India", "b": "Pakistan", "flagA": "🇮🇳", "flagB": "🇵🇰", "colorA": "#FF9933", "colorB": "#0B8457"},
    {"a": "United States", "b": "Russia", "flagA": "🇺🇸", "flagB": "🇷🇺", "colorA": "#3C8DFF", "colorB": "#D9485F"},
    {"a": "Japan", "b": "South Korea", "flagA": "🇯🇵", "flagB": "🇰🇷", "colorA": "#F44336", "colorB": "#4DA3FF"},
    {"a": "United Kingdom", "b": "France", "flagA": "🇬🇧", "flagB": "🇫🇷", "colorA": "#4466EE", "colorB": "#2F80ED"},
    {"a": "Germany", "b": "Japan", "flagA": "🇩🇪", "flagB": "🇯🇵", "colorA": "#FFB400", "colorB": "#F44336"},
    {"a": "Brazil", "b": "Mexico", "flagA": "🇧🇷", "flagB": "🇲🇽", "colorA": "#1FAA59", "colorB": "#0F8A5F"},
    {"a": "Indonesia", "b": "Vietnam", "flagA": "🇮🇩", "flagB": "🇻🇳", "colorA": "#FF5C5C", "colorB": "#E53935"},
    {"a": "Nigeria", "b": "South Africa", "flagA": "🇳🇬", "flagB": "🇿🇦", "colorA": "#00B96B", "colorB": "#FFB400"},
]

SHORT_AXES: list[dict[str, Any]] = [
    {
        "slug": "economy",
        "label": "Economy Scoreboard",
        "chip": "ECONOMY",
        "emoji": "💰",
        "tags": ["economy", "gdp", "comparison", "country comparison"],
        "metrics": [
            {"label": "GDP", "indicator": "NY.GDP.MKTP.CD", "unit": "USD", "higher_is_better": True},
            {"label": "GDP Per Capita", "indicator": "NY.GDP.PCAP.CD", "unit": "USD", "higher_is_better": True},
            {"label": "Exports Share", "indicator": "NE.EXP.GNFS.ZS", "unit": "%", "higher_is_better": True},
            {"label": "Inflation", "indicator": "FP.CPI.TOTL.ZG", "unit": "%", "higher_is_better": False},
            {"label": "Unemployment", "indicator": "SL.UEM.TOTL.ZS", "unit": "%", "higher_is_better": False},
        ],
    },
    {
        "slug": "population",
        "label": "Population Battle",
        "chip": "POPULATION",
        "emoji": "👥",
        "tags": ["population", "demographics", "country comparison", "world data"],
        "metrics": [
            {"label": "Population", "indicator": "SP.POP.TOTL", "unit": "people", "higher_is_better": True},
            {"label": "Urban Population", "indicator": "SP.URB.TOTL", "unit": "people", "higher_is_better": True},
            {"label": "Life Expectancy", "indicator": "SP.DYN.LE00.IN", "unit": "years", "higher_is_better": True},
            {"label": "Infant Mortality", "indicator": "SP.DYN.IMRT.IN", "unit": "rate", "higher_is_better": False},
            {"label": "Electricity Access", "indicator": "EG.ELC.ACCS.ZS", "unit": "%", "higher_is_better": True},
        ],
    },
    {
        "slug": "tech",
        "label": "Internet and Tech Race",
        "chip": "TECH",
        "emoji": "📱",
        "tags": ["technology", "internet", "digital", "country comparison"],
        "metrics": [
            {"label": "Internet Users", "indicator": "IT.NET.USER.ZS", "unit": "%", "higher_is_better": True},
            {"label": "Mobile Subs", "indicator": "IT.CEL.SETS.P2", "unit": "per100", "higher_is_better": True},
            {"label": "Fixed Broadband", "indicator": "IT.NET.BBND.P2", "unit": "per100", "higher_is_better": True},
            {"label": "Secure Servers", "indicator": "IT.NET.SECR.P6", "unit": "perM", "higher_is_better": True},
            {"label": "Electricity Access", "indicator": "EG.ELC.ACCS.ZS", "unit": "%", "higher_is_better": True},
        ],
    },
    {
        "slug": "life",
        "label": "Quality of Life Battle",
        "chip": "LIFE",
        "emoji": "📊",
        "tags": ["quality of life", "living standards", "comparison", "country data"],
        "metrics": [
            {"label": "GDP Per Capita", "indicator": "NY.GDP.PCAP.CD", "unit": "USD", "higher_is_better": True},
            {"label": "Life Expectancy", "indicator": "SP.DYN.LE00.IN", "unit": "years", "higher_is_better": True},
            {"label": "Infant Mortality", "indicator": "SP.DYN.IMRT.IN", "unit": "rate", "higher_is_better": False},
            {"label": "Electricity Access", "indicator": "EG.ELC.ACCS.ZS", "unit": "%", "higher_is_better": True},
            {"label": "Unemployment", "indicator": "SL.UEM.TOTL.ZS", "unit": "%", "higher_is_better": False},
        ],
    },
    {
        "slug": "climate",
        "label": "Climate and Energy Face-Off",
        "chip": "CLIMATE",
        "emoji": "🌍",
        "tags": ["climate", "energy", "co2", "country comparison"],
        "metrics": [
            {"label": "CO2 Per Capita", "indicator": "EN.ATM.CO2E.PC", "unit": "tons", "higher_is_better": False},
            {"label": "Renewable Energy", "indicator": "EG.FEC.RNEW.ZS", "unit": "%", "higher_is_better": True},
            {"label": "Forest Area", "indicator": "AG.LND.FRST.ZS", "unit": "%", "higher_is_better": True},
            {"label": "Clean Cooking", "indicator": "EG.CFT.ACCS.ZS", "unit": "%", "higher_is_better": True},
            {"label": "Fossil Fuel Use", "indicator": "EG.USE.COMM.FO.ZS", "unit": "%", "higher_is_better": False},
        ],
    },
]


@dataclass
class BuildArtifact:
    kind: str
    slug: str
    video_path: Path
    title: str
    description: str
    tags: list[str]
    is_short: bool
    thumbnail_path: Path | None = None


def ensure_dirs() -> None:
    for path in [STATE_DIR, DATA_DIR, SCRIPT_DIR, PROPS_DIR, AUDIO_DIR, OUT_DIR, THUMB_DIR]:
        path.mkdir(parents=True, exist_ok=True)


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def slugify(value: str) -> str:
    cleaned = []
    for char in value.lower():
        if char.isalnum():
            cleaned.append(char)
        elif cleaned and cleaned[-1] != "_":
            cleaned.append("_")
    return "".join(cleaned).strip("_")


def format_number(value: float, unit: str) -> str:
    if unit == "USD":
        prefix = "$"
    else:
        prefix = ""

    if abs(value) >= 1_000_000_000_000:
        body = f"{value / 1_000_000_000_000:.1f}T"
    elif abs(value) >= 1_000_000_000:
        body = f"{value / 1_000_000_000:.1f}B"
    elif abs(value) >= 1_000_000:
        body = f"{value / 1_000_000:.1f}M"
    elif abs(value) >= 1_000:
        body = f"{value / 1_000:.1f}K"
    elif unit in {"years", "%", "per100", "perM", "tons"}:
        body = f"{value:.1f}"
    else:
        body = f"{value:.0f}"

    suffix = ""
    if unit == "people":
        suffix = " people"
    elif unit == "%":
        suffix = "%"
    elif unit == "years":
        suffix = " years"
    elif unit == "per100":
        suffix = " per 100"
    elif unit == "perM":
        suffix = " per million"
    elif unit == "tons":
        suffix = " tons"
    elif unit == "rate":
        suffix = ""

    return f"{prefix}{body}{suffix}"


def load_campaign_state() -> dict[str, Any]:
    state = read_json(
        STATE_PATH,
        {
            "version": CAMPAIGN_VERSION,
            "completed": {},
            "history": [],
            "blocked": None,
        },
    )
    if state.get("version") != CAMPAIGN_VERSION:
        state = {
            "version": CAMPAIGN_VERSION,
            "completed": {},
            "history": [],
            "blocked": None,
        }
    return state


def save_campaign_state(state: dict[str, Any]) -> None:
    write_json(STATE_PATH, state)


def load_indicator_cache() -> dict[str, Any]:
    return read_json(CACHE_PATH, {})


def save_indicator_cache(cache: dict[str, Any]) -> None:
    write_json(CACHE_PATH, cache)


def queue_items() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for entry in LONGFORM_QUEUE:
        items.append({"phase": "longform", "kind": "longform", **entry})
    for pair in SHORT_PAIRS:
        for axis in SHORT_AXES:
            slug = f"{slugify(pair['a'])}_vs_{slugify(pair['b'])}_{axis['slug']}"
            title = f"{pair['a']} vs {pair['b']} — {axis['label']} {axis['emoji']}"
            items.append(
                {
                    "phase": "shorts",
                    "kind": "short",
                    "slug": slug,
                    "title": title,
                    "pair": pair,
                    "axis": axis,
                }
            )
    return items


def next_pending_items(state: dict[str, Any], max_items: int) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    completed = state.get("completed", {})
    for item in queue_items():
        if item["slug"] in completed:
            continue
        selected.append(item)
        if len(selected) >= max_items:
            break
    return selected


def parse_kokoro_timing_lines(timing_path: Path) -> tuple[list[dict[str, Any]], int]:
    payload = read_json(timing_path, {})
    lines = [
        {
            "index": line["index"],
            "text": line["text"],
            "startFrame": line["start_frame"],
            "endFrame": line["end_frame"],
        }
        for line in payload.get("lines", [])
    ]
    last_frame = max((line["endFrame"] for line in lines), default=0)
    return lines, last_frame


def parse_srt_to_timing_lines(srt_path: Path, lines: list[str]) -> tuple[list[dict[str, Any]], int]:
    content = srt_path.read_text(encoding="utf-8").strip()
    blocks = [block for block in content.split("\n\n") if block.strip()]
    timing_lines: list[dict[str, Any]] = []
    last_frame = 0
    for block in blocks:
        rows = block.splitlines()
        if len(rows) < 3:
            continue
        index = int(rows[0]) - 1
        start_value, end_value = rows[1].split(" --> ")
        start_frame = round(srt_ms(start_value) / 1000 * FPS)
        end_frame = round(srt_ms(end_value) / 1000 * FPS)
        last_frame = max(last_frame, end_frame)
        timing_lines.append(
            {
                "index": index,
                "text": lines[index],
                "startFrame": start_frame,
                "endFrame": end_frame,
            }
        )
    return timing_lines, last_frame


def srt_ms(value: str) -> int:
    hours, minutes, second_ms = value.split(":")
    seconds, millis = second_ms.split(",")
    return ((int(hours) * 60 + int(minutes)) * 60 + int(seconds)) * 1000 + int(millis)


def milestone_indices(total: int, count: int) -> list[int]:
    if total <= count:
        return list(range(total))
    raw = {
        0,
        total - 1,
        *(round((total - 1) * step / (count - 1)) for step in range(count)),
    }
    return sorted(raw)


def build_longform_story_point_indices(data: dict[str, Any]) -> list[int]:
    return milestone_indices(len(data["frames"]), 7)


def build_longform_story_points(data: dict[str, Any]) -> list[dict[str, Any]]:
    frames: list[dict[str, Any]] = data["frames"]
    return [frames[index] for index in build_longform_story_point_indices(data)]


def build_longform_tick_years(data: dict[str, Any]) -> list[int | str]:
    return [frame["year"] for frame in build_longform_story_points(data)]


def build_longform_lines(item: dict[str, Any], data: dict[str, Any]) -> list[str]:
    selected = build_longform_story_points(data)
    opening = selected[0]
    closing = selected[-1]
    lines: list[str] = [
        f"This is how {item['metric_phrase']} changed across the world, from {opening['year']} to {closing['year']}.",
    ]

    if len(opening["entries"]) >= 3:
        lines.append(
            f"At the start, {opening['entries'][0]['name']} leads, with {opening['entries'][1]['name']} and {opening['entries'][2]['name']} right behind."
        )

    previous_leader = opening["entries"][0]["name"] if opening["entries"] else ""
    for frame in selected[1:-1]:
        entries = frame["entries"][:3]
        if len(entries) < 3:
            continue
        leader = entries[0]["name"]
        if leader != previous_leader:
            lines.append(
                f"By {frame['year']}, {leader} moves into first place, pushing {previous_leader} off the top spot."
            )
            previous_leader = leader
        else:
            lines.append(
                f"In {frame['year']}, the front of the table is {leader}, {entries[1]['name']}, and {entries[2]['name']}."
            )

    closing_entries = closing["entries"][:5]
    if closing_entries:
        top_list = ", ".join(entry["name"] for entry in closing_entries[:3])
        lines.append(f"By {closing['year']}, the leading names are {top_list}.")

    lines.append(f"The big story here is {item['thesis']}.")
    lines.append("Follow Datavault for more animated data stories driven by real numbers.")
    return lines


def build_longform_timeline_segments(
    data: dict[str, Any],
    timing_lines: list[dict[str, Any]],
    intro_duration: int,
) -> list[dict[str, int]]:
    point_indices = build_longform_story_point_indices(data)
    if not timing_lines:
        return []

    normalized_ranges: list[dict[str, int]] = []
    previous_end = 0
    for line in timing_lines:
        raw_end = max(0, line["endFrame"] - intro_duration)
        if raw_end <= previous_end:
            continue
        normalized_ranges.append(
            {
                "startFrame": previous_end,
                "endFrame": raw_end,
            }
        )
        previous_end = raw_end

    if not normalized_ranges:
        return []

    segments: list[dict[str, int]] = []
    opening_index = point_indices[0]
    final_index = point_indices[-1]

    for range_index in range(min(2, len(normalized_ranges))):
        window = normalized_ranges[range_index]
        segments.append(
            {
                "startFrame": window["startFrame"],
                "endFrame": window["endFrame"],
                "startIndex": opening_index,
                "endIndex": opening_index,
            }
        )

    transition_offset = 2
    transition_count = len(point_indices) - 1
    for transition_index in range(transition_count):
        range_index = transition_offset + transition_index
        if range_index >= len(normalized_ranges):
            break
        window = normalized_ranges[range_index]
        segments.append(
            {
                "startFrame": window["startFrame"],
                "endFrame": window["endFrame"],
                "startIndex": point_indices[transition_index],
                "endIndex": point_indices[transition_index + 1],
            }
        )

    for range_index in range(transition_offset + transition_count, len(normalized_ranges)):
        window = normalized_ranges[range_index]
        segments.append(
            {
                "startFrame": window["startFrame"],
                "endFrame": window["endFrame"],
                "startIndex": final_index,
                "endIndex": final_index,
            }
        )

    return segments


def build_longform_script(lines: list[str]) -> dict[str, Any]:
    cursor = 0
    segments: list[dict[str, Any]] = []
    for line in lines:
        duration = 180
        segments.append({"text": line, "startFrame": cursor, "endFrame": cursor + duration})
        cursor += duration
    return {"segments": segments}


def build_longform_description(item: dict[str, Any], data_path: Path) -> str:
    return (
        f"{item['title']}\n\n"
        f"A fresh Datavault long-form data story built from World Bank open data.\n"
        f"This episode tracks {item['metric_phrase']} over time and highlights {item['thesis']}.\n\n"
        f"Source file: {data_path.name}\n"
        "Source: World Bank Open Data\n\n"
        "#datavault #datavisualization #animateddata"
    )


def build_longform_item(item: dict[str, Any]) -> BuildArtifact:
    slug = item["slug"]
    data_path = DATA_DIR / f"{slug}_data.json"
    script_path = SCRIPT_DIR / f"{slug}_script.json"
    props_path = PROPS_DIR / f"{slug}_props.json"
    audio_path = AUDIO_DIR / f"{slug}.wav"
    video_path = OUT_DIR / f"{slug}.mp4"

    if video_path.exists() and data_path.exists():
        return BuildArtifact(
            kind="longform",
            slug=slug,
            video_path=video_path,
            title=item["title"],
            description=build_longform_description(item, data_path),
            tags=["datavault", "data visualization", *item["tags"]],
            is_short=False,
        )

    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            save_bar_race_data(
                indicator=item["indicator"],
                title=item["chart_title"],
                output_path=data_path,
                top_n=10,
                year_range=tuple(item["year_range"]),
            )
            last_error = None
            break
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt < 3:
                time.sleep(2 * attempt)
            else:
                raise RuntimeError(
                    f"World Bank fetch failed for {item['slug']} after {attempt} attempts"
                ) from exc
    data = read_json(data_path, {})
    lines = build_longform_lines(item, data)
    write_json(script_path, build_longform_script(lines))

    tts_result = run_kokoro(script_path=script_path, output_path=audio_path)
    timing_lines, last_frame = parse_kokoro_timing_lines(tts_result["timing"])
    timeline_segments = build_longform_timeline_segments(
        data,
        timing_lines,
        INTRO_DURATION_FRAMES,
    )

    props = {
        "title": item["chart_title"],
        "data": data["frames"],
        "metricTitle": item["metric_title"],
        "narrationSrc": f"audio/ragl/{tts_result['audio'].name}",
        "sourceLabel": "Source: World Bank Open Data",
        "timelineSegments": timeline_segments,
        "tickYears": build_longform_tick_years(data),
    }
    write_json(props_path, props)

    render_cmd = [
        "npx",
        "remotion",
        "render",
        "src/index.ts",
        "BarChartRaceVideo",
        str(video_path),
        "--codec",
        "h264",
        "--crf",
        "18",
        "--props",
        str(props_path),
        f"--frames=0-{last_frame + LONGFORM_BUFFER_FRAMES - 1}",
    ]
    subprocess.run(render_cmd, cwd=str(ROOT), check=True)

    return BuildArtifact(
        kind="longform",
        slug=slug,
        video_path=video_path,
        title=item["title"],
        description=build_longform_description(item, data_path),
        tags=["datavault", "data visualization", *item["tags"]],
        is_short=False,
    )


def fetch_pair_metric(
    cache: dict[str, Any],
    indicator: str,
    country_a: str,
    country_b: str,
) -> dict[str, Any]:
    code_a = _resolve_country_code(country_a)
    code_b = _resolve_country_code(country_b)
    cache_key = f"{indicator}|{code_a}|{code_b}"
    if cache_key in cache:
        return cache[cache_key]

    records = fetch_world_bank(indicator, [country_a, country_b])
    by_code: dict[str, dict[str, Any]] = {}
    for record in sorted(records, key=lambda value: value["year"], reverse=True):
        if record["code"] not in by_code:
            by_code[record["code"]] = record

    payload = {
        "a": by_code.get(code_a),
        "b": by_code.get(code_b),
    }
    cache[cache_key] = payload
    return payload


def build_short_stats(
    pair: dict[str, str],
    axis: dict[str, Any],
    cache: dict[str, Any],
) -> list[dict[str, Any]]:
    stats: list[dict[str, Any]] = []
    for metric in axis["metrics"]:
        values = fetch_pair_metric(cache, metric["indicator"], pair["a"], pair["b"])
        a_value = values.get("a")
        b_value = values.get("b")
        if not a_value or not b_value:
            continue
        stats.append(
            {
                "label": metric["label"],
                "valueA": a_value["value"],
                "valueB": b_value["value"],
                "unit": metric["unit"],
                "higherIsBetter": metric["higher_is_better"],
            }
        )
    return stats


def stat_winner(stat: dict[str, Any], country_a: str, country_b: str) -> str:
    if stat["valueA"] == stat["valueB"]:
        return "tie"
    if stat["higherIsBetter"]:
        return country_a if stat["valueA"] > stat["valueB"] else country_b
    return country_a if stat["valueA"] < stat["valueB"] else country_b


def build_short_lines(pair: dict[str, str], axis: dict[str, Any], stats: list[dict[str, Any]]) -> list[str]:
    a = pair["a"]
    b = pair["b"]
    lines = [f"{a} versus {b}. {axis['label']} only. Who comes out ahead?"]

    score_a = 0
    score_b = 0
    for stat in stats[:5]:
        winner = stat_winner(stat, a, b)
        if winner == a:
            score_a += 1
        elif winner == b:
            score_b += 1

        lead_phrase = "leans"
        if winner == "tie":
            lines.append(
                f"{stat['label']} is basically even: {a} at {format_number(stat['valueA'], stat['unit'])}, {b} at {format_number(stat['valueB'], stat['unit'])}."
            )
        else:
            lines.append(
                f"{stat['label']} {lead_phrase} {winner}. {a}: {format_number(stat['valueA'], stat['unit'])}. {b}: {format_number(stat['valueB'], stat['unit'])}."
            )

    if score_a == score_b:
        lines.append(f"That leaves the scoreboard tied between {a} and {b}.")
    elif score_a > score_b:
        lines.append(f"On this axis, {a} takes the overall edge by the numbers.")
    else:
        lines.append(f"On this axis, {b} takes the overall edge by the numbers.")

    lines.append("Tell Datavault which rivalry should go next.")
    return lines


def build_short_description(title: str, pair: dict[str, str], axis: dict[str, Any]) -> str:
    return (
        f"{title}\n\n"
        f"A Datavault rivalry short comparing {pair['a']} and {pair['b']} across the {axis['label'].lower()}.\n"
        "Source: World Bank Open Data.\n\n"
        f"#shorts #datavault #{slugify(pair['a'])} #{slugify(pair['b'])}"
    )


def build_short_item(item: dict[str, Any], cache: dict[str, Any]) -> BuildArtifact:
    pair = item["pair"]
    axis = item["axis"]
    slug = item["slug"]

    data_path = DATA_DIR / f"{slug}_data.json"
    script_path = SCRIPT_DIR / f"{slug}_script.json"
    props_path = PROPS_DIR / f"{slug}_props.json"
    thumb_props_path = PROPS_DIR / f"{slug}_thumb_props.json"
    audio_path = AUDIO_DIR / f"{slug}.wav"
    thumbnail_path = THUMB_DIR / f"{slug}.png"
    video_path = OUT_DIR / f"{slug}.mp4"

    if video_path.exists() and data_path.exists():
        payload = read_json(data_path, {})
        return BuildArtifact(
            kind="short",
            slug=slug,
            video_path=video_path,
            title=payload["seo"]["title"],
            description=payload["seo"]["description"],
            tags=payload["seo"]["tags"],
            is_short=True,
            thumbnail_path=thumbnail_path if thumbnail_path.exists() else None,
        )

    stats = build_short_stats(pair, axis, cache)
    if len(stats) < 4:
        raise RuntimeError(f"Insufficient stats for {slug}; got {len(stats)} usable metrics")

    lines = build_short_lines(pair, axis, stats)
    payload = {
        "lines": lines,
        "data": {
            "countryA": pair["a"].upper(),
            "countryB": pair["b"].upper(),
            "flagA": pair["flagA"],
            "flagB": pair["flagB"],
            "colorA": pair["colorA"],
            "colorB": pair["colorB"],
            "stats": stats[:5],
        },
        "seo": {
            "title": item["title"],
            "description": build_short_description(item["title"], pair, axis),
            "tags": [
                "datavault",
                slugify(pair["a"]),
                slugify(pair["b"]),
                *axis["tags"],
            ],
        },
    }
    write_json(data_path, payload)

    segments = []
    cursor = 0
    for line in lines:
        segments.append({"text": line, "startFrame": cursor, "endFrame": cursor + 150})
        cursor += 150
    write_json(script_path, {"segments": segments})

    tts_result = run_kokoro(script_path=script_path, output_path=audio_path)
    timing_lines, last_frame = parse_kokoro_timing_lines(tts_result["timing"])

    props = {
        "countryA": payload["data"]["countryA"],
        "countryB": payload["data"]["countryB"],
        "flagA": payload["data"]["flagA"],
        "flagB": payload["data"]["flagB"],
        "colorA": payload["data"]["colorA"],
        "colorB": payload["data"]["colorB"],
        "stats": payload["data"]["stats"],
        "narrationSrc": f"audio/ragl/{tts_result['audio'].name}",
        "timingLines": timing_lines,
    }
    write_json(props_path, props)

    thumb_props = {
        "mode": "country",
        "title": f"{payload['data']['countryA']} VS {payload['data']['countryB']}",
        "subtitle": axis["label"],
        "countryA": payload["data"]["countryA"],
        "countryB": payload["data"]["countryB"],
        "flagA": payload["data"]["flagA"],
        "flagB": payload["data"]["flagB"],
        "colorA": payload["data"]["colorA"],
        "colorB": payload["data"]["colorB"],
        "stats": payload["data"]["stats"][:3],
    }
    write_json(thumb_props_path, thumb_props)

    still_cmd = [
        "npx",
        "remotion",
        "still",
        "src/index.ts",
        "ComparisonThumbnailGeneric",
        str(thumbnail_path),
        "--frame=0",
        "--props",
        str(thumb_props_path),
    ]
    subprocess.run(still_cmd, cwd=str(ROOT), check=True)

    render_cmd = [
        "npx",
        "remotion",
        "render",
        "src/index.ts",
        "CountryVsShortGeneric",
        str(video_path),
        "--codec",
        "h264",
        "--crf",
        "18",
        "--props",
        str(props_path),
        f"--frames=0-{last_frame + SHORT_BUFFER_FRAMES - 1}",
    ]
    subprocess.run(render_cmd, cwd=str(ROOT), check=True)

    return BuildArtifact(
        kind="short",
        slug=slug,
        video_path=video_path,
        title=payload["seo"]["title"],
        description=payload["seo"]["description"],
        tags=payload["seo"]["tags"],
        is_short=True,
        thumbnail_path=thumbnail_path,
    )


def load_uploaded_entries() -> list[dict[str, Any]]:
    uploaded_path = ROOT / "uploaded.json"
    payload = read_json(uploaded_path, {"uploaded": []})
    return payload.get("uploaded", [])


def find_existing_upload(video_path: Path, title: str) -> dict[str, Any] | None:
    resolved_video = str(video_path.resolve())
    for entry in reversed(load_uploaded_entries()):
        source_file = entry.get("source_file")
        if source_file and Path(source_file).expanduser().resolve() == Path(resolved_video):
            return entry
        if entry.get("title") == title:
            return entry
    return None


def upload_artifact(artifact: BuildArtifact) -> dict[str, Any]:
    existing = find_existing_upload(artifact.video_path, artifact.title)
    if existing:
        return {"status": "duplicate", "url": existing.get("url"), "video_id": existing.get("video_id")}

    cmd = [
        "python3",
        "pipeline/upload.py",
        str(artifact.video_path),
        "--title",
        artifact.title,
        "--description",
        artifact.description,
        "--tags",
        ",".join(artifact.tags),
        "--category",
        "education",
    ]
    if artifact.is_short:
        cmd.append("--short")
    if artifact.thumbnail_path and artifact.thumbnail_path.exists():
        cmd.extend(["--thumbnail", str(artifact.thumbnail_path)])

    result = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    output = f"{result.stdout}\n{result.stderr}".strip()
    uploaded = find_existing_upload(artifact.video_path, artifact.title)
    if uploaded:
        return {"status": "uploaded", "url": uploaded.get("url"), "video_id": uploaded.get("video_id"), "log": output}

    lowered = output.lower()
    if "quota exceeded" in lowered or "quotaexceeded" in lowered:
        return {"status": "quota", "log": output}
    if "duplicate" in lowered:
        return {"status": "duplicate", "log": output}
    return {"status": "failed", "log": output}


def mark_completed(state: dict[str, Any], item: dict[str, Any], artifact: BuildArtifact, upload_result: dict[str, Any]) -> None:
    state["completed"][item["slug"]] = {
        "kind": artifact.kind,
        "title": artifact.title,
        "url": upload_result.get("url"),
        "video_id": upload_result.get("video_id"),
        "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    state["history"].append(
        {
            "slug": item["slug"],
            "status": upload_result["status"],
            "title": artifact.title,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "url": upload_result.get("url"),
        }
    )
    state["blocked"] = None


def run_item(item: dict[str, Any], cache: dict[str, Any]) -> BuildArtifact:
    if item["kind"] == "longform":
        return build_longform_item(item)
    return build_short_item(item, cache)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the next Datavault RAGL campaign item(s)")
    parser.add_argument("--max-items", type=int, default=1, help="How many queue items to attempt this run")
    parser.add_argument("--skip-upload", action="store_true", help="Build assets without uploading")
    parser.add_argument("--list", action="store_true", help="Print the queue and exit")
    args = parser.parse_args()

    ensure_dirs()
    state = load_campaign_state()
    cache = load_indicator_cache()

    if args.list:
        for index, item in enumerate(queue_items(), start=1):
            done = "DONE" if item["slug"] in state.get("completed", {}) else "PENDING"
            print(f"{index:02d}. [{done}] {item['title']}")
        return

    items = next_pending_items(state, args.max_items)
    if not items:
        print("Datavault campaign complete.")
        return

    for item in items:
        print(f"\n=== {item['kind'].upper()} :: {item['title']} ===")
        artifact = run_item(item, cache)
        save_indicator_cache(cache)

        if args.skip_upload:
            state["history"].append(
                {
                    "slug": item["slug"],
                    "status": "built_only",
                    "title": artifact.title,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
            )
            save_campaign_state(state)
            print(f"Built without upload: {artifact.video_path}")
            continue

        upload_result = upload_artifact(artifact)
        if upload_result["status"] in {"uploaded", "duplicate"}:
            mark_completed(state, item, artifact, upload_result)
            save_campaign_state(state)
            print(f"Completed: {artifact.title}")
            if upload_result.get("url"):
                print(upload_result["url"])
            continue

        state["blocked"] = {
            "slug": item["slug"],
            "title": artifact.title,
            "status": upload_result["status"],
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "log": upload_result.get("log", ""),
        }
        save_campaign_state(state)
        print(upload_result.get("log", "Upload blocked"))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
