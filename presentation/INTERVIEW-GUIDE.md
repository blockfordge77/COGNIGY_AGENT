# Interview Guide — Aurora Outdoors demo

Presenter-only material (keep out of anything you hand over). Three parts: the flow story,
the demo script with test cases and expected results (including Airtable checks), and Q&A prep.

---

## 1. Run of show (15 min)

| Time | What | Where |
|------|------|-------|
| 0:00–1:30 | Slides 1–4: scenario, coverage, architecture | Deck |
| 1:30–2:00 | Slide 5: demo agenda | Deck |
| 2:00–7:00 | Live demo — the 5 scenarios below | Demo Webchat, full screen |
| 7:00–13:30 | Slides 6–10, each alongside a live screen: flow editor, AI Agent editor, Extension page, xApp form, Airtable | Deck + browser tabs |
| 13:30–15:00 | Slides 11–12: test cases, roadmap → Q&A | Deck |

Tabs to have open before you start: ① demo webchat ② Cognigy flow editor (flow visible)
③ AI Agent editor (Ava, Jobs tab) ④ Manage → Extensions ⑤ Airtable base ⑥ the deck.

---

## 2. The flow story (how to explain it without code)

Tell it as a pipeline, pointing at the flow chart:

1. **Every message lands on one AI Agent node — "Ava".** No intent trees. Ava has a persona,
   job instructions, and four tools. The LLM reads the tool descriptions and decides.
2. **FAQ questions never call a tool.** Ava's Grounding Knowledge (two stores, EN + DE)
   answers them by retrieval — that's why there are zero FAQ intents and why answers quote
   exact policy numbers.
3. **Transactional requests call a tool.** Each tool is a branch in the flow. The branch
   does one job: call the Airtable integration node, then hand the structured result back
   via a Tool Answer. Ava turns the structure into a human reply.
4. **The return flow adds one twist:** before answering, it fetches the order's line items,
   opens the xApp form (pre-filled with those items), and *pauses*. When the customer
   submits, the flow resumes, writes the RMA to Airtable, and Ava confirms with the number.
5. **The language switch is also a tool.** Ava detects the request, the branch switches the
   session locale, and everything downstream follows: German replies, German knowledge
   store, German form labels.

The one-liner that lands well: *"The LLM decides **what** to do; the flow decides **how**
it's done; the Extension decides **where** the data lives. Each layer is swappable."*

---

## 3. Demo script — test cases with expected results

Reset the data before every rehearsal/demo (see §4). Use a fresh webchat session.

### Scenario 1 — FAQ (grounded knowledge)

| Say | Expect in chat | Expect in Airtable |
|-----|----------------|--------------------|
| `What is your return policy?` | 30 days, unused, original packaging — plus Ava proactively asks for order number + email if you want to start one | — |
| `And how long until I get my money back?` | 1–2 business days inspection, 3–5 days to the card — answered in context | — |

Narrate: *"No intent was built for that — it's retrieved from a 12-entry knowledge source."*

### Scenario 2 — Order status (live lookup)

| Say | Expect in chat | Expect in Airtable |
|-----|----------------|--------------------|
| `Where is my order AO-1001? My email is erika.mustermann@example.com` | Shipped on 2026-07-06 via DHL, tracking DHL-778812345 | — (read-only) |
| `What about order AO-9999?` | "I can't find that order" — **no invented data** | — |

Narrate: *"That hit the order system live — and note it needed both order number and email;
you can't fish for other people's orders."*

### Scenario 3 — Return with xApp (the centerpiece — slow down here)

| Step | Expect |
|------|--------|
| Say: `I'd like to return something from order AO-1002, erika.mustermann@example.com` | Overlay form opens **inside the chat** |
| Look at the form | Exactly AO-1002's items: StormShell Rain Jacket, Ridge 45L Backpack, ThermoFlask **greyed out — "Not returnable"** |
| Select the jacket, reason "Wrong size", Confirm | Overlay closes; Ava confirms with an `RMA-2026-XXXX` number |
| **Airtable check (show it live)** | New row in `RMAs`: the RMA number, `AO-1002`, erika's email, `JKT-STORM-M`, product name, "Wrong size", Status Approved, today's date |

Narrate: *"The form wasn't hard-coded — the agent fetched that order's real items a second
ago. And the flask is greyed out because hygiene items aren't returnable — the same policy
the FAQ quotes, enforced in the UI."*

### Scenario 4 — Live switch to German

