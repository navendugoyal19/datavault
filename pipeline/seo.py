#!/usr/bin/env python3
"""SEO optimization module for Datavault.

Generates titles, descriptions, tags, and thumbnail text optimized
for YouTube discovery and click-through rate.

Usage:
    python seo.py --topic "population by country" --type bar-race
    python seo.py --topic "USA vs China" --type country-vs --data-source "World Bank"
"""

import argparse
import json
import logging
import random
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]

# ── Title templates ─────────────────────────────────────────────────────────

TITLE_TEMPLATES: dict[str, list[str]] = {
    "bar-race": [
        "Top 10 {topic} of All Time (Animated)",
        "{topic} — Bar Chart Race (1960-2023)",
        "How {topic} Changed Over 60 Years",
        "{topic} Ranking — You Won't Believe #1",
        "Which Country Leads in {topic}? (Animated Data)",
        "{topic}: 60 Years in 60 Seconds",
        "The Rise and Fall of {topic} (Bar Chart Race)",
    ],
    "country-vs": [
        "{a} vs {b} — Who Wins?",
        "{a} vs {b} — Complete Comparison",
        "{a} vs {b} — The Numbers Don't Lie",
        "Can {b} Beat {a}? (Data Comparison)",
        "{a} or {b}? Every Metric Compared",
        "{a} vs {b} — You Decide Who Wins",
    ],
    "size-comparison": [
        "{topic} Size Comparison — You Won't Believe #1",
        "How Big Is {topic}? (3D Comparison)",
        "{topic} Compared — Smallest to Largest",
        "{topic} Size Comparison That Will Blow Your Mind",
    ],
}

# ── Tag pools ───────────────────────────────────────────────────────────────

BASE_TAGS = [
    "data visualization", "comparison", "animated data",
    "bar chart race", "infographic", "statistics",
    "world data", "country comparison", "facts",
]

TOPIC_TAGS: dict[str, list[str]] = {
    "population": ["population", "world population", "demographics", "census"],
    "gdp": ["gdp", "economy", "economic growth", "wealth", "richest countries"],
    "military": ["military", "defense spending", "armed forces", "military power"],
    "life expectancy": ["life expectancy", "health", "longevity", "healthcare"],
    "co2": ["co2", "emissions", "climate change", "carbon", "environment"],
    "internet": ["internet", "technology", "digital", "connectivity"],
    "education": ["education", "literacy", "schools", "learning"],
}


def generate_title(
    topic: str,
    video_type: str,
    country_a: str | None = None,
    country_b: str | None = None,
) -> str:
    """Generate a click-worthy but accurate title.

    Args:
        topic: The video topic (e.g. "GDP", "Population").
        video_type: One of bar-race, country-vs, size-comparison.
        country_a: First country (for country-vs).
        country_b: Second country (for country-vs).

    Returns:
        A formatted title string.
    """
    templates = TITLE_TEMPLATES.get(video_type, TITLE_TEMPLATES["bar-race"])
    template = random.choice(templates)

    title = template.format(
        topic=topic.title(),
        a=country_a or "Country A",
        b=country_b or "Country B",
    )

    # Ensure under 100 characters
    if len(title) > 100:
        title = title[:97] + "..."

    return title


def generate_description(
    topic: str,
    video_type: str,
    data_source: str = "World Bank Open Data",
    country_a: str | None = None,
    country_b: str | None = None,
) -> str:
    """Generate a full YouTube description with sections.

    Includes: summary, timestamps placeholder, data credits, and hashtags.
    """
    lines: list[str] = []

    # Hook line
    if video_type == "bar-race":
        lines.append(f"Watch {topic.lower()} change dramatically over 60 years "
                      f"in this animated bar chart race.")
    elif video_type == "country-vs":
        lines.append(f"{country_a} vs {country_b} — a complete data-driven comparison "
                      f"across every metric that matters.")
    else:
        lines.append(f"A stunning visual comparison of {topic.lower()}.")

    lines.append("")

    # Timestamps placeholder
    lines.append("TIMESTAMPS:")
    lines.append("0:00 Intro")
    lines.append("0:05 The Data Begins")
    lines.append("(Add more timestamps after render)")
    lines.append("")

    # Data source credit
    lines.append(f"DATA SOURCE: {data_source}")
    lines.append("All data is publicly available and verified.")
    lines.append("")

    # CTA
    lines.append("If you enjoyed this, LIKE and SUBSCRIBE for more data stories!")
    lines.append("Comment below which comparison you want to see next.")
    lines.append("")

    # Hashtags
    topic_tag = topic.lower().replace(" ", "")
    hashtags = f"#{topic_tag} #datavault #datavisualization #comparison #animated"
    if video_type == "country-vs" and country_a and country_b:
        tag_a = country_a.lower().replace(" ", "")
        tag_b = country_b.lower().replace(" ", "")
        hashtags += f" #{tag_a} #{tag_b}"
    lines.append(hashtags)

    return "\n".join(lines)


