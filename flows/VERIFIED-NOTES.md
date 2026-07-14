# Verified against docs.cognigy.com (July 2026)

Platform facts checked against the Cognigy documentation. Items marked ⚠ could not be
confirmed from the docs and should be verified in the target environment before relying
on them.

## xApps

- Node: **Set HTML xApp State** (node reference → xApp). Enable **Waiting Behavior** so the
  flow pauses until the customer submits.
- The HTML loads the page SDK via `<script src="/sdk/app-page-sdk.js"></script>` (served by
  the xApp host), which exposes a global **`SDK`**; submit with `SDK.submit({...})` —
  payload must be serializable JSON. *(Already wired in `xapp/template.html` / `src/main.tsx`.)*
- The submitted payload arrives in the flow as **`input.data`** on the next input — copy it
  to context (`context.returnSelection`) before continuing.
- Webchat v3 can render the xApp **as an overlay** (settings on the node/endpoint: header
  title, close icon, auto-open, close-on-submit). Default elsewhere is a separate tab via an
  xApp session URL (there's also an **Init xApp Session** node with QR code for cross-device).

## Extensions

- Confirmed: `@cognigy/extension-tools` (current: **0.17.0**), `createExtension` /
  `createNodeDescriptor` / `IConnectionSchema` exactly as used in `extension/`.
- Packaging confirmed: `tar cfz <name>.tar.gz build/* package.json package-lock.json README.md icon.png`,
  `main` pointing at `build/module.js`. Upload/update under **Manage → Extensions**.
- ⚠ Extension API argument size limit is 62 KB — keep node results lean (we already return
  only the fields the flow needs).

## Knowledge AI

- Accepted source formats: **CTXT (recommended), PDF, TXT, DOCX, PPTX**, images via OCR.
  Our `.txt` FAQ files are fine as-is. (⚠ `.md` is NOT documented as supported.)
- Limits: 10 MB per file, ≤1000 chunks per source, ~2000 chars per chunk.
- Retrieval options: attach Knowledge Stores **directly to the AI Agent node** under
  **Grounding Knowledge** (injection modes: Never / When Required / Once for Each User Input)
  — use *When Required*. The classic **Search Extract Output** node still exists as an
  alternative.

## AI Agent node + tools

- Tools are **child nodes of the AI Agent node**; when the LLM calls a tool, that branch runs.
- Tool parameters: defined per Tool node (graphical or JSON editor) — name, type, description,
  optional enum. ⚠ Parameter Description/Enum fields do **not** support CognigyScript.
- End every tool branch with a **Resolve Tool Action** node to return the result to the
  AI Agent — otherwise the tool call is discarded at the end of the branch.
- "Maximum Loops" (Advanced) caps agent↔tool round trips.
- LLM providers: OpenAI, Azure OpenAI, Anthropic, Google, AWS Bedrock, Mistral, Aleph Alpha.
  Trials since v4.99 include a **Platform-provided LLM** option. ⚠ The runtime models a
  trial tenant offers are listed under Manage → LLMs.

## Localization

- Max 10 locales per project; primary locale cannot be changed later. Non-primary locales
  localize existing nodes via **Add Localization** (structure changes only in primary).
- **Switch Locale** node changes locale mid-conversation, **but a Think node must follow it**
  for the new locale to apply within the current turn — otherwise it only applies from the
  next user input.
- ⚠ Per-locale localization of AI Agent instructions is not explicitly documented. Fallback
  plan if instructions turn out not to be localizable: keep instructions bilingual ("Answer in
  the customer's current language; locale de-DE means German") and localize only Say nodes +
  knowledge store selection.

## REST endpoint (for the evaluation harness)

- URL: from the endpoint's Configuration Information, shaped like
  `https://endpoint-trial.cognigy.ai/<64-char-token>`.
- `POST` JSON: `{ "userId": "...", "sessionId": "...", "text": "...", "data": {} }` —
  userId + sessionId required; at least one of text/data.
- Optional API-key auth via `x-rest-endpoint-key` header.
- Response is synchronous and includes **`outputStack`** — an array of all flow outputs
  (each with `text`, `data`, ...). *(Already parsed in `evaluation/cognigy_client.py`.)*