| Say | Expect in chat |
|-----|----------------|
| `Können wir auf Deutsch weitermachen?` | Tool call → Ava confirms **in German** |
| `Was kostet der Versand?` | Grounded German answer: **4,95 EUR**, kostenlos ab 75 EUR — comma decimal proves it's the German store, not translation |
| `Wie ist der Status meiner Bestellung AO-1003? Meine E-Mail ist erika.mustermann@example.com` | "in Bearbeitung" (processing) — same tool, same data, German |

**Optional showpiece — German form:** in this same German session say
`Ich möchte einen Artikel aus Bestellung AO-1002 zurückgeben.`
Expected: the form renders in German — title **"Artikel zurückgeben"**, badge **"Keine
Rückgabe"**, German reason list. ⚠ Verify this in rehearsal: the switch must happen
**before** the form opens (the form's language is fixed at open time). If it rendered
English in your test, the switch hadn't been made in that session — retest in the right
order before promising it live.

### Scenario 5 — Support ticket (the additional tool)

| Say (German, continuing the session) | Expect in chat | Expect in Airtable |
|-----|----------------|--------------------|
| `Ich habe noch ein Problem — bitte erstellen Sie ein Ticket: mein Rabattcode AURORA10 funktioniert nicht.` | Ticket confirmation with `TCK-2026-XXXX` | New row in `Tickets`: number, email, subject/description about the code, Priority Medium, Status Open |

Close the demo by flipping to Airtable: *"Everything you watched is now a row in the
retailer's system of record."* Show the RMAs and Tickets tables with the fresh rows.

### Negative / stability cases (rehearse, mention, run live only if asked)

| Case | How to trigger | Expected |
|------|----------------|----------|
| Wrong email | `Where is my order AO-1001? email max.mueller@example.com` | Not found — identity check, no data leak |
| Airtable outage | Temporarily invalidate the Connection token | Ava apologizes and offers a ticket — conversation survives |
| Form abandoned | Open the return form, close it without submitting | Conversation continues; return can be restarted |

---

## 4. Airtable — content updates & reset

**What the demo writes:** each full run adds 1 row to `RMAs` and 1 row to `Tickets`.
Orders and OrderItems are never modified (read-only in all flows).

**Reset before each run** — either:
- Manually: delete all `RMAs` rows except `RMA-2026-0041` and all `Tickets` rows except
  `TCK-2026-0107` (the seed rows), or
- With the CLI: `cd tools/reset-demo && go run .` (env vars `AIRTABLE_TOKEN`,
  `AIRTABLE_BASE_ID` set; `-dry-run` to preview).

Keep the Airtable tab open on the `RMAs` table during the demo — the new row appearing is
the strongest visual in the walkthrough.

---

## 5. Q&A prep (short list)

- **Why an Extension instead of HTTP Request nodes?** Reusable nodes for designers, token
  in an encrypted Connection, one place for error handling, and it's the artifact a
  customer's team keeps after the engagement. Swapping Airtable for SAP touches only the
  Extension.
- **What stops hallucinated order data?** Instructions pin Ava to tool results; the tool
  returns an explicit "not found"; and the AO-9999 test is part of the demo script.
- **How does the agent pick the right tool?** Tool descriptions — that's the real prompt
  engineering. Example: "opens a visual form — never ask in chat which product" is one
  sentence, and it changes behavior. I tuned these until repeated runs were consistent.
- **What broke while building?** Honest, strong answer: the xApp data injection (the
  platform's templating didn't evaluate one helper, solved by pre-serializing in a Code
  node), and the form's submit payload location (solved with the node's store-result
  option). Debugging platform specifics fast is the actual FDE job.
- **How would you take this to production?** Auth beyond email matching, human handover,
  Cognigy Insights dashboards, an automated regression suite on a REST endpoint gating
  prompt changes, and environment promotion via snapshots.
- **Voice?** Same agent and tools on a voice endpoint; shorter sentences for TTS; the form
  becomes cross-device via QR-code xApp session or a spoken disambiguation path.

---

## 6. Pre-demo checklist (morning of)

- [ ] Reset Airtable demo rows (§4)
- [ ] One full rehearsal of all 5 scenarios in a fresh session — under 5 minutes
- [ ] Verify the German-form ordering (switch first, then return) — decide whether to show it
- [ ] Tabs arranged (§1), notifications off, screen scaling checked
- [ ] Screen recording of a full happy path saved as backup
- [ ] Know your recovery line: if anything stalls, narrate the architecture while it recovers — never refresh silently
