#!/usr/bin/env python3
"""Master pipeline runner for Datavault.

Orchestrates the full video production workflow:
  1. Source data (World Bank API)
  2. Generate narration script
  3. Generate TTS narration
  4. Render video (Remotion)
  5. Generate SEO metadata
  6. Upload to YouTube

Each step saves state, so the pipeline can resume if interrupted.

Usage:
    python run.py --topic "population" --type bar-race --upload
    python run.py --topic "USA vs China" --type country-vs --a "United States" --b "China"
    python run.py --topic "GDP" --type bar-race --step source  # Run just one step
"""

import argparse
import asyncio
import json
import logging
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]
PIPELINE = Path(__file__).resolve().parent
STATE_DIR = ROOT / "pipeline_state"

# Add pipeline to path for imports
sys.path.insert(0, str(PIPELINE))

# Indicator shortcuts for the CLI
INDICATOR_SHORTCUTS: dict[str, str] = {
    "population": "SP.POP.TOTL",
    "gdp": "NY.GDP.MKTP.CD",
    "gdp_per_capita": "NY.GDP.PCAP.CD",
    "life_expectancy": "SP.DYN.LE00.IN",
    "co2": "EN.ATM.CO2E.KT",
    "military": "MS.MIL.XPND.CD",
    "internet": "IT.NET.USER.ZS",
    "unemployment": "SL.UEM.TOTL.ZS",
}

STEPS = ["source", "script", "narrate", "render", "seo", "upload"]


def _slug(topic: str) -> str:
    """Convert topic to a filesystem-safe slug."""
    return topic.lower().replace(" ", "-").replace(".", "")


def load_pipeline_state(run_id: str) -> dict[str, Any]:
    """Load or initialize pipeline state for a run."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file = STATE_DIR / f"{run_id}.json"
    if state_file.exists():
        state = json.loads(state_file.read_text())
        log.info("Resuming pipeline run: %s (completed: %s)", run_id, state.get("completed", []))
        return state
    return {
        "run_id": run_id,
        "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "completed": [],
        "paths": {},
        "errors": [],
    }


def save_pipeline_state(state: dict[str, Any]) -> None:
    """Persist pipeline state."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file = STATE_DIR / f"{state['run_id']}.json"
    state_file.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def _load_json(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text())


def _to_public_static_path(path: str | Path) -> str:
    resolved = Path(path).resolve()
    public_root = (ROOT / "public").resolve()
    try:
        return resolved.relative_to(public_root).as_posix()
    except ValueError as exc:
        raise ValueError(f"Expected asset under {public_root}, got {resolved}") from exc


def _build_timing_lines(script: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "index": index,
            "text": segment["text"],
            "startFrame": segment["startFrame"],
            "endFrame": segment["endFrame"],
        }
        for index, segment in enumerate(script.get("segments", []))
    ]


def _build_render_job(state: dict[str, Any], args: argparse.Namespace) -> tuple[str, dict[str, Any], int]:
    data = _load_json(state["paths"]["data"])
    script = _load_json(state["paths"]["script"])
    narration_src = None
    if state["paths"].get("audio"):
        narration_src = _to_public_static_path(state["paths"]["audio"])

    duration = int(script.get("totalFrames") or 0)

    if args.type == "bar-race":
        frames = data.get("frames", [])
        if not frames:
            raise ValueError("Bar-race data JSON is missing 'frames'")
        props = {
            "title": str(data.get("title", args.topic)).upper(),
            "data": frames,
            "metricTitle": str(data.get("title", args.topic)).upper(),
            "narrationSrc": narration_src,
            "sourceLabel": "Source: World Bank",
        }
        return "BarChartRaceVideo", props, duration or 3600

    if args.type == "country-vs":
        props = {
            "countryA": data["countryA"],
            "countryB": data["countryB"],
            "flagA": data.get("flagA", ""),
            "flagB": data.get("flagB", ""),
            "colorA": data.get("colorA", "#00E5FF"),
            "colorB": data.get("colorB", "#FFB800"),
            "stats": data["stats"],
            "narrationSrc": narration_src,
            "timingLines": _build_timing_lines(script),
        }
        return "CountryVsShortGeneric", props, duration or 2700

    raise ValueError(f"Unsupported render type: {args.type}")


