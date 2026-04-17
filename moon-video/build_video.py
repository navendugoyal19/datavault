#!/usr/bin/env python3

from __future__ import annotations

import argparse
import math
import os
import shlex
import shutil
import subprocess
import sys
import textwrap
import time
import wave
from pathlib import Path
from typing import Any, Iterable, cast

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont

    PILLOW_AVAILABLE = True
except Exception:
    PILLOW_AVAILABLE = False
    Image = ImageDraw = ImageFilter = ImageFont = None  # type: ignore[assignment]

try:
    from kokoro import KPipeline

    KOKORO_AVAILABLE = True
except Exception:
    KOKORO_AVAILABLE = False
    KPipeline = None  # type: ignore[assignment]


BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"
AUDIO_DIR = BASE_DIR / "audio"
NARRATION_TXT = BASE_DIR / "narration.txt"
OUT_DIR = BASE_DIR / "out"
TMP_DIR = OUT_DIR / ".tmp"
SCENES_DIR = TMP_DIR / "scenes"
GENERATED_DIR = ASSETS_DIR / "generated"

VIDEO_SIZE = (1920, 1080)
THUMBNAIL_SIZE = (1280, 720)
FPS = 30
SCENE_TITLE_FONT_SIZE = 48
NARRATION_WAV = AUDIO_DIR / "narration.wav"
MUSIC_MP3 = AUDIO_DIR / "music.mp3"
FINAL_OUTPUT = OUT_DIR / "moon_disappeared.mp4"
THUMBNAIL_OUTPUT = OUT_DIR / "thumbnail.jpg"


