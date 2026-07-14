/**
 * Executes all four compiled Extension nodes end-to-end.
 *
 *   node smoke-test.js            -> runs against a mocked Airtable API (no credentials needed)
 *   AIRTABLE_TOKEN=pat... AIRTABLE_BASE_ID=app... node smoke-test.js
 *                                 -> runs against the real Airtable base (seed data required)
 *
 * Exits 0 with "ALL PASS" or 1 with the failing assertions.
 */
const axios = require("axios");
const extension = require("./build/module").default;

const REAL = Boolean(process.env.AIRTABLE_TOKEN && process.env.AIRTABLE_BASE_ID);
const connection = REAL
    ? { apiToken: process.env.AIRTABLE_TOKEN, baseId: process.env.AIRTABLE_BASE_ID }
    : { apiToken: "pat-mock", baseId: "appMOCK" };

// ---------------------------------------------------------------------------
// Mock Airtable: replace the shared axios adapter so lib/airtable's calls are
// answered locally with data matching airtable/*.csv seed rows.
// ---------------------------------------------------------------------------
if (!REAL) {
    const orders = {
        "AO-1001": { OrderNumber: "AO-1001", Email: "erika.mustermann@example.com", CustomerName: "Erika Mustermann", OrderDate: "2026-07-06", Status: "Shipped", Carrier: "DHL", TrackingNumber: "DHL-778812345", Total: 249.9, Currency: "EUR" },
        "AO-1002": { OrderNumber: "AO-1002", Email: "erika.mustermann@example.com", CustomerName: "Erika Mustermann", OrderDate: "2026-06-24", Status: "Delivered", Carrier: "DHL", TrackingNumber: "DHL-778809911", Total: 417.85, Currency: "EUR" }
    };
    const itemsByOrder = {
        "AO-1002": [
            { ItemId: "ITM-0003", OrderNumber: "AO-1002", SKU: "JKT-STORM-M", ProductName: "StormShell Rain Jacket (M)", Quantity: 1, Price: 179.95, Currency: "EUR", ReturnEligible: "true" },
            { ItemId: "ITM-0004", OrderNumber: "AO-1002", SKU: "BPK-RIDGE45", ProductName: "Ridge 45L Backpack", Quantity: 1, Price: 149.95, Currency: "EUR", ReturnEligible: "true" },
            { ItemId: "ITM-0005", OrderNumber: "AO-1002", SKU: "BTL-THERMO1", ProductName: "ThermoFlask 1L", Quantity: 2, Price: 43.95, Currency: "EUR", ReturnEligible: "false" }
        ]
    };

    axios.defaults.adapter = async (config) => {
        const respond = (data) => ({ data, status: 200, statusText: "OK", headers: {}, config });
        const table = decodeURIComponent(config.url.split("/").pop());

        if (config.method === "get") {
            const formula = (config.params && config.params.filterByFormula) || "";
            const orderMatch = formula.match(/\{OrderNumber\}='([^']*)'/);
            const emailMatch = formula.match(/\{Email\}\)='([^']*)'/);
            const orderNumber = orderMatch ? orderMatch[1] : null;

            if (table === "Orders") {
                const order = orders[orderNumber];
                const emailOk = !emailMatch || (order && order.Email.toLowerCase() === emailMatch[1]);
                return respond({ records: order && emailOk ? [{ id: "recORDER1", fields: order }] : [] });
            }
            if (table === "OrderItems") {
                const items = itemsByOrder[orderNumber] || [];
                return respond({ records: items.map((f, i) => ({ id: `recITEM${i}`, fields: f })) });
            }
            return respond({ records: [] });
        }

        if (config.method === "post") {
            const body = JSON.parse(config.data);
            return respond({ records: [{ id: "recNEW123", fields: body.records[0].fields }] });
        }
        throw new Error(`mock adapter: unhandled ${config.method} ${config.url}`);
    };
}

// ---------------------------------------------------------------------------
// Minimal stand-in for the Cognigy node runtime
// ---------------------------------------------------------------------------
function fakeCognigy() {
    const context = {};
    return {
        context,
        cognigy: {
            api: {
                addToContext: (key, value) => { context[key] = value; },
                addToInput: (key, value) => { context[key] = value; }
            }
        }
    };
}

const nodes = Object.fromEntries(extension.nodes.map((node) => [node.type, node]));
const failures = [];

async function check(name, nodeType, config, assertions) {
    const runtime = fakeCognigy();
    await nodes[nodeType].function({ cognigy: runtime.cognigy, config });
    for (const [description, predicate] of assertions) {
        const key = Object.keys(runtime.context)[0];
        const result = runtime.context[key];
        if (predicate(result)) {
            console.log(`  PASS  ${name} — ${description}`);
        } else {
            failures.push(`${name} — ${description} — got: ${JSON.stringify(result)}`);
            console.log(`  FAIL  ${name} — ${description}`);
        }
    }
}

(async () => {
    console.log(`Extension smoke test (${REAL ? "REAL Airtable" : "mocked Airtable"})\n`);
    const store = { storeLocation: "context", inputKey: "r", contextKey: "r" };

    await check("Get Order Status: known order", "getOrderStatus",
        { connection, orderNumber: "AO-1001", email: "erika.mustermann@example.com", ...store },
        [
            ["found = true", (r) => r && r.found === true],
            ["status is Shipped", (r) => r && r.Status === "Shipped"],
            ["carrier is DHL", (r) => r && r.Carrier === "DHL"]
        ]);

    await check("Get Order Status: wrong email rejected", "getOrderStatus",
        { connection, orderNumber: "AO-1001", email: "intruder@example.com", ...store },
        [["found = false (identity check)", (r) => r && r.found === false && !r.Status]]);

    await check("Get Order Status: unknown order", "getOrderStatus",
        { connection, orderNumber: "AO-9999", email: "erika.mustermann@example.com", ...store },
        [["found = false", (r) => r && r.found === false]]);

    await check("Get Order Items: AO-1002", "getOrderItems",
        { connection, orderNumber: "AO-1002", onlyReturnEligible: false, ...store },
        [
            ["3 line items", (r) => r && r.count === 3],
            ["contains the jacket", (r) => r && r.items.some((i) => i.SKU === "JKT-STORM-M")],
            ["ThermoFlask flagged not eligible", (r) => r && r.items.some((i) => i.SKU === "BTL-THERMO1" && String(i.ReturnEligible) === "false")]
        ]);

    await check("Create RMA", "createRma",
        { connection, orderNumber: "AO-1002", email: "erika.mustermann@example.com", sku: "JKT-STORM-M", productName: "StormShell Rain Jacket (M)", reason: "Wrong size", ...store },
        [
            ["success = true", (r) => r && r.success === true],
            ["RMA number issued", (r) => r && /^RMA-2026-\d{4}$/.test(r.rmaNumber)]
        ]);

    await check("Create Support Ticket", "createTicket",
        { connection, email: "erika.mustermann@example.com", subject: "Discount code not working", description: "AURORA10 rejected at checkout", priority: "Medium", ...store },
        [
            ["success = true", (r) => r && r.success === true],
            ["ticket number issued", (r) => r && /^TCK-2026-\d{4}$/.test(r.ticketNumber)]
        ]);

    console.log("");
    if (failures.length) {
        console.error(`${failures.length} FAILURE(S):`);
        failures.forEach((f) => console.error("  - " + f));
        process.exit(1);
    }
    console.log(`ALL PASS${REAL ? " — note: real mode wrote one RMA and one Ticket row; run tools/reset-demo to clean up" : ""}`);
})();