def step_source(state: dict, args: argparse.Namespace) -> None:
    """Step 1: Source data from public APIs."""
    from source_data import save_bar_race_data, save_comparison_data

    slug = _slug(args.topic)
    data_dir = ROOT / "data"

    if args.type == "bar-race":
        indicator = INDICATOR_SHORTCUTS.get(args.topic.lower(), args.indicator or args.topic)
        out_path = data_dir / f"{slug}.json"
        save_bar_race_data(
            indicator=indicator,
            title=args.topic.title(),
            output_path=out_path,
        )
        state["paths"]["data"] = str(out_path)
    elif args.type == "country-vs":
        if not args.country_a or not args.country_b:
            raise ValueError("--a and --b required for country-vs")
        out_path = data_dir / f"{_slug(args.country_a)}-vs-{_slug(args.country_b)}.json"
        save_comparison_data(
            country_a=args.country_a,
            country_b=args.country_b,
            output_path=out_path,
        )
        state["paths"]["data"] = str(out_path)

    state["completed"].append("source")
    save_pipeline_state(state)
    log.info("Step 1/6 complete: data sourced")


def step_script(state: dict, args: argparse.Namespace) -> None:
    """Step 2: Generate narration script."""
    from generate_script import generate_bar_race_script, generate_country_vs_script

    data_path = Path(state["paths"]["data"])
    data = json.loads(data_path.read_text())

    if args.type == "bar-race":
        script = generate_bar_race_script(data)
    elif args.type == "country-vs":
        script = generate_country_vs_script(data)
    else:
        raise ValueError(f"Unknown type: {args.type}")

    script_path = data_path.with_name(data_path.stem + "_script.json")
    script_path.write_text(json.dumps(script, indent=2, ensure_ascii=False))

    state["paths"]["script"] = str(script_path)
    state["completed"].append("script")
    save_pipeline_state(state)
    log.info("Step 2/6 complete: script generated (%d segments)", len(script["segments"]))


def step_narrate(state: dict, args: argparse.Namespace) -> None:
    """Step 3: Generate TTS narration."""
    from narrate import run_pipeline

    script_path = Path(state["paths"]["script"])
    slug = _slug(args.topic)
    audio_path = ROOT / "public" / "audio" / f"{slug}_narration.mp3"
    audio_path.parent.mkdir(parents=True, exist_ok=True)

    result = asyncio.run(run_pipeline(
        script_path=script_path,
        output_path=audio_path,
    ))

    state["paths"]["audio"] = str(result["audio"])
    state["paths"]["srt"] = str(result["srt"])
    state["completed"].append("narrate")
    save_pipeline_state(state)
    log.info("Step 3/6 complete: narration generated")


def step_render(state: dict, args: argparse.Namespace) -> None:
    """Step 4: Render video using Remotion."""
    slug = _slug(args.topic)
    out_path = ROOT / "out" / f"{slug}.mp4"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    composition, props, duration = _build_render_job(state, args)

    # Build Remotion render command
    cmd = [
        "npx", "remotion", "render",
        "src/index.ts", composition,
        str(out_path),
        "--codec", "h264",
        "--crf", "18",
        "--frames", f"0-{duration - 1}",
        "--props", json.dumps(props),
    ]

    log.info("Rendering: %s", " ".join(cmd))
    result = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=600,  # 10 minute timeout
    )

    if result.returncode != 0:
        log.error("Render failed:\n%s", result.stderr[-500:] if result.stderr else "no stderr")
        state["errors"].append({
            "step": "render",
            "error": result.stderr[-500:] if result.stderr else "unknown",
        })
        save_pipeline_state(state)
        raise RuntimeError("Remotion render failed")

    state["paths"]["video"] = str(out_path)
    state["completed"].append("render")
    save_pipeline_state(state)
    log.info("Step 4/6 complete: video rendered → %s", out_path)


