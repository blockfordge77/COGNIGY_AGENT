# Demo script — happy paths

Test conversations covering the agent's main use cases, with expected results.
Test identity: Erika Mustermann, `erika.mustermann@example.com`.

## 1. FAQ (knowledge retrieval)

Type: **"Hi! What's your return policy?"**

Expected: an answer grounded in the knowledge source — 30-day return window, items unused
and in original packaging. No FAQ intents exist; the answer comes from retrieval.

Type: **"And how long until I get my money back?"**

Expected: the follow-up is answered in context — 1–2 business days for inspection plus
3–5 business days for the refund to appear.

## 2. Order status

Type: **"Where is my order?"**

Expected: the agent asks for the order number and the email address before looking
anything up.

Type: **"AO-1001, erika.mustermann@example.com"**

Expected: order shipped on 2026-07-06 via DHL, tracking number DHL-778812345. The lookup
runs against Airtable through the Extension; the email must match the order.

## 3. Product return (RMA with xApp)

Type: **"I'd like to return something from order AO-1002."**

Expected: the agent confirms the order (the email is already known from this session) and
opens the xApp form. The form shows the actual items of AO-1002 — StormShell Rain Jacket,
Ridge 45L Backpack, and ThermoFlask 1L, with the ThermoFlask marked as not returnable
(hygiene policy).

In the form: select **StormShell Rain Jacket (M)**, reason **Wrong size**, submit.

Expected: the chat confirms the return with an RMA number (`RMA-2026-XXXX`), and a new row
appears in the Airtable `RMAs` table.

## 4. Language switch to German

Type: **"Können wir auf Deutsch weitermachen?"**

Expected: the agent confirms in German and the conversation continues in German.

Type: **"Wie ist der Status meiner Bestellung AO-1003?"**

Expected, in German: the order is in processing ("In Bearbeitung") — same Extension, same
data, German locale.

Type: **"Was kostet der Versand?"**

Expected: an answer grounded in the German knowledge store — 4,95 EUR, free above 75 EUR.

## 5. Support ticket

Type: **"Ich habe noch ein anderes Problem — bitte erstellen Sie ein Ticket: mein
Rabattcode funktioniert nicht."**

Expected: a ticket confirmation with a ticket number (`TCK-2026-XXXX`), and a new row in
the Airtable `Tickets` table.

## Failure behavior

- **Airtable unreachable or token invalid:** Extension nodes return `{ error: true }`
  instead of failing the flow; the agent apologizes and offers to create a ticket.
- **xApp closed without submitting:** the conversation continues; the return can be
  restarted.
- **Unknown order number (e.g. AO-9999):** the agent states the order was not found. It
  does not invent order data.

## Resetting demo data

```bash
cd tools/reset-demo
go run .      # deletes rows created by demos and test runs, keeps the seed rows
```
