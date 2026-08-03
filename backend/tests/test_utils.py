# backend/tests/test_utils.py
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.append(str(Path(__file__).resolve().parent.parent))

from utils import send_telegram_alert

class TestTelegramAlert(unittest.TestCase):
    @patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "test_token", "TELEGRAM_CHAT_ID": "test_chat"})
    @patch("utils.requests.post")
    def test_send_telegram_alert_success(self, mock_post):
        mock_post.return_value = MagicMock()
        mock_post.return_value.raise_for_status = MagicMock()

        result = send_telegram_alert("test message")
        self.assertTrue(result)
        mock_post.assert_called_once()

    @patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "test_token", "TELEGRAM_CHAT_ID": "test_chat"})
    @patch("utils.requests.post")
    def test_send_telegram_alert_critical_level(self, mock_post):
        mock_post.return_value = MagicMock()
        mock_post.return_value.raise_for_status = MagicMock()

        result = send_telegram_alert("db down", level="critical")
        self.assertTrue(result)
        mock_post.assert_called_once()

        url = mock_post.call_args.args[0]
        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(url, "https://api.telegram.org/bottest_token/sendMessage")
        self.assertEqual(payload["chat_id"], "test_chat")
        self.assertEqual(payload["parse_mode"], "Markdown")
        self.assertIn("🚨 CRITICAL", payload["text"])
        self.assertIn("db down", payload["text"])

    @patch.dict(os.environ, {"TELEGRAM_BOT_TOKEN": "test_token", "TELEGRAM_CHAT_ID": "test_chat"})
    @patch("utils.requests.post")
    def test_send_telegram_alert_escapes_markdown(self, mock_post):
        mock_post.return_value = MagicMock()
        mock_post.return_value.raise_for_status = MagicMock()

        result = send_telegram_alert("some_exception_value")
        self.assertTrue(result)

        payload = mock_post.call_args.kwargs["json"]
        self.assertIn(r"⚠️ WARNING:", payload["text"])
        self.assertIn(r"some\_exception\_value", payload["text"])
        self.assertNotIn("some_exception_value", payload["text"])

    @patch.dict(os.environ, {}, clear=True)
    @patch("utils.requests.post")
    def test_send_telegram_alert_missing_env(self, mock_post):
        result = send_telegram_alert("test message")
        self.assertFalse(result)
        mock_post.assert_not_called()

if __name__ == "__main__":
    unittest.main()