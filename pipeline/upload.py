#!/usr/bin/env python3
"""YouTube upload automation for Datavault.

Handles authentication, upload with resumable media, scheduling,
and duplicate tracking via uploaded.json.

Usage:
    python upload.py out/video.mp4 --title "Top 10 Countries" --description "..." --tags "data,comparison"
    python upload.py out/video.mp4 --title "GDP Race" --schedule "2026-04-15T10:00:00Z"
"""

import argparse
import json
import logging
import sys
import time
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]
TOKEN_PATH = ROOT / "youtube_token.json"
STATE_PATH = ROOT / "uploaded.json"

# YouTube Data API category IDs
CATEGORIES = {
    "education": "27",
    "science": "28",
    "entertainment": "24",
    "people": "22",
}

MAX_RETRIES = 3
RETRY_DELAY_BASE = 5  # seconds, doubles each retry


def get_youtube_client():
    """Build an authenticated YouTube API client."""
    if not TOKEN_PATH.exists():
        log.error("youtube_token.json not found at %s", TOKEN_PATH)
        log.error("Run the OAuth flow first to generate this file.")
        sys.exit(1)

    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH))
    if creds.expired and creds.refresh_token:
        log.info("Refreshing expired credentials...")
        creds.refresh(Request())
        # Save refreshed token
        TOKEN_PATH.write_text(creds.to_json())
        log.info("Token refreshed and saved")

    return build("youtube", "v3", credentials=creds)


def load_state() -> dict:
    """Load upload tracking state."""
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text())
    return {"uploaded": []}


def save_state(state: dict) -> None:
    """Persist upload tracking state."""
    STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False))


def is_duplicate(state: dict, video_path: str, title: str) -> bool:
    """Check if this video has already been uploaded."""
    for entry in state["uploaded"]:
        if entry.get("source_file") == video_path or entry.get("title") == title:
            return True
    return False


def upload_video(
    video_path: str | Path,
    title: str,
    description: str = "",
    tags: list[str] | None = None,
    category: str = "education",
    schedule: str | None = None,
    is_short: bool = False,
    thumbnail_path: str | Path | None = None,
) -> dict | None:
    """Upload a video to YouTube.

    Args:
        video_path: Path to the video file.
        title: Video title (max 100 chars).
        description: Video description.
        tags: List of tags (max 30).
        category: Category key (education, science, entertainment, people).
        schedule: ISO 8601 publish time for scheduled publishing.
        is_short: Whether this is a YouTube Short (adds #shorts to title).

    Returns:
        Upload result dict or None on failure.
    """
    video_path = Path(video_path)
    if not video_path.exists():
        log.error("Video file not found: %s", video_path)
        return None

    state = load_state()
    if is_duplicate(state, str(video_path), title):
        log.warning("DUPLICATE: '%s' already uploaded — skipping", title)
        return None

    # Prepare title
    if is_short and "#shorts" not in title.lower():
        title = f"{title} #shorts"
    if len(title) > 100:
        title = title[:97] + "..."

    # Build request body
    category_id = CATEGORIES.get(category, "27")
    privacy = "private" if schedule else "public"

    body: dict = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": (tags or [])[:30],
            "categoryId": category_id,
            "defaultLanguage": "en",
            "defaultAudioLanguage": "en",
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
        },
    }

    if schedule:
        body["status"]["publishAt"] = schedule
        log.info("Scheduled for: %s", schedule)

    # Upload with retry
    yt = get_youtube_client()
    size_mb = video_path.stat().st_size / (1024 * 1024)
    log.info("Uploading: '%s' (%.0f MB)", title, size_mb)

    media = MediaFileUpload(
        str(video_path),
        mimetype="video/mp4",
        resumable=True,
        chunksize=10 * 1024 * 1024,  # 10 MB chunks
    )

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            request = yt.videos().insert(
                part="snippet,status",
                body=body,
                media_body=media,
            )

            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    pct = int(status.progress() * 100)
                    log.info("  Upload progress: %d%%", pct)

            video_id = response["id"]
            url = f"https://youtube.com/watch?v={video_id}"
            log.info("Upload complete: %s", url)

            # Track upload
            entry = {
                "video_id": video_id,
                "title": title,
                "source_file": str(video_path),
                "url": url,
                "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            if schedule:
                entry["publishAt"] = schedule
            if thumbnail_path:
                entry["thumbnail_file"] = str(thumbnail_path)

            if thumbnail_path:
                thumb_file = Path(thumbnail_path)
                if thumb_file.exists():
                    try:
                        thumb_media = MediaFileUpload(str(thumb_file), mimetype="image/png")
                        yt.thumbnails().set(videoId=video_id, media_body=thumb_media).execute()
                        log.info("Thumbnail applied: %s", thumb_file.name)
                        entry["thumbnail_applied"] = True
                    except HttpError as thumb_exc:
                        log.warning("Thumbnail upload skipped: %s", str(thumb_exc)[:220])
                        entry["thumbnail_applied"] = False
                    except Exception as thumb_exc:  # noqa: BLE001
                        log.warning("Thumbnail upload skipped: %s", str(thumb_exc)[:220])
                        entry["thumbnail_applied"] = False
                else:
                    log.warning("Thumbnail not found, skipping: %s", thumb_file)
                    entry["thumbnail_applied"] = False

            state["uploaded"].append(entry)
            save_state(state)

            return entry

        except HttpError as exc:
            error_msg = str(exc)
            if "quotaExceeded" in error_msg or "exceeded" in error_msg.lower():
                log.error("YouTube API quota exceeded — try again tomorrow")
                return None
            if attempt < MAX_RETRIES:
                delay = RETRY_DELAY_BASE * (2 ** (attempt - 1))
                log.warning(
                    "Upload failed (attempt %d/%d): %s — retrying in %ds",
                    attempt, MAX_RETRIES, error_msg[:150], delay,
                )
                time.sleep(delay)
            else:
                log.error("Upload failed after %d attempts: %s", MAX_RETRIES, error_msg[:300])
                return None

    return None


# ── CLI ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upload a video to YouTube (Datavault channel)",
    )
    parser.add_argument("video", help="Path to the video file")
    parser.add_argument("--title", required=True, help="Video title")
    parser.add_argument("--description", default="", help="Video description")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument(
        "--category",
        default="education",
        choices=list(CATEGORIES.keys()),
        help="YouTube category",
    )
    parser.add_argument("--schedule", default=None, help="Publish time (ISO 8601)")
    parser.add_argument("--short", action="store_true", help="Upload as a YouTube Short")
    parser.add_argument("--thumbnail", default=None, help="Optional PNG thumbnail path")
    args = parser.parse_args()

    video_path = ROOT / args.video if not Path(args.video).is_absolute() else Path(args.video)
    tags = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else []

    result = upload_video(
        video_path=video_path,
        title=args.title,
        description=args.description,
        tags=tags,
        category=args.category,
        schedule=args.schedule,
        is_short=args.short,
        thumbnail_path=args.thumbnail,
    )

    if result:
        log.info("Success: %s", result["url"])
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
