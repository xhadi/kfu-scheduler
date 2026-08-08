from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel

from scraper import config
from scraper.sources.base import Source
from schemas import SectionData
from utils import send_telegram_alert


class PipelineResult(BaseModel):
    """Encapsulates the successful output of a scraper pipeline execution."""
    sections: List[SectionData]
    source_used: str
    fallback_reason: Optional[str] = None
    total_sections: int


class Pipeline:
    """
    Scraper pipeline manager implementing fallback orchestration.
    Tries the primary StaticHTMLSource first; falls back to DynamicAPISource if threshold is missed or errors occur.
    Sends Telegram alerts on failure or degradation.
    """
    def __init__(self, term_code: str, sources: Optional[List[Source]] = None):
        self.term_code = term_code
        self.sources = sources or [
            self._load_static_source(),
            #self._load_dynamic_source(),
        ]
        self._last_warning_time: Optional[datetime] = None

    def _load_static_source(self) -> Source:
        from scraper.sources.static_html import StaticHTMLSource
        return StaticHTMLSource()

    #def _load_dynamic_source(self) -> Source:
    #    from scraper.sources.dynamic_api import DynamicAPISource
    #    return DynamicAPISource()

    def _send_warning(self, message: str):
        """Send a warning alert to Telegram, rate-limited to once every 6 hours."""
        now = datetime.now(timezone.utc)
        if self._last_warning_time is None or (now - self._last_warning_time).total_seconds() > 6 * 3600:
            send_telegram_alert(message, level="warning")
            self._last_warning_time = now

    def run(self) -> PipelineResult:
        """Execute sources in order and return valid PipelineResult or raise PipelineError."""
        last_error: Optional[Exception] = None


        for idx, source in enumerate(self.sources):
            try:
                sections = source.fetch_all(self.term_code)
                if idx == 0:
                    # Primary source: strict threshold gate
                    if len(sections) >= config.MIN_SECTIONS_THRESHOLD:
                        return PipelineResult(
                            sections=sections,
                            source_used=source.name,
                            fallback_reason=None,
                            total_sections=len(sections),
                        )
                    self._send_warning(
                        f"{source.name} returned {len(sections)} sections "
                        f"(below threshold {config.MIN_SECTIONS_THRESHOLD})"
                    )
                else:
                    # Fallback source: accept any non-empty result
                    if sections:
                        return PipelineResult(
                            sections=sections,
                            source_used=source.name,
                            fallback_reason=f"{self.sources[0].name} unavailable",
                            total_sections=len(sections),
                        )
            except Exception as exc:
                last_error = exc
                self._send_warning(f"{source.name} failed: {exc}")

        if last_error is not None:
            send_telegram_alert(
                f"All scrapers failed for term {self.term_code}: {last_error}",
                level="critical",
            )
            raise PipelineError(f"All sources failed: {last_error}") from last_error

        send_telegram_alert(
            f"All scrapers returned empty for term {self.term_code}",
            level="critical",
        )
        raise PipelineError("All sources returned empty")


class PipelineError(Exception):
    pass