SCENES: list[dict[str, Any]] = [
    {"id": 1, "title": "The Night the Moon Vanishes", "narration_start": 0.0, "narration_end": 8.0, "visual_type": "stock_video", "visual_source": "generated/moonrise_clouds.mp4", "overlay_text": "Tonight, the sky changes forever", "duration": 10.0, "transition": 0.5},
    {"id": 2, "title": "A Familiar Light Goes Dark", "narration_start": 8.0, "narration_end": 17.0, "visual_type": "ken_burns_zoom_in", "visual_source": "nasa/full_moon_surface.jpg", "overlay_text": "No warning. No impact. Just gone.", "duration": 10.0, "transition": 0.5},
    {"id": 3, "title": "Darkness Where It Should Be", "narration_start": 17.0, "narration_end": 25.0, "visual_type": "text_only", "visual_source": None, "overlay_text": "What happens next changes Earth forever", "duration": 9.0, "transition": 0.5},
    {"id": 4, "title": "First Shock: The Tides", "narration_start": 25.0, "narration_end": 34.0, "visual_type": "stock_video", "visual_source": "pexels/ocean_tides.mp4", "overlay_text": "The Moon pulls the oceans twice a day", "duration": 10.0, "transition": 0.5},
    {"id": 5, "title": "Gravity and the Oceans", "narration_start": 34.0, "narration_end": 45.0, "visual_type": "split_comparison", "visual_source": "generated/tide_diagram.jpg", "overlay_text": "High tide vs. weakened tide", "duration": 12.0, "transition": 0.5},
    {"id": 6, "title": "Two-Thirds of the Tides Gone", "narration_start": 45.0, "narration_end": 55.0, "visual_type": "counter_animation", "visual_source": None, "overlay_text": "Tidal force drops ~66%", "duration": 11.0, "transition": 0.5},
    {"id": 7, "title": "Coastal Ecosystems Collapse", "narration_start": 55.0, "narration_end": 66.0, "visual_type": "ken_burns_zoom_out", "visual_source": "pixabay/tide_pool_life.jpg", "overlay_text": "Tide pools, reefs, mangroves thrown into chaos", "duration": 12.0, "transition": 0.5},
    {"id": 8, "title": "Millions of Species at Risk", "narration_start": 66.0, "narration_end": 76.0, "visual_type": "stock_video", "visual_source": "pexels/reef_underwater.mp4", "overlay_text": "Extinction pressure begins immediately", "duration": 10.0, "transition": 0.5},
    {"id": 9, "title": "The Ocean Was Just the Beginning", "narration_start": 76.0, "narration_end": 84.0, "visual_type": "text_only", "visual_source": None, "overlay_text": "The Moon moves much more than water", "duration": 8.0, "transition": 0.5},
    {"id": 10, "title": "Earth's Tilt: 23.5 Degrees", "narration_start": 84.0, "narration_end": 94.0, "visual_type": "split_comparison", "visual_source": "generated/earth_tilt_diagram.jpg", "overlay_text": "Tilt creates the seasons", "duration": 10.0, "transition": 0.5},
    {"id": 11, "title": "The Moon Stabilizes the Axis", "narration_start": 94.0, "narration_end": 105.0, "visual_type": "counter_animation", "visual_source": None, "overlay_text": "Moon = gravitational anchor", "duration": 12.0, "transition": 0.5},
    {"id": 12, "title": "Without It, Earth Wobbles", "narration_start": 105.0, "narration_end": 116.0, "visual_type": "stock_video", "visual_source": "generated/spinning_earth.mp4", "overlay_text": "Axial stability begins to fail", "duration": 12.0, "transition": 0.5},
    {"id": 13, "title": "Imagine the Poles Facing the Sun", "narration_start": 116.0, "narration_end": 127.0, "visual_type": "ken_burns_zoom_in", "visual_source": "nasa/antarctica_satellite.jpg", "overlay_text": "Antarctica in blazing sunlight", "duration": 12.0, "transition": 0.5},
    {"id": 14, "title": "Or the Equator Freezing Over", "narration_start": 127.0, "narration_end": 137.0, "visual_type": "ken_burns_zoom_out", "visual_source": "generated/frozen_equator.jpg", "overlay_text": "Climate zones become unstable", "duration": 10.0, "transition": 0.5},
    {"id": 15, "title": "Seasons Become Unpredictable", "narration_start": 137.0, "narration_end": 149.0, "visual_type": "text_only", "visual_source": None, "overlay_text": "Spring. Summer. Fall. Winter. No longer guaranteed.", "duration": 11.0, "transition": 0.5},
    {"id": 16, "title": "A Climate No One Can Forecast", "narration_start": 149.0, "narration_end": 160.0, "visual_type": "stock_video", "visual_source": "pexels/extreme_weather.mp4", "overlay_text": "Chaos replaces regular seasons", "duration": 11.0, "transition": 0.5},
    {"id": 17, "title": "The Moon as Asteroid Shield", "narration_start": 160.0, "narration_end": 170.0, "visual_type": "stock_video", "visual_source": "generated/asteroid_field.mp4", "overlay_text": "Not a wall. A gravity filter.", "duration": 10.0, "transition": 0.5},
    {"id": 18, "title": "Its Gravity Redirects Danger", "narration_start": 170.0, "narration_end": 181.0, "visual_type": "split_comparison", "visual_source": "generated/asteroid_paths.jpg", "overlay_text": "Captured or flung away", "duration": 11.0, "transition": 0.5},
    {"id": 19, "title": "More Impacts Reach Earth", "narration_start": 181.0, "narration_end": 191.0, "visual_type": "counter_animation", "visual_source": None, "overlay_text": "Meteor strike risk climbs", "duration": 10.0, "transition": 0.5},
    {"id": 20, "title": "The Moon Bears the Scars", "narration_start": 191.0, "narration_end": 201.0, "visual_type": "ken_burns_zoom_in", "visual_source": "nasa/moon_craters.jpg", "overlay_text": "Cratered proof of what it absorbed", "duration": 10.0, "transition": 0.5},
    {"id": 21, "title": "The Length of Our Day", "narration_start": 201.0, "narration_end": 211.0, "visual_type": "text_only", "visual_source": None, "overlay_text": "The Moon is quietly slowing Earth down", "duration": 10.0, "transition": 0.5},
    {"id": 22, "title": "A Gravitational Brake", "narration_start": 211.0, "narration_end": 221.0, "visual_type": "counter_animation", "visual_source": None, "overlay_text": "+2 milliseconds per century", "duration": 10.0, "transition": 0.5},
    {"id": 23, "title": "Without It, Rotation Speeds Up", "narration_start": 221.0, "narration_end": 232.0, "visual_type": "stock_video", "visual_source": "generated/earth_timelapse.mp4", "overlay_text": "Days shrink over geological time", "duration": 11.0, "transition": 0.5},
    {"id": 24, "title": "Imagine a 6-Hour Day", "narration_start": 232.0, "narration_end": 244.0, "visual_type": "split_comparison", "visual_source": "generated/day_cycle_comparison.jpg", "overlay_text": "20-hour day vs. 6-hour day", "duration": 12.0, "transition": 0.5},
    {"id": 25, "title": "Plants and Animals Can't Keep Up", "narration_start": 244.0, "narration_end": 255.0, "visual_type": "ken_burns_zoom_out", "visual_source": "pexels/forest_canopy.jpg", "overlay_text": "Photosynthesis and circadian rhythms unravel", "duration": 11.0, "transition": 0.5},
    {"id": 26, "title": "Food Chains Begin to Break", "narration_start": 255.0, "narration_end": 264.0, "visual_type": "stock_video", "visual_source": "pixabay/food_chain_ocean.mp4", "overlay_text": "Every ecosystem feels the shock", "duration": 10.0, "transition": 0.5},
    {"id": 27, "title": "An Invisible Consequence", "narration_start": 264.0, "narration_end": 272.0, "visual_type": "text_only", "visual_source": None, "overlay_text": "Earth's magnetic field may weaken", "duration": 8.0, "transition": 0.5},
    {"id": 28, "title": "Magnetic Shield Under Stress", "narration_start": 272.0, "narration_end": 283.0, "visual_type": "split_comparison", "visual_source": "generated/magnetic_field.jpg", "overlay_text": "Solar wind vs. protected Earth", "duration": 11.0, "transition": 0.5},
    {"id": 29, "title": "Radiation Reaches the Surface", "narration_start": 283.0, "narration_end": 293.0, "visual_type": "counter_animation", "visual_source": None, "overlay_text": "Cancer risk, electronics failures, atmosphere loss", "duration": 11.0, "transition": 0.5},
    {"id": 30, "title": "Earth Starts Looking Like Mars", "narration_start": 293.0, "narration_end": 302.0, "visual_type": "split_comparison", "visual_source": "generated/earth_vs_mars.jpg", "overlay_text": "Protected world vs. stripped world", "duration": 10.0, "transition": 0.5},
    {"id": 31, "title": "The Moon Helped Life Begin", "narration_start": 302.0, "narration_end": 313.0, "visual_type": "ken_burns_zoom_in", "visual_source": "generated/primordial_ocean.jpg", "overlay_text": "Ancient tides stirred the chemistry of life", "duration": 12.0, "transition": 0.5},
    {"id": 32, "title": "No Moon, No Ancient Tidal Mixing", "narration_start": 313.0, "narration_end": 323.0, "visual_type": "stock_video", "visual_source": "generated/early_earth.mp4", "overlay_text": "The first cells may never form", "duration": 11.0, "transition": 0.5},
    {"id": 33, "title": "Eclipses Are Temporary Anyway", "narration_start": 323.0, "narration_end": 334.0, "visual_type": "stock_video", "visual_source": "nasa/solar_eclipse.mp4", "overlay_text": "Even normal lunar drift ends total eclipses someday", "duration": 11.0, "transition": 0.5},
    {"id": 34, "title": "But This Isn't Slow Drift", "narration_start": 334.0, "narration_end": 343.0, "visual_type": "text_only", "visual_source": None, "overlay_text": "Tonight, it disappears instantly", "duration": 9.0, "transition": 0.5},
    {"id": 35, "title": "Recap: What Earth Loses", "narration_start": 343.0, "narration_end": 358.0, "visual_type": "counter_animation", "visual_source": None, "overlay_text": "Tides. Seasons. Shield. Day length. Magnetism. Origins.", "duration": 15.0, "transition": 0.5},
    {"id": 36, "title": "Silent Guardian", "narration_start": 358.0, "narration_end": 371.0, "visual_type": "ken_burns_zoom_out", "visual_source": "nasa/earthrise.jpg", "overlay_text": "Our stability anchor. Our cosmic bodyguard.", "duration": 13.0, "transition": 0.5},
    {"id": 37, "title": "The Reason You Exist", "narration_start": 371.0, "narration_end": 385.0, "visual_type": "stock_video", "visual_source": "generated/earth_from_space.mp4", "overlay_text": "Datavault — Data · Visualized · Compared", "duration": 14.0, "transition": 0.5},
]


