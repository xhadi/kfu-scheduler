# backend/utils.py
import os
import requests
from datetime import time
import re

def parse_time_string(time_str: str) -> tuple[time, time]:
    """
    Takes a KFU time string like "0900 - 1015" or "1300 - 1415"
    And returns a tuple of native Python time objects.
    """
    cleaned = time_str.replace(" ", "")
    match = re.match(r"(\d{4})-(\d{4})", cleaned)
    if not match:
        return time(0, 0), time(0, 0)
    start_raw, end_raw = match.groups()
    start_time = time(hour=int(start_raw[:2]), minute=int(start_raw[2:]))
    end_time = time(hour=int(end_raw[:2]), minute=int(end_raw[2:]))
    return start_time, end_time


def _escape_markdown(text: str) -> str:
    """Escape Telegram legacy Markdown special characters."""
    for char in ("_", "*", "[", "]", "`"):
        text = text.replace(char, f"\\{char}")
    return text


def send_telegram_alert(message: str, level: str = "warning") -> bool:
    """
    Send a Markdown-formatted alert to Telegram.
    Returns True if the request succeeded, False otherwise.
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return False

    level_tag = {"warning": "⚠️ WARNING", "critical": "🚨 CRITICAL"}.get(level, level)
    text = _escape_markdown(f"{level_tag}:\n{message}")

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        return True
    except requests.RequestException:
        return False