#!/usr/bin/env python3
"""Delete published Datavault RAGL uploads and reset local queue state."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "campaign_state" / "ragl_state.json"
UPLOADED_PATH = ROOT / "uploaded.json"
TOKEN_PATH = ROOT / "youtube_token.json"
RAGL_DIRS = [
    ROOT / "data" / "ragl",
    ROOT / "public" / "audio" / "ragl",
    ROOT / "out" / "ragl",
]


def load_json(path: Path, default: dict) -> dict:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def youtube_client():
    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH))
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_PATH.write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)


def remove_local_assets(slug: str) -> None:
    for folder in RAGL_DIRS:
        if not folder.exists():
            continue
        for path in folder.rglob(f"{slug}*"):
            if path.is_file():
                path.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Delete RAGL uploads and reset queue state")
    parser.add_argument("slugs", nargs="+", help="RAGL slugs to delete and reset")
    parser.add_argument("--keep-assets", action="store_true", help="Do not delete local audio/data/video files")
    args = parser.parse_args()

    state = load_json(STATE_PATH, {"completed": {}, "history": []})
    uploaded = load_json(UPLOADED_PATH, {"uploaded": []})
    yt = youtube_client()

    completed = state.get("completed", {})
    uploaded_entries = uploaded.get("uploaded", [])
    deleted_ids: set[str] = set()

    for slug in args.slugs:
        item = completed.get(slug)
        if item and item.get("video_id"):
            video_id = item["video_id"]
            yt.videos().delete(id=video_id).execute()
            deleted_ids.add(video_id)

        completed.pop(slug, None)
        state.setdefault("history", []).append(
            {
                "slug": slug,
                "status": "deleted_for_rebuild",
            }
        )

        if not args.keep_assets:
            remove_local_assets(slug)

    uploaded["uploaded"] = [
        entry
        for entry in uploaded_entries
        if entry.get("video_id") not in deleted_ids
    ]

    save_json(STATE_PATH, state)
    save_json(UPLOADED_PATH, uploaded)

    for slug in args.slugs:
        print(f"Rolled back: {slug}")


if __name__ == "__main__":
    main()