def ensure_dirs() -> None:
    for path in [OUT_DIR, TMP_DIR, SCENES_DIR, GENERATED_DIR, AUDIO_DIR]:
        path.mkdir(parents=True, exist_ok=True)


def human_time(seconds: float) -> str:
    seconds = max(0, int(seconds))
    minutes, sec = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours:
        return f"{hours}h {minutes}m {sec}s"
    if minutes:
        return f"{minutes}m {sec}s"
    return f"{sec}s"


class ProgressTracker:
    def __init__(self, total_steps: int, label: str) -> None:
        self.total_steps = max(1, total_steps)
        self.label = label
        self.start = time.time()
        self.completed = 0

    def step(self, detail: str) -> None:
        self.completed += 1
        elapsed = time.time() - self.start
        avg = elapsed / self.completed
        remaining = avg * (self.total_steps - self.completed)
        print(
            f"[{self.label}] {self.completed}/{self.total_steps} - {detail} | "
            f"elapsed {human_time(elapsed)} | eta {human_time(remaining)}"
        )


def check_requirements() -> None:
    problems: list[str] = []
    if shutil.which("ffmpeg") is None:
        problems.append("ffmpeg is not installed or not on PATH")
    if shutil.which("ffprobe") is None:
        problems.append("ffprobe is not installed or not on PATH")
    if not PILLOW_AVAILABLE:
        problems.append("Pillow is not installed")
    if not KOKORO_AVAILABLE:
        problems.append("kokoro is not installed")
    if problems:
        raise SystemExit("Requirement check failed:\n- " + "\n- ".join(problems))


def require_pillow() -> tuple[Any, Any, Any, Any]:
    if not PILLOW_AVAILABLE:
        raise RuntimeError("Pillow is required")
    return cast(Any, Image), cast(Any, ImageDraw), cast(Any, ImageFilter), cast(Any, ImageFont)


def require_kokoro() -> Any:
    if not KOKORO_AVAILABLE:
        raise RuntimeError("kokoro is required")
    return cast(Any, KPipeline)


def run_cmd(command: list[str], description: str) -> None:
    print(f"\n→ {description}\n  {' '.join(shlex.quote(part) for part in command)}")
    subprocess.run(command, check=True)


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def wrap_text(text: str, width: int) -> list[str]:
    return textwrap.wrap(text, width=width, break_long_words=False, replace_whitespace=False) or [text]


def get_font(size: int, bold: bool = False) -> Any:
    _, _, _, image_font = require_pillow()
    candidates = [
        "Arial Bold.ttf",
        "Arial.ttf",
        "Helvetica.ttc",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
    ]
    for candidate in candidates:
        try:
            return image_font.truetype(candidate, size=size)
        except Exception:
            continue
    return image_font.load_default()


def create_space_background(size: tuple[int, int], seed: int = 0) -> Any:
    image_module, image_draw_module, image_filter_module, _ = require_pillow()
    width, height = size
    image = image_module.new("RGB", size, "#040611")
    pixels = image.load()
    for y in range(height):
        t = y / max(1, height - 1)
        r = int(4 + 18 * t)
        g = int(7 + 10 * (1 - t) + 8 * t)
        b = int(17 + 40 * (1 - t) + 45 * t)
        for x in range(width):
            x_t = x / max(1, width - 1)
            glow = int(25 * (1 - abs(0.5 - x_t) * 2))
            pixels[x, y] = (min(255, r + glow // 4), min(255, g + glow // 6), min(255, b + glow))

    draw = image_draw_module.Draw(image)
    star_count = 180 if width >= 1000 else 100
    for idx in range(star_count):
        x = (idx * 127 + seed * 97) % width
        y = (idx * 211 + seed * 53) % height
        radius = 1 + ((idx + seed) % 3)
        alpha = 150 + ((idx * 17) % 105)
        color = (alpha, alpha, min(255, alpha + 20))
        draw.ellipse((x, y, x + radius, y + radius), fill=color)

    for idx, color in enumerate([(85, 60, 180), (40, 120, 220), (120, 50, 160)]):
        glow = image_module.new("RGBA", size, (0, 0, 0, 0))
        glow_draw = image_draw_module.Draw(glow)
        cx = int(width * (0.18 + 0.32 * idx))
        cy = int(height * (0.25 + 0.18 * idx))
        rx = int(width * 0.16)
        ry = int(height * 0.18)
        glow_draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(*color, 60))
        glow = glow.filter(image_filter_module.GaussianBlur(70))
        image = image_module.alpha_composite(image.convert("RGBA"), glow).convert("RGB")

    return image


def create_placeholder_image(path: Path, title: str, subtitle: str = "Placeholder asset") -> None:
    ensure_dirs()
    _, image_draw_module, _, _ = require_pillow()
    background = create_space_background(VIDEO_SIZE, seed=len(title))
    draw = image_draw_module.Draw(background)
    title_font = get_font(82, bold=True)
    subtitle_font = get_font(38)

    lines = wrap_text(title, 24)
    y = 260
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        text_width = bbox[2] - bbox[0]
        x = (VIDEO_SIZE[0] - text_width) / 2
        draw.text((x + 4, y + 4), line, font=title_font, fill=(0, 0, 0))
        draw.text((x, y), line, font=title_font, fill=(255, 255, 255))
        y += 92

    subtitle_lines = wrap_text(subtitle, 42)
    for line in subtitle_lines:
        bbox = draw.textbbox((0, 0), line, font=subtitle_font)
        text_width = bbox[2] - bbox[0]
        x = (VIDEO_SIZE[0] - text_width) / 2
        draw.text((x + 2, y + 2), line, font=subtitle_font, fill=(0, 0, 0))
        draw.text((x, y), line, font=subtitle_font, fill=(255, 215, 130))
        y += 52

    path.parent.mkdir(parents=True, exist_ok=True)
    background.save(path, quality=95)


def create_placeholder_video(path: Path, title: str, duration: float = 8.0) -> None:
    still_path = GENERATED_DIR / f"{path.stem}_placeholder.jpg"
    create_placeholder_image(still_path, title, "Generated because source footage is missing")
    command = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(still_path),
        "-t",
        f"{duration:.2f}",
        "-vf",
        f"scale={VIDEO_SIZE[0]}:{VIDEO_SIZE[1]},format=yuv420p",
        "-r",
        str(FPS),
        "-c:v",
        "libx264",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        str(path),
    ]
    run_cmd(command, f"Create placeholder video {path.name}")


