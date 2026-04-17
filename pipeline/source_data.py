#!/usr/bin/env python3
"""Data sourcing module for Datavault.

Pulls data from public APIs (World Bank, REST Countries) and saves JSON
matching the TypeScript types defined in src/lib/types.ts.

Usage:
    python source_data.py bar-race --indicator SP.POP.TOTL --title "Population" --out data/population.json
    python source_data.py country-vs --a "United States" --b "China" --out data/usa-vs-china.json
"""

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]
_REAL_COUNTRY_CODES: set[str] | None = None

# ── World Bank helpers ──────────────────────────────────────────────────────

WB_BASE = "https://api.worldbank.org/v2"

# ISO-3166 alpha-3 codes for the most-requested countries
COUNTRY_CODES: dict[str, str] = {
    "United States": "USA",
    "China": "CHN",
    "India": "IND",
    "Japan": "JPN",
    "Germany": "DEU",
    "United Kingdom": "GBR",
    "France": "FRA",
    "Brazil": "BRA",
    "Italy": "ITA",
    "Canada": "CAN",
    "Russia": "RUS",
    "South Korea": "KOR",
    "Australia": "AUS",
    "Mexico": "MEX",
    "Indonesia": "IDN",
    "Turkey": "TUR",
    "Saudi Arabia": "SAU",
    "Nigeria": "NGA",
    "Argentina": "ARG",
    "South Africa": "ZAF",
    "Egypt": "EGY",
    "Pakistan": "PAK",
    "Bangladesh": "BGD",
    "Vietnam": "VNM",
    "Thailand": "THA",
    "Spain": "ESP",
    "Poland": "POL",
    "Netherlands": "NLD",
    "Switzerland": "CHE",
    "Sweden": "SWE",
}

# Common World Bank indicator codes
INDICATORS: dict[str, str] = {
    "population": "SP.POP.TOTL",
    "gdp": "NY.GDP.MKTP.CD",
    "gdp_per_capita": "NY.GDP.PCAP.CD",
    "life_expectancy": "SP.DYN.LE00.IN",
    "co2_emissions": "EN.ATM.CO2E.KT",
    "military_spending": "MS.MIL.XPND.CD",
    "internet_users": "IT.NET.USER.ZS",
    "literacy_rate": "SE.ADT.LITR.ZS",
    "unemployment": "SL.UEM.TOTL.ZS",
    "inflation": "FP.CPI.TOTL.ZG",
}

# Default palette for bar chart entries (10 distinct colours)
BAR_COLORS = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
]


def _resolve_country_code(name: str) -> str:
    """Resolve a country name to its ISO alpha-3 code."""
    if len(name) == 3 and name.isupper():
        return name  # already a code
    if name in COUNTRY_CODES:
        return COUNTRY_CODES[name]
    # Try case-insensitive match
    for full, code in COUNTRY_CODES.items():
        if full.lower() == name.lower():
            return code
    log.warning("Unknown country '%s' — passing as-is to World Bank API", name)
    return name


def fetch_world_bank(
    indicator: str,
    countries: list[str] | None = None,
    years: tuple[int, int] | None = None,
    *,
    exclude_aggregates: bool = False,
) -> list[dict[str, Any]]:
    """Fetch data from the World Bank API.

    Args:
        indicator: World Bank indicator code (e.g. "SP.POP.TOTL").
        countries: List of country names or ISO codes.  None = all.
        years: (start_year, end_year) range.  None = all available.

    Returns:
        List of dicts with keys: country, code, year, value.
    """
    if countries:
        codes = ";".join(_resolve_country_code(c) for c in countries)
    else:
        codes = "all"

    url = f"{WB_BASE}/country/{codes}/indicator/{indicator}"
    params: dict[str, Any] = {"format": "json", "per_page": 1000}
    if years:
        params["date"] = f"{years[0]}:{years[1]}"

    log.info("GET %s  params=%s", url, params)
    all_records: list[dict[str, Any]] = []
    page = 1

    real_country_codes = _load_real_country_codes() if exclude_aggregates else None

    while True:
        params["page"] = page
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        payload = resp.json()

        if not isinstance(payload, list) or len(payload) < 2:
            log.error("Unexpected API response: %s", str(payload)[:300])
            break

        meta, data = payload[0], payload[1]
        if data is None:
            log.warning("No data returned for indicator %s", indicator)
            break

        for entry in data:
            code = entry["countryiso3code"]
            if exclude_aggregates and real_country_codes and code not in real_country_codes:
                continue
            if entry.get("value") is not None:
                all_records.append({
                    "country": entry["country"]["value"],
                    "code": code,
                    "year": int(entry["date"]),
                    "value": entry["value"],
                })

        if page >= meta.get("pages", 1):
            break
        page += 1

    log.info("Fetched %d records for %s", len(all_records), indicator)
    return all_records


