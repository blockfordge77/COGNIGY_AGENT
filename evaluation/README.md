# Agent evaluation harness (Python + Pytest)

Automated happy-path regression suite for the Aurora Outdoors agent. It mirrors
`demo/demo-script.md` one-to-one.

## Why this exists

Agent instructions and tool descriptions behave like code: any edit can silently change
tool selection or grounding. This suite runs after every such change and covers the
behaviors that matter:

- **Grounding** — FAQ answers contain the facts from the knowledge source (30 days, 4.95 EUR)
- **Tool selection** — order questions call the order tool; return requests open the xApp
  instead of interrogating the customer in chat
- **Anti-hallucination** — a lookup for a non-existent order must say "not found", never
  invent data
- **Locale switching** — German request flips the conversation, and German FAQs are grounded
  in the German knowledge store

Assertions are keyword-invariants, not exact strings — LLM phrasing varies run to run, but a
correct answer about AO-1001 always mentions DHL.

## Setup

1. In Cognigy, add a **REST endpoint** bound to the same Main flow as the Webchat endpoint.
2. Copy the endpoint URL, then:

```bash
cd evaluation
python -m venv .venv && . .venv/Scripts/activate   # Windows; use bin/activate on macOS/Linux
pip install -r requirements.txt
export COGNIGY_REST_ENDPOINT_URL="https://endpoint-trial.cognigy.ai/<your-endpoint-token>"
pytest -v
```

Without the env var the suite skips cleanly (no false failures in CI checkout).

## Notes

- Each test gets a **fresh sessionId** (see `conftest.py`) so dialog state never leaks
  between tests; multi-turn tests drive the turns explicitly.
- Transient endpoint/LLM errors are retried twice with backoff before failing.
- The suite writes real rows (tickets) — run `tools/reset-demo` afterwards to clean up.
- Response-shape parsing is tolerant (`outputs[].text` / `outputs[].data` / legacy `text`);
  see `flows/VERIFIED-NOTES.md` and adjust `AgentReply.from_response` if your endpoint
  version differs.