def create_silent_audio(path: Path, duration: float = 30.0) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=24000:cl=mono",
        "-t",
        f"{duration:.2f}",
        "-q:a",
        "9",
        "-acodec",
        "libmp3lame" if path.suffix.lower() == ".mp3" else "pcm_s16le",
        str(path),
    ]
    run_cmd(command, f"Create silent audio {path.name}")



def create_overlay_png(scene: dict[str, Any]) -> Path:
    Image, ImageDraw, _, _ = require_pillow()
    w, h = VIDEO_SIZE
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    kind = scene["visual_type"]

    title_font = get_font(SCENE_TITLE_FONT_SIZE, bold=True)
    title = scene["title"]
    lines = wrap_text(title, width=40)
    y_start = h - 60 - len(lines) * 58
    for line_text in lines:
        bbox = draw.textbbox((0, 0), line_text, font=title_font)
        tw = bbox[2] - bbox[0]
        x = (w - tw) // 2
        draw.text((x + 3, y_start + 3), line_text, font=title_font, fill=(0, 0, 0, 200))
        draw.text((x, y_start), line_text, font=title_font, fill=(255, 255, 255, 255))
        y_start += 58

    overlay_text = scene.get("overlay_text")
    if overlay_text:
        overlay_font = get_font(32)
        overlay_lines = wrap_text(str(overlay_text), width=55)
        oy = 110
        for oline in overlay_lines:
            bbox = draw.textbbox((0, 0), oline, font=overlay_font)
            tw = bbox[2] - bbox[0]
            ox = (w - tw) // 2
            draw.text((ox + 2, oy + 2), oline, font=overlay_font, fill=(0, 0, 0, 200))
            draw.text((ox, oy), oline, font=overlay_font, fill=(255, 216, 90, 255))
            oy += 42

    if kind == "split_comparison":
        label_font = get_font(42, bold=True)
        for text, cx_ratio, color in [
            ("WITH MOON", 0.23, (255, 255, 255, 255)),
            ("WITHOUT MOON", 0.75, (255, 91, 91, 255)),
        ]:
            bbox = draw.textbbox((0, 0), text, font=label_font)
            tw = bbox[2] - bbox[0]
            x = int(w * cx_ratio - tw / 2)
            draw.text((x + 2, 142), text, font=label_font, fill=(0, 0, 0, 200))
            draw.text((x, 140), text, font=label_font, fill=color)

    if kind == "counter_animation":
        progress_label = str(scene.get("overlay_text") or "System impact")
        big_font = get_font(54, bold=True)
        small_font = get_font(28)
        bbox = draw.textbbox((0, 0), progress_label, font=big_font)
        tw = bbox[2] - bbox[0]
        x = (w - tw) // 2
        draw.text((x + 3, int(h * 0.40) + 3), progress_label, font=big_font, fill=(0, 0, 0, 200))
        draw.text((x, int(h * 0.40)), progress_label, font=big_font, fill=(255, 255, 255, 255))
        draw.text((262, int(h * 0.58) - 48), "0%", font=small_font, fill=(255, 255, 255, 230))
        draw.text((w - 328, int(h * 0.58) - 48), "100%", font=small_font, fill=(255, 255, 255, 230))

    overlay_path = TMP_DIR / f"overlay_{scene['id']:02d}.png"
    overlay_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(overlay_path), "PNG")
    return overlay_path


