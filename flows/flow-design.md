# Flow design — Aurora Outdoors agent

How to assemble the agent inside Cognigy.AI. (Exact node names verified against docs — see
`flows/VERIFIED-NOTES.md` for version-specific details.)

## Project structure

```
Locales:   en-US (default), de-DE
Flows:     Main (AI Agent + tools), RMA xApp (sub-logic)
Knowledge: aurora-faq-en (attached to en-US), aurora-faq-de (attached to de-DE)
Extension: Aurora Airtable (4 custom nodes)
Endpoint:  Webchat v3
```

## Main flow — AI Agent node

One **AI Agent** node drives the conversation. Localized instructions:

**EN instructions (agent persona):**

> You are "Ava", the friendly customer assistant of Aurora Outdoors, a European online shop
> for outdoor gear. Be concise and warm. You can: answer questions using the knowledge base;
> check order status; start a product return; create support tickets. For order lookups and
> returns, always collect BOTH the order number (format AO-XXXX) and the customer's email
> before calling a tool. If the customer asks to continue in German (or writes in German),
> call the "switch_language" tool. Never invent order data — only report what tools return.

**DE instructions:** same content in German ("Du bist 'Ava', die freundliche Kundenassistentin
von Aurora Outdoors …"), with the note to switch back to English via `switch_language` if asked.

Attach the locale's knowledge store to the AI Agent node under **Grounding Knowledge**
(injection mode *When Required*) so FAQ questions are answered with retrieval — no FAQ
intents needed.

## Tools attached to the AI Agent

Tools are defined on the AI Agent's job (**Add Tool → Tool**, with typed parameters), and
**Save & Configure** creates the tool branch in the flow. Inside the branch:

- Tool arguments arrive at **`input.aiAgent.toolArgs.<parameter>`**.
- Every branch ends with a **Tool Answer** node that returns the result to the agent
  (without it, the tool call is discarded and the agent answers blind).
- In the Tool Answer text, use plain references (`{{context.orderStatus.Status}}`) — the
  `{{json ...}}` helper is not evaluated in that field.

| Tool | Parameters | Branch |
|------|------------|--------|
| `get_order_status` | `orderNumber`, `email` | **Get Order Status** (Extension; fields `{{input.aiAgent.toolArgs.orderNumber}}` / `{{...toolArgs.email}}`) → **Tool Answer** with the found/status/carrier/tracking fields |
| `start_return` | `orderNumber` | **Get Order Items** (Extension) → **Set HTML xApp State** with `xapp/dist/rma-form.html` (Waiting Behavior ON) → submitted payload arrives as `input.data` → copy to `context.returnSelection` → **Create RMA** (Extension) → **Tool Answer** with the RMA number |
| `create_support_ticket` | `subject`, `description`, `priority` | **Create Support Ticket** (Extension) → **Tool Answer** with the ticket number |
| `switch_language` | `targetLanguage` (`en`/`de`) | **Switch Locale** node to `de-DE`/`en-US` → **Think node** (required for the switch to apply within the current turn) → **Tool Answer** confirming in the new language |

Tool descriptions matter more than names — write them as if explaining to a colleague when to
use the tool (the LLM reads them). Example for `start_return`:
*"Use when the customer wants to return/exchange a product from a previous order. Requires the
order number. Opens a visual form where the customer picks the product — do not ask which
product to return in chat."*

## RMA xApp wiring

1. Tool logic stores items in `context.orderItems` (via **Get Order Items**).
2. **Set HTML xApp State** node (Waiting Behavior ON) renders `xapp/dist/rma-form.html`;
   CognigyScript tokens inject `context.orderNumber`, the items JSON, and `input.language`
   (for the bilingual form UI). In the Webchat v3 endpoint, enable the xApp **overlay**
   display (with close-on-submit) so the form opens inside the chat window.
3. Customer submits via the xApp Page SDK (`SDK.submit`) → payload arrives back in the flow as
   `input.data`: `{ action: "rmaSelection", sku, productName, reason, comment }`.
4. Store it to `context.returnSelection` → **Create RMA** node writes to Airtable →
   **Resolve Tool Action** → agent confirms with the RMA number.

## Language switching

- Two locales on the same flow: `en-US` (default) and `de-DE`. All Say/agent instructions
  localized per locale; the flow logic exists once.
- Mid-conversation switch happens through the `switch_language` tool (agent-triggered when the
  customer asks or writes in the other language). Remember the **Think node after Switch
  Locale** — without it the locale only changes on the *next* user input.
- Each locale has its own knowledge store attached, so grounded answers come back in the right
  language with locale-correct facts (EUR prices etc. are identical in both).

## Endpoint

- **Webchat v3** endpoint bound to the Main flow.
- Enable data privacy defaults; set agent name "Ava — Aurora Outdoors" and brand color `#2E7D32`.
- Demo page: the endpoint's hosted demo URL is enough — full screen it for the CX demo.

## Stability checklist

- [ ] Every Extension node's error branch tested (verified by temporarily revoking the Airtable token).
- [ ] Tool descriptions tuned until repeated happy-path runs consistently pick the right tool.
- [ ] xApp verified in Webchat at the target browser/screen resolution.
- [ ] German umlauts render correctly end-to-end (Airtable → Extension → chat).
- [ ] Session reset verified (conversations restart cleanly).