def step_seo(state: dict, args: argparse.Namespace) -> None:
    """Step 5: Generate SEO metadata."""
    from seo import generate_all_seo

    seo = generate_all_seo(
        topic=args.topic,
        video_type=args.type,
        country_a=getattr(args, "country_a", None),
        country_b=getattr(args, "country_b", None),
    )

    slug = _slug(args.topic)
    seo_path = ROOT / "data" / f"{slug}_seo.json"
    seo_path.write_text(json.dumps(seo, indent=2, ensure_ascii=False))

    state["paths"]["seo"] = str(seo_path)
    state["seo"] = seo
    state["completed"].append("seo")
    save_pipeline_state(state)
    log.info("Step 5/6 complete: SEO metadata generated")
    log.info("  Title: %s", seo["title"])


def step_upload(state: dict, args: argparse.Namespace) -> None:
    """Step 6: Upload to YouTube."""
    from upload import upload_video

    video_path = state["paths"].get("video")
    if not video_path or not Path(video_path).exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    seo = state.get("seo", {})
    title = seo.get("title", args.topic.title())
    description = seo.get("description", "")
    tags = seo.get("tags", [])

    result = upload_video(
        video_path=video_path,
        title=title,
        description=description,
        tags=tags,
        schedule=getattr(args, "schedule", None),
    )

    if result:
        state["paths"]["youtube_url"] = result["url"]
        state["completed"].append("upload")
        save_pipeline_state(state)
        log.info("Step 6/6 complete: uploaded → %s", result["url"])
    else:
        state["errors"].append({"step": "upload", "error": "upload returned None"})
        save_pipeline_state(state)
        raise RuntimeError("Upload failed")


# ── CLI ─────────────────────────────────────────────────────────────────────

STEP_FUNCS = {
    "source": step_source,
    "script": step_script,
    "narrate": step_narrate,
    "render": step_render,
    "seo": step_seo,
    "upload": step_upload,
}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Datavault master pipeline — source, script, narrate, render, SEO, upload",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            '  python run.py --topic "population" --type bar-race\n'
            '  python run.py --topic "USA vs China" --type country-vs '
            '--a "United States" --b "China" --upload\n'
            '  python run.py --topic "GDP" --type bar-race --step source\n'
        ),
    )
    parser.add_argument("--topic", required=True, help="Video topic")
    parser.add_argument(
        "--type",
        required=True,
        choices=["bar-race", "country-vs"],
        help="Video type",
    )
    parser.add_argument("--indicator", help="World Bank indicator code (overrides topic lookup)")
    parser.add_argument("--a", dest="country_a", help="Country A (for country-vs)")
    parser.add_argument("--b", dest="country_b", help="Country B (for country-vs)")
    parser.add_argument(
        "--step",
        choices=STEPS,
        help="Run only a specific step",
    )
    parser.add_argument("--upload", action="store_true", help="Include the upload step")
    parser.add_argument("--schedule", help="Schedule publish time (ISO 8601)")
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
    args = parser.parse_args()

    # Build run ID
    slug = _slug(args.topic)
    run_id = f"{slug}_{args.type}"

    state = load_pipeline_state(run_id) if args.resume else load_pipeline_state(run_id)

    # Determine which steps to run
    if args.step:
        steps_to_run = [args.step]
    else:
        steps_to_run = [s for s in STEPS if s != "upload"]
        if args.upload:
            steps_to_run.append("upload")

    log.info("Pipeline: %s | Steps: %s", run_id, " → ".join(steps_to_run))

    for step_name in steps_to_run:
        if step_name in state["completed"] and args.resume:
            log.info("Skipping %s (already completed)", step_name)
            continue

        log.info("Running step: %s", step_name)
        try:
            STEP_FUNCS[step_name](state, args)
        except Exception as exc:
            log.error("Pipeline failed at step '%s': %s", step_name, exc)
            state["errors"].append({"step": step_name, "error": str(exc)})
            save_pipeline_state(state)
            sys.exit(1)

    log.info("Pipeline complete!")
    if state.get("paths"):
        log.info("Outputs:")
        for key, path in state["paths"].items():
            log.info("  %s: %s", key, path)


if __name__ == "__main__":
    main()
