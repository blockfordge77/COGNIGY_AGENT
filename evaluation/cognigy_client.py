"""Minimal client for a Cognigy REST Endpoint, used by the happy-path evaluation suite.

A Cognigy REST Endpoint accepts POST { userId, sessionId, text, data } and returns the
flow's output messages synchronously — ideal for deterministic regression tests of agent
behavior (tool selection, grounding, locale switching) without a browser.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field

import requests


@dataclass
class CognigySession:
    """One conversation session against a Cognigy REST endpoint."""

    endpoint_url: str
    user_id: str = "eval-harness"
    session_id: str = field(default_factory=lambda: f"eval-{uuid.uuid4().hex[:12]}")
    timeout_s: float = 30.0

    def say(self, text: str, data: dict | None = None, retries: int = 2) -> "AgentReply":
        """Send one user message and return the agent's combined reply."""
        payload = {
            "userId": self.user_id,
            "sessionId": self.session_id,
            "text": text,
            "data": data or {},
        }
        last_error: Exception | None = None
        for attempt in range(retries + 1):
            try:
                response = requests.post(self.endpoint_url, json=payload, timeout=self.timeout_s)
                response.raise_for_status()
                return AgentReply.from_response(response.json())
            except requests.RequestException as error:  # transient LLM/API hiccups
                last_error = error
                if attempt < retries:
                    time.sleep(1.5 * (attempt + 1))
        raise AssertionError(f"Cognigy endpoint unreachable after {retries + 1} attempts: {last_error}")


@dataclass
class AgentReply:
    texts: list[str]
    data: list[dict]
    raw: dict

    @classmethod
    def from_response(cls, body: dict) -> "AgentReply":
        """REST endpoint responses carry an `outputStack` array of all flow outputs
        (each with `text` / `data`), plus top-level `text`/`data` convenience fields.
        Parse tolerantly so minor version differences don't break the suite."""
        texts: list[str] = []
        data: list[dict] = []
        for output in body.get("outputStack") or body.get("outputs") or []:
            if output.get("text"):
                texts.append(str(output["text"]))
            if output.get("data"):
                data.append(output["data"])
        if not texts and body.get("text"):
            texts.append(str(body["text"]))
        if not data and body.get("data"):
            data.append(body["data"])
        return cls(texts=texts, data=data, raw=body)

    @property
    def full_text(self) -> str:
        return "\n".join(self.texts)

    def assert_contains_any(self, *needles: str) -> None:
        haystack = self.full_text.lower()
        if not any(needle.lower() in haystack for needle in needles):
            raise AssertionError(
                f"Expected one of {needles!r} in agent reply, got:\n{self.full_text!r}"
            )