def _load_real_country_codes() -> set[str]:
    """Load the World Bank's non-aggregate ISO3 country list once per process."""
    global _REAL_COUNTRY_CODES
    if _REAL_COUNTRY_CODES is not None:
        return _REAL_COUNTRY_CODES

    url = f"{WB_BASE}/country"
    resp = requests.get(url, params={"format": "json", "per_page": 400}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    if not isinstance(payload, list) or len(payload) < 2:
        raise RuntimeError("Unexpected country payload from World Bank API")

    countries = payload[1] or []
    _REAL_COUNTRY_CODES = {
        country["id"]
        for country in countries
        if country.get("id")
        and country.get("region", {}).get("value") != "Aggregates"
    }
    return _REAL_COUNTRY_CODES


def fetch_country_comparison(
    country_a: str,
    country_b: str,
) -> dict[str, Any]:
    """Aggregate multiple stats for two countries (latest available year).

    Returns a dict matching the CountryVsData TypeScript type.
    """
    comparison_indicators = {
        "Population": ("SP.POP.TOTL", "people", True),
        "GDP": ("NY.GDP.MKTP.CD", "USD", True),
        "GDP per Capita": ("NY.GDP.PCAP.CD", "USD", True),
        "Life Expectancy": ("SP.DYN.LE00.IN", "years", True),
        "CO2 Emissions": ("EN.ATM.CO2E.KT", "kt", False),
        "Military Spending": ("MS.MIL.XPND.CD", "USD", None),
        "Internet Users (%)": ("IT.NET.USER.ZS", "%", True),
        "Unemployment (%)": ("SL.UEM.TOTL.ZS", "%", False),
    }

    code_a = _resolve_country_code(country_a)
    code_b = _resolve_country_code(country_b)
    stats: list[dict[str, Any]] = []

    for label, (indicator, unit, higher_better) in comparison_indicators.items():
        log.info("Fetching %s for %s vs %s ...", label, country_a, country_b)
        try:
            records = fetch_world_bank(indicator, [code_a, code_b])
        except Exception as exc:
            log.warning("Failed to fetch %s: %s", label, exc)
            continue

        if not records:
            continue

        # Get latest available value for each country
        by_country: dict[str, float | None] = {}
        for r in sorted(records, key=lambda x: x["year"], reverse=True):
            if r["code"] not in by_country:
                by_country[r["code"]] = r["value"]

        val_a = by_country.get(code_a)
        val_b = by_country.get(code_b)
        if val_a is not None and val_b is not None:
            stat: dict[str, Any] = {
                "label": label,
                "valueA": val_a,
                "valueB": val_b,
                "unit": unit,
            }
            if higher_better is not None:
                stat["higherIsBetter"] = higher_better
            stats.append(stat)

    return {
        "countryA": country_a,
        "countryB": country_b,
        "stats": stats,
    }


# ── Save functions (match TS types) ────────────────────────────────────────

def save_bar_race_data(
    indicator: str,
    title: str,
    output_path: str | Path,
    *,
    top_n: int = 10,
    year_range: tuple[int, int] = (1960, 2023),
) -> Path:
    """Fetch time-series data and save as BarChartFrame[] JSON.

    Each frame represents one year with the top N countries.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    records = fetch_world_bank(indicator, years=year_range, exclude_aggregates=True)
    if not records:
        raise RuntimeError(f"No data for indicator {indicator}")

    # Group by year
    by_year: dict[int, list[dict]] = {}
    for r in records:
        by_year.setdefault(r["year"], []).append(r)

    frames: list[dict[str, Any]] = []
    for year in sorted(by_year.keys()):
        entries_raw = sorted(by_year[year], key=lambda x: x["value"], reverse=True)
        entries = []
        for i, e in enumerate(entries_raw[:top_n]):
            entries.append({
                "name": e["country"],
                "value": e["value"],
                "color": BAR_COLORS[i % len(BAR_COLORS)],
            })
        frames.append({"year": year, "entries": entries})

    output = {
        "title": title,
        "type": "bar-race",
        "indicator": indicator,
        "frames": frames,
    }

    out.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    log.info("Saved %d frames to %s", len(frames), out)
    return out


def save_comparison_data(
    country_a: str,
    country_b: str,
    output_path: str | Path,
) -> Path:
    """Fetch comparison stats and save as CountryVsData JSON."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    data = fetch_country_comparison(country_a, country_b)

    out.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    log.info("Saved %d stats to %s", len(data["stats"]), out)
    return out


# ── CLI ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Datavault data sourcing pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python source_data.py bar-race --indicator SP.POP.TOTL "
            '--title "Population" --out data/population.json\n'
            "  python source_data.py country-vs "
            '--a "United States" --b "China" --out data/usa-vs-china.json\n'
        ),
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # bar-race
    br = sub.add_parser("bar-race", help="Fetch bar-chart-race data")
    br.add_argument("--indicator", required=True, help="World Bank indicator code")
    br.add_argument("--title", required=True, help="Human-readable title")
    br.add_argument("--out", required=True, help="Output JSON path")
    br.add_argument("--top", type=int, default=10, help="Top N countries per frame")
    br.add_argument("--start", type=int, default=1960, help="Start year")
    br.add_argument("--end", type=int, default=2023, help="End year")

    # country-vs
    cv = sub.add_parser("country-vs", help="Fetch country-vs-country comparison data")
    cv.add_argument("--a", required=True, dest="country_a", help="Country A name")
    cv.add_argument("--b", required=True, dest="country_b", help="Country B name")
    cv.add_argument("--out", required=True, help="Output JSON path")

    args = parser.parse_args()

    if args.command == "bar-race":
        save_bar_race_data(
            indicator=args.indicator,
            title=args.title,
            output_path=ROOT / args.out,
            top_n=args.top,
            year_range=(args.start, args.end),
        )
    elif args.command == "country-vs":
        save_comparison_data(
            country_a=args.country_a,
            country_b=args.country_b,
            output_path=ROOT / args.out,
        )


if __name__ == "__main__":
    main()