def build_scene_filter(scene: dict[str, Any], duration: float) -> str:
    frame_count = max(1, int(duration * FPS))
    fade_out_start = max(0.0, duration - scene.get("transition", 0.5))
    fade_filters = [f"fade=t=in:st=0:d={scene.get('transition', 0.5):.2f}", f"fade=t=out:st={fade_out_start:.2f}:d={scene.get('transition', 0.5):.2f}"]
    kind = scene["visual_type"]
    base_filters: list[str]

    if kind == "stock_video":
        base_filters = [
            f"trim=duration={duration:.2f}",
            "setpts=PTS-STARTPTS",
            f"fps={FPS}",
            f"scale={VIDEO_SIZE[0]}:{VIDEO_SIZE[1]}:force_original_aspect_ratio=increase",
            f"crop={VIDEO_SIZE[0]}:{VIDEO_SIZE[1]}",
        ]
    elif kind == "ken_burns_zoom_in":
        base_filters = [
            f"scale={VIDEO_SIZE[0] * 2}:{VIDEO_SIZE[1] * 2}",
            (
                "zoompan="
                f"z='min(zoom+0.0012,1.18)':"
                f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                f"d={frame_count}:s={VIDEO_SIZE[0]}x{VIDEO_SIZE[1]}:fps={FPS}"
            ),
        ]
    elif kind == "ken_burns_zoom_out":
        base_filters = [
            f"scale={VIDEO_SIZE[0] * 2}:{VIDEO_SIZE[1] * 2}",
            (
                "zoompan="
                f"z='if(eq(on,1),1.18,max(1.0,zoom-0.0012))':"
                f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
                f"d={frame_count}:s={VIDEO_SIZE[0]}x{VIDEO_SIZE[1]}:fps={FPS}"
            ),
        ]
    elif kind == "text_only":
        base_filters = [
            f"loop=loop=-1:size={frame_count}:start=0",
            f"fps={FPS}",
            f"scale={VIDEO_SIZE[0]}:{VIDEO_SIZE[1]}",
        ]
    elif kind == "split_comparison":
        base_filters = [
            f"loop=loop=-1:size={frame_count}:start=0",
            f"fps={FPS}",
            f"scale={VIDEO_SIZE[0]}:{VIDEO_SIZE[1]}:force_original_aspect_ratio=increase",
            f"crop={VIDEO_SIZE[0]}:{VIDEO_SIZE[1]}",
            "drawbox=x=iw/2-3:y=0:w=6:h=ih:color=white@0.85:t=fill",
            "drawbox=x=0:y=0:w=iw/2:h=ih:color=black@0.20:t=fill",
            "drawbox=x=iw/2:y=0:w=iw/2:h=ih:color=black@0.38:t=fill",
        ]
    elif kind == "counter_animation":
        base_filters = [
            f"loop=loop=-1:size={frame_count}:start=0",
            f"fps={FPS}",
            f"scale={VIDEO_SIZE[0]}:{VIDEO_SIZE[1]}",
            "drawbox=x=260:y=ih*0.58:w=iw-520:h=46:color=white@0.12:t=fill",
            (
                "drawbox="
                "x=260:y=ih*0.58:"
                "w='(iw-520)*min(1,max(0,t/4))':h=46:"
                "color=#FF4D4D@0.92:t=fill"
            ),
        ]
    else:
        raise ValueError(f"Unsupported visual type: {kind}")

    all_filters = base_filters + fade_filters
    return ",".join(all_filters)


def scene_source_path(scene: dict[str, Any]) -> Path:
    if scene["visual_source"]:
        return ASSETS_DIR / str(scene["visual_source"])
    return GENERATED_DIR / f"scene_{scene['id']:02d}.jpg"


def ensure_scene_source(scene: dict[str, Any]) -> Path:
    path = scene_source_path(scene)
    if path.exists():
        return path

    if scene["visual_source"] is None:
        create_placeholder_image(path, scene["title"], str(scene.get("overlay_text") or "Generated scene background"))
        return path

    if path.suffix.lower() in {".jpg", ".jpeg", ".png"}:
        create_placeholder_image(path, scene["title"], str(scene.get("overlay_text") or "Missing image source"))
    elif path.suffix.lower() == ".mp4":
        create_placeholder_video(path, scene["title"], duration=max(6.0, float(scene["duration"])))
    else:
        fallback = path.with_suffix(".jpg")
        create_placeholder_image(fallback, scene["title"], "Unsupported asset type; using generated image")
        return fallback
    return path


def check_assets() -> dict[str, list[Path]]:
    ensure_dirs()
    report: dict[str, list[Path]] = {"images": [], "videos": [], "missing": []}
    report["images"] = sorted(list(ASSETS_DIR.rglob("*.jpg")) + list(ASSETS_DIR.rglob("*.jpeg")) + list(ASSETS_DIR.rglob("*.png")))
    report["videos"] = sorted(ASSETS_DIR.rglob("*.mp4"))

    if not NARRATION_WAV.exists():
        print("Narration audio missing after TTS generation; creating a silent placeholder.")
        create_silent_audio(NARRATION_WAV.with_suffix(".wav"), duration=ffprobe_duration(MUSIC_MP3) if MUSIC_MP3.exists() else 60.0)

    if not MUSIC_MP3.exists():
        print("Background music missing; creating a silent placeholder track.")
        create_silent_audio(MUSIC_MP3, duration=600.0)

    for scene in SCENES:
        path = ensure_scene_source(scene)
        if not path.exists():
            report["missing"].append(path)

    if report["missing"]:
        raise FileNotFoundError(f"Assets are still missing after placeholder generation: {report['missing']}")

    print(
        f"Asset check complete: {len(report['videos'])} video(s), {len(report['images'])} image(s), "
        f"{len(SCENES)} scene source(s) resolved."
    )
    return report