def generate_tags(
    topic: str,
    video_type: str,
    country_a: str | None = None,
    country_b: str | None = None,
) -> list[str]:
    """Generate relevant YouTube tags (max 30).

    Combines base tags, topic-specific tags, and video-type tags.
    """
    tags = list(BASE_TAGS)

    # Add topic-specific tags
    topic_lower = topic.lower()
    for key, topic_tags in TOPIC_TAGS.items():
        if key in topic_lower:
            tags.extend(topic_tags)
            break

    # Add type-specific tags
    if video_type == "bar-race":
        tags.extend(["bar chart race", "ranking", "top 10", "animated ranking"])
    elif video_type == "country-vs":
        tags.extend(["versus", "vs", "country comparison", "head to head"])
        if country_a:
            tags.append(country_a.lower())
        if country_b:
            tags.append(country_b.lower())
    elif video_type == "size-comparison":
        tags.extend(["size comparison", "scale", "how big", "3d comparison"])

    # Add the topic itself
    tags.append(topic.lower())

    # Deduplicate and limit
    seen: set[str] = set()
    unique: list[str] = []
    for tag in tags:
        if tag.lower() not in seen:
            seen.add(tag.lower())
            unique.append(tag)
    return unique[:30]


def generate_thumbnail_text(
    topic: str,
    video_type: str,
    country_a: str | None = None,
    country_b: str | None = None,
) -> str:
    """Generate short punchy text for video thumbnails.

    Returns 1-4 words that are bold and readable at small sizes.
    """
    if video_type == "country-vs" and country_a and country_b:
        templates = [
            f"{country_a}\nvs\n{country_b}",
            f"WHO\nWINS?",
            f"{country_a}\nOR\n{country_b}?",
        ]
    elif video_type == "bar-race":
        templates = [
            f"TOP 10\n{topic.upper()[:15]}",
            f"60 YEARS\nOF DATA",
            f"#1 IS\nSHOCKING",
            f"WHO\nLEADS?",
        ]
    else:
        templates = [
            f"{topic.upper()[:15]}\nCOMPARED",
            f"SIZE\nCOMPARISON",
            f"YOU WON'T\nBELIEVE #1",
        ]

    return random.choice(templates)


def generate_all_seo(
    topic: str,
    video_type: str,
    data_source: str = "World Bank Open Data",
    country_a: str | None = None,
    country_b: str | None = None,
) -> dict[str, Any]:
    """Generate all SEO metadata at once.

    Returns a dict with title, description, tags, and thumbnail_text.
    """
    return {
        "title": generate_title(topic, video_type, country_a, country_b),
        "description": generate_description(topic, video_type, data_source, country_a, country_b),
        "tags": generate_tags(topic, video_type, country_a, country_b),
        "thumbnail_text": generate_thumbnail_text(topic, video_type, country_a, country_b),
    }


# ── CLI ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate SEO metadata for a Datavault video",
    )
    parser.add_argument("--topic", required=True, help="Video topic")
    parser.add_argument(
        "--type",
        required=True,
        choices=["bar-race", "country-vs", "size-comparison"],
        help="Video type",
    )
    parser.add_argument("--data-source", default="World Bank Open Data", help="Data source credit")
    parser.add_argument("--a", dest="country_a", help="Country A (for country-vs)")
    parser.add_argument("--b", dest="country_b", help="Country B (for country-vs)")
    parser.add_argument("--out", help="Optional: save JSON output to file")
    args = parser.parse_args()

    seo = generate_all_seo(
        topic=args.topic,
        video_type=args.type,
        data_source=args.data_source,
        country_a=args.country_a,
        country_b=args.country_b,
    )

    # Pretty print
    print("\n" + "=" * 60)
    print(f"TITLE: {seo['title']}")
    print("=" * 60)
    print(f"\nDESCRIPTION:\n{seo['description']}")
    print(f"\nTAGS ({len(seo['tags'])}): {', '.join(seo['tags'])}")
    print(f"\nTHUMBNAIL TEXT:\n{seo['thumbnail_text']}")
    print("=" * 60)

    if args.out:
        out_path = ROOT / args.out if not Path(args.out).is_absolute() else Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(seo, indent=2, ensure_ascii=False))
        log.info("Saved SEO metadata → %s", out_path)


if __name__ == "__main__":
    main()
