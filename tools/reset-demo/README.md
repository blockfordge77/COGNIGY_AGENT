# reset-demo — demo-data reset CLI (Go)

Deletes the rows that demo runs and the evaluation suite create in Airtable (`RMAs`,
`Tickets`), keeping the seed records (`RMA-2026-0041`, `TCK-2026-0107`), so every demo
starts from the same clean state.

Stdlib-only — no dependencies to install.

```bash
export AIRTABLE_TOKEN=pat...
export AIRTABLE_BASE_ID=app...

go run . -dry-run   # show what would be deleted
go run .            # delete
```

Deletions are batched (10 records per request, the Airtable API maximum) and the tool pages
through the tables, so it stays correct even after long test sessions.