def write_wav(audio_chunks: Iterable[Any], path: Path, sample_rate: int = 24000) -> None:
    import numpy as np

    merged: list[Any] = []
    for chunk in audio_chunks:
        if chunk is None:
            continue
        array = np.asarray(chunk, dtype=np.float32).flatten()
        if array.size:
            merged.append(array)
    if not merged:
        raise RuntimeError("Kokoro returned no audio chunks")
    final_audio = np.concatenate(merged)
    final_audio = np.clip(final_audio, -1.0, 1.0)
    pcm16 = (final_audio * 32767).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm16.tobytes())


def generate_tts(force: bool = False) -> Path:
    ensure_dirs()
    if NARRATION_WAV.exists() and not force:
        print(f"Narration already exists: {NARRATION_WAV}")
        return NARRATION_WAV

    kokoro_pipeline = require_kokoro()
    narration_text = NARRATION_TXT.read_text(encoding="utf-8").strip()
    if not narration_text:
        raise ValueError("narration.txt is empty")

    print("Generating narration with Kokoro voice af_bella...")
    pipeline = kokoro_pipeline(lang_code="a")
    generator = pipeline(narration_text, voice="af_bella")

    sample_rate = 24000
    chunks: list[Any] = []
    for item in generator:
        item_any = cast(Any, item)
        audio = None
        if isinstance(item, tuple) and len(item) >= 3:
            audio = item[2]
        elif isinstance(item, dict):
            audio = item.get("audio")
            sample_rate = int(item.get("sample_rate", sample_rate))
        elif hasattr(item_any, "audio"):
            audio = item_any.audio
            sample_rate = int(getattr(item_any, "sample_rate", sample_rate))
        if audio is not None:
            chunks.append(audio)

    write_wav(chunks, NARRATION_WAV, sample_rate=sample_rate)
    print(f"Saved narration to {NARRATION_WAV}")
    return NARRATION_WAV


