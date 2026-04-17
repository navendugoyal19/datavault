#!/usr/bin/env python3
"""Authenticate with YouTube API for the Datavault channel.
Two modes:
  1. python auth.py          — prints auth URL, starts local server, waits for redirect
  2. python auth.py --code X — exchanges an auth code for a token directly
"""

import json, sys, argparse, threading
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parents[1]
CLIENT_SECRET = ROOT / "client_secret.json"
TOKEN_PATH = ROOT / "youtube_token.json"
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
]
PORT = 8091

# Shared state
auth_code = None

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        qs = parse_qs(urlparse(self.path).query)
        auth_code = qs.get("code", [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<h2>Authentication successful! You can close this tab.</h2>")

    def log_message(self, *args):
        pass  # suppress logs

def save_token(credentials):
    token_data = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": list(credentials.scopes or SCOPES),
        "universe_domain": "googleapis.com",
        "account": "",
    }
    TOKEN_PATH.write_text(json.dumps(token_data, indent=2))
    print(f"Token saved to {TOKEN_PATH}")

def main():
    global auth_code

    if TOKEN_PATH.exists():
        print(f"Token already exists at {TOKEN_PATH}")
        print("Delete it first if you want to re-authenticate.")
        return

    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
    flow.redirect_uri = f"http://localhost:{PORT}/"
    auth_url, state = flow.authorization_url(prompt="consent", access_type="offline")

    # Print the URL clearly
    sys.stdout.write(f"AUTH_URL={auth_url}\n")
    sys.stdout.flush()

    # Start HTTP server to catch callback
    server = HTTPServer(("localhost", PORT), CallbackHandler)
    sys.stdout.write(f"SERVER_READY=true\n")
    sys.stdout.flush()

    # Handle one request (the OAuth callback)
    server.handle_request()
    server.server_close()

    if auth_code:
        flow.fetch_token(code=auth_code)
        save_token(flow.credentials)
        print("YouTube API is ready for Datavault!")
    else:
        print("ERROR: No auth code received")
        sys.exit(1)

if __name__ == "__main__":
    main()
