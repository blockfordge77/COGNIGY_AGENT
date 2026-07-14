# Aurora Airtable — Custom Cognigy Extension

Four custom flow nodes wrapping the Airtable REST API:

| Node | What it does | Result (context/input key) |
|------|--------------|------------------------------|
| **Get Order Status** | Order lookup by order number + email (lightweight identity check) | `orderStatus` |
| **Get Order Items** | Line items of an order — feeds the RMA xApp | `orderItems` |
| **Create RMA** | Writes the approved return to the `RMAs` table | `rma` |
| **Create Support Ticket** | Writes a ticket to the `Tickets` table | `ticket` |

Credentials (Airtable token + base ID) live in a managed **Cognigy Connection** — encrypted,
reusable, never visible in the flow.

## Build

```bash
npm install
npm run build        # transpiles to build/ and produces aurora-airtable-extension.tar.gz
```

Requires a `tar` on PATH (Git Bash / WSL on Windows; macOS/Linux native).

## Upload to Cognigy

1. Cognigy.AI → your project → **Manage → Extensions → Upload Extension**.
2. Select `aurora-airtable-extension.tar.gz`.
3. Open the extension → create a **Connection**: `apiToken` = your Airtable PAT, `baseId` = your `app...` id.
4. The four nodes now appear in the flow editor under **Aurora Airtable**.

To update after code changes: bump `version` in `package.json`, rebuild, and use **Update Extension**.

## Design notes

- **Why an Extension instead of HTTP Request nodes?** Reusable across flows and projects, a
  clean config UI for conversation designers, secrets in managed Connections, typed and
  testable code, and consistent error handling in one place.
- **Error handling:** every node catches API failures and stores `{ error: true }` instead of
  throwing, so the flow can branch to a fallback (offer a ticket) rather than fail
  mid-conversation.
- **Identity check:** `Get Order Status` requires order number **and** matching email in one
  `filterByFormula` — no enumeration of other customers' orders.
