# Test plan

Four phases, ordered by dependency. Phase 0 needs only this repository; each later phase
requires the corresponding account or environment.

## Phase 0 — Local (no accounts required)

| # | Command / action | Expected result |
|---|------------------|-----------------|
| 0.1 | `cd extension && npm install && npm run build` | Clean compile, `aurora-airtable-extension.tar.gz` produced |
| 0.2 | `cd extension && npm run smoke` | ALL PASS — 12 assertions against a mocked Airtable API: order found, wrong email rejected, unknown order returns `found: false`, three line items for AO-1002, RMA and ticket created |
| 0.3 | `cd xapp && npm install && npm run build && npx tsc --noEmit` | `dist/rma-form.html` (~25 KB), typecheck clean |
| 0.4 | Open `xapp/dist/rma-form.html` in a browser | Form renders in preview mode with three sample products |
| 0.5 | Click the ThermoFlask | Not selectable — greyed out, "Not returnable" |
| 0.6 | Select the jacket, choose a reason, confirm | Preview-mode notice; the browser console shows the submitted payload (`{action: "rmaSelection", sku: "JKT-STORM-M", ...}`) — the same JSON the flow receives as `input.data` |
| 0.7 | `cd evaluation && python -m pytest -q` | `10 skipped` — the suite skips until `COGNIGY_REST_ENDPOINT_URL` is set; this is the expected offline behavior |

## Phase 1 — Airtable configured (`airtable/SETUP.md`)

Requires `AIRTABLE_TOKEN` and `AIRTABLE_BASE_ID` in the environment.

| # | Command | Expected result |
|---|---------|-----------------|
| 1.1 | The curl request from `airtable/SETUP.md` §4 | One JSON record for AO-1001 |
| 1.2 | `cd extension && npm run smoke` | ALL PASS against the real base — validates token scopes, base ID, table and field names |
| 1.3 | Check the Airtable UI | The smoke test wrote one RMA and one Ticket row |
| 1.4 | `cd tools/reset-demo && go run . -dry-run` | Lists exactly those two rows; seed rows are kept |
| 1.5 | `go run .`, then re-check Airtable | Test rows removed, seed rows (`RMA-2026-0041`, `TCK-2026-0107`) intact |

If 1.2 fails while 0.2 passed, the cause is Airtable configuration: field names are
case-sensitive, and the token needs the `data.records:write` scope.

## Phase 2 — Inside Cognigy (per component, using the Interaction Panel)

**Knowledge**
- "What is your return policy?" → grounded answer citing the 30-day window.
- A question outside the FAQs ("Do you sell kayaks?") → the agent says it does not know;
  no invented facts.

**Extension**
- Upload the tar.gz, create the Connection, place Get Order Status in a test flow.
- AO-1001 with the correct email → context contains `Status: "Shipped"`.
- AO-1001 with a wrong email → `found: false`.
- With the Connection token temporarily invalidated → the node stores `{error: true}` and
  the flow continues without crashing. Restore the token afterwards.

**Tools and agent behavior**
- "Where is my order?" → the agent collects both order number and email before calling the
  tool, consistently across repeated runs. If not, refine the tool description.
- Full RMA path: after xApp submit, `input.data` contains the selection payload.

**xApp in Webchat**
- The overlay opens inside the chat window; items match AO-1002; the ThermoFlask is greyed
  out.
- Submit → RMA row in Airtable and a confirmation with the RMA number in chat.

**Locales**
- "Können wir auf Deutsch weitermachen?" → the confirmation in the same turn is already
  German. If the switch only takes effect on the next message, the Think node after Switch
  Locale is missing.
- A German FAQ question → answer contains "4,95 EUR" (comma decimal — retrieved from the
  German store, not translated).
- Umlauts render correctly end-to-end.

## Phase 3 — End to end

1. Create a REST endpoint on the Main flow, then:
   ```bash
   cd evaluation
   export COGNIGY_REST_ENDPOINT_URL="https://endpoint-trial.cognigy.ai/<token>"
   python -m pytest -v
   ```
   Target: 10 passed. Each failure names the affected behavior (grounding, tool selection,
   unknown-order handling, locale).
2. `go run ./tools/reset-demo` to restore the seed data.
3. Run all five scenarios from `demo/demo-script.md` in Webchat end to end.
4. Verify the failure behaviors listed at the end of the demo script (invalid token,
   xApp closed without submitting).
