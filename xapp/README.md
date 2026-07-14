# RMA xApp — React product-selection form

A React + TypeScript app compiled into **one self-contained HTML file**
(`dist/rma-form.html`, ~24 KB) that is pasted into the **xApp: Show HTML** node inside the
`start_return` tool logic.

## Build

```bash
npm install
npm run build      # -> dist/rma-form.html
npx tsc --noEmit   # strict typecheck
```

The source is idiomatic React (`src/main.tsx`); esbuild aliases `react` → `preact/compat`,
which keeps the pasted bundle at ~24 KB instead of ~140 KB — well within what a Cognigy
node field handles comfortably.

## How data flows

```
Get Order Items (Extension) → context.orderItems
        ↓ CognigyScript tokens in template.html (window.__COGNIGY_DATA__)
xApp: Show HTML  →  customer picks product + reason  →  submit
        ↓
xApp result payload → context.returnSelection → Create RMA (Extension) → Airtable
```

The Cognigy tokens (`{{context.orderNumber}}`, `{{json context.orderItems.items}}`,
`{{input.language}}`) live in a **separate `<script>` tag** in `template.html`. If they are
not replaced — e.g. you open `dist/rma-form.html` directly in a browser — only that tag fails
to parse; the app detects the missing data and renders sample preview data instead. That makes
the file double as a local development harness.

## Design notes

- **Dynamic data** — the product list is the live line items of the order the customer named,
  fetched via the Extension immediately beforehand. Nothing is hard-coded.
- **Business rules in the UI** — items with `ReturnEligible=false` (e.g. the ThermoFlask, a
  hygiene item) render greyed out with a "Not returnable" badge, matching the return policy
  stated in the FAQ.
- **Bilingual** — reads `input.language` and renders EN or DE labels/reasons, so the form
  follows a mid-conversation locale switch.
- **Graceful degradation** — preview mode plus a single runtime integration point.

## Integration point

All Cognigy-runtime coupling is in one function, `submitToCognigy()` in `src/main.tsx`, plus
the SDK script tag in `template.html`. The wiring is verified against the current docs (see
`flows/VERIFIED-NOTES.md`): the xApp host serves `/sdk/app-page-sdk.js`, which exposes a
global `SDK`, and `SDK.submit(payload)` delivers the JSON back to the flow as `input.data`
(enable the node's **Waiting Behavior**). In the Cognigy flow, use the **Set HTML xApp State**
node and enable the Webchat v3 overlay display.
