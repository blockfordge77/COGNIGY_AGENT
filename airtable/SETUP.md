# Airtable setup (≈15 minutes)

The agent treats Airtable as the customer's "system of record" (OMS/CRM stand-in).

## 1. Create the base

1. Sign up / log in at airtable.com (free tier is enough).
2. Create a base named **Aurora Outdoors OMS**.
3. Create four tables and import the CSVs in this folder:

| Table | CSV | Notes |
|-------|-----|-------|
| `Orders` | `orders.csv` | Primary field: `OrderNumber` |
| `OrderItems` | `order_items.csv` | Primary field: `ItemId`; link `OrderNumber` as plain text (simpler than linked records for API filtering) |
| `RMAs` | `rmas.csv` | Starts with one historical example row |
| `Tickets` | `tickets.csv` | Starts with one historical example row |

Keep field types as **single line text** except `OrderDate` (Date) and `Total` / `Price` (Number/Currency).
Text fields keep the API predictable — no type-coercion surprises during a live demo.

## 2. Create an API token

1. airtable.com/create/tokens → **Create new token**.
2. Name: `cognigy-agent`. Scopes: `data.records:read`, `data.records:write`. Access: the **Aurora Outdoors OMS** base only.
3. Copy the token (`pat...`) — it goes into the Cognigy **Connection** of the custom Extension (never hard-coded).

## 3. Find your base + table IDs

Open the base → Help → **API documentation**, or use https://airtable.com/developers/web/api/introduction.
You need the base ID (`app...`). Table names can be used verbatim in the REST URL:

```
GET https://api.airtable.com/v0/{baseId}/Orders?filterByFormula=AND({OrderNumber}='AO-1002',LOWER({Email})='erika.mustermann@example.com')
Authorization: Bearer pat...
```

The `filterByFormula` pattern (order number **and** email) is the agent's identity check:
order data is only returned when both values match a single record.

## 4. Smoke test (before touching Cognigy)

```bash
curl -s "https://api.airtable.com/v0/$BASE_ID/Orders?filterByFormula=%7BOrderNumber%7D%3D'AO-1001'" \
  -H "Authorization: Bearer $TOKEN"
```

You should get one record back. If this works, the Extension will work.