def generate_thumbnails() -> Path:
    image_module, image_draw_module, _, _ = require_pillow()
    ensure_dirs()
    image = create_space_background(THUMBNAIL_SIZE, seed=42).convert("RGB")
    draw = image_draw_module.Draw(image)
    w, h = THUMBNAIL_SIZE

    draw.rectangle((w // 2 - 4, 0, w // 2 + 4, h), fill=(255, 255, 255))

    left_center = (w * 0.25, h * 0.48)
    right_center = (w * 0.75, h * 0.48)
    earth_radius = 170
    moon_radius = 46

    for center, tint in [(left_center, (55, 130, 255)), (right_center, (35, 95, 180))]:
        cx, cy = center
        draw.ellipse((cx - earth_radius, cy - earth_radius, cx + earth_radius, cy + earth_radius), fill=tint, outline=(255, 255, 255), width=4)
        draw.ellipse((cx - 135, cy - 120, cx + 95, cy + 85), fill=(60, 175, 90))
        draw.ellipse((cx - 50, cy - 30, cx + 135, cy + 140), fill=(42, 145, 74))

    left_moon_x = left_center[0] + 225
    left_moon_y = left_center[1] - 130
    draw.ellipse(
        (left_moon_x - moon_radius, left_moon_y - moon_radius, left_moon_x + moon_radius, left_moon_y + moon_radius),
        fill=(235, 235, 245),
        outline=(255, 255, 255),
        width=3,
    )

    dark_overlay = image_module.new("RGBA", THUMBNAIL_SIZE, (0, 0, 0, 0))
    dark_draw = image_draw_module.Draw(dark_overlay)
    dark_draw.rectangle((w // 2, 0, w, h), fill=(0, 0, 0, 110))
    dark_draw.ellipse((right_center[0] - earth_radius, right_center[1] - earth_radius, right_center[0] + earth_radius, right_center[1] + earth_radius), fill=(0, 0, 0, 60))
    image = image_module.alpha_composite(image.convert("RGBA"), dark_overlay).convert("RGB")
    draw = image_draw_module.Draw(image)

    title_font = get_font(98, bold=True)
    accent_font = get_font(72, bold=True)

    main_text = "WITHOUT THE MOON"
    accent_text = "48 HOURS LATER"
    bbox = draw.textbbox((0, 0), main_text, font=title_font)
    text_width = bbox[2] - bbox[0]
    x = (w - text_width) / 2
    y = 42
    draw.text((x + 5, y + 5), main_text, font=title_font, fill=(0, 0, 0))
    draw.text((x, y), main_text, font=title_font, fill=(255, 60, 60))

    bbox2 = draw.textbbox((0, 0), accent_text, font=accent_font)
    text_width2 = bbox2[2] - bbox2[0]
    x2 = (w - text_width2) / 2
    y2 = y + 112
    draw.text((x2 + 4, y2 + 4), accent_text, font=accent_font, fill=(0, 0, 0))
    draw.text((x2, y2), accent_text, font=accent_font, fill=(255, 215, 70))

    draw.text((120, h - 92), "WITH", font=get_font(54, bold=True), fill=(255, 255, 255))
    draw.text((w - 290, h - 92), "WITHOUT", font=get_font(54, bold=True), fill=(255, 95, 95))

    THUMBNAIL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(THUMBNAIL_OUTPUT, quality=95)
    print(f"Saved thumbnail to {THUMBNAIL_OUTPUT}")
    return THUMBNAIL_OUTPUT


def build_scene_clip(scene: dict[str, Any]) -> Path:
    source = ensure_scene_source(scene)
    output = SCENES_DIR / f"scene_{scene['id']:02d}.mp4"
    duration = float(scene["duration"])
    base_filters = build_scene_filter(scene, duration)
    overlay_png = create_overlay_png(scene)

    command = ["ffmpeg", "-y"]
    if source.suffix.lower() == ".mp4":
        command += ["-stream_loop", "-1", "-i", str(source)]
    else:
        command += ["-loop", "1", "-i", str(source)]

    command += [
        "-i", str(overlay_png),
        "-t", f"{duration:.2f}",
        "-filter_complex",
        f"[0:v]{base_filters}[base];[1:v]format=yuva420p[ovr];[base][ovr]overlay=0:0:format=auto",
        "-r", str(FPS),
        "-an",
        "-c:v", "libx264",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        str(output),
    ]
    run_cmd(command, f"Render scene {scene['id']:02d}: {scene['title']}")
    return output


def concatenate_scenes(scene_files: list[Path]) -> Path:
    concat_list = TMP_DIR / "concat_list.txt"
    concat_list.write_text("\n".join(f"file '{path.resolve()}'" for path in scene_files), encoding="utf-8")
    output = TMP_DIR / "concatenated_video.mp4"
    command = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_list),
        "-c",
        "copy",
        str(output),
    ]
    run_cmd(command, "Concatenate scene clips")
    return output


def mux_final_video(video_path: Path) -> Path:
    video_duration = ffprobe_duration(video_path)
    output = FINAL_OUTPUT
    filter_complex = (
        f"[2:a]volume=0.15,atrim=0:{video_duration:.3f},asetpts=N/SR/TB[music];"
        f"[1:a]atrim=0:{video_duration:.3f},asetpts=N/SR/TB[narr];"
        "[narr][music]amix=inputs=2:duration=longest:dropout_transition=2[aout]"
    )
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(video_path),
        "-i",
        str(NARRATION_WAV),
        "-stream_loop",
        "-1",
        "-i",
        str(MUSIC_MP3),
        "-filter_complex",
        filter_complex,
        "-map",
        "0:v:0",
        "-map",
        "[aout]",
        "-c:v",
        "libx264",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        str(output),
    ]
    run_cmd(command, "Mux narration + music into final video")
    return output


def build_video() -> Path:
    ensure_dirs()
    tracker = ProgressTracker(total_steps=len(SCENES) + 2, label="build")
    scene_files: list[Path] = []
    for scene in SCENES:
        scene_files.append(build_scene_clip(scene))
        tracker.step(f"scene {scene['id']:02d} complete")
    concatenated = concatenate_scenes(scene_files)
    tracker.step("scene concatenation complete")
    final_output = mux_final_video(concatenated)
    tracker.step("final mux complete")
    return final_output


def scene_summary() -> None:
    total_duration = sum(float(scene["duration"]) for scene in SCENES)
    print(f"Scene count: {len(SCENES)}")
    print(f"Approximate runtime: {human_time(total_duration)}")
    print(f"Narration file: {NARRATION_TXT}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the Datavault 'What If the Moon Disappeared' documentary video")
    parser.add_argument("--check", action="store_true", help="Only run requirement + asset checks")
    parser.add_argument("--tts-only", action="store_true", help="Only generate narration audio")
    parser.add_argument("--thumbnail-only", action="store_true", help="Only generate thumbnail")
    parser.add_argument("--force-tts", action="store_true", help="Regenerate narration even if narration.wav already exists")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    check_requirements()
    ensure_dirs()
    scene_summary()

    if args.thumbnail_only:
        generate_thumbnails()
        return
    if args.tts_only:
        generate_tts(force=args.force_tts)
        return

    generate_tts(force=args.force_tts)
    generate_thumbnails()
    check_assets()

    if args.check:
        print("Requirement and asset checks passed.")
        return

    final_output = build_video()
    print(f"\n✅ Final video written to {final_output}")
    print(f"✅ Thumbnail written to {THUMBNAIL_OUTPUT}")


if __name__ == "__main__":
    main()
