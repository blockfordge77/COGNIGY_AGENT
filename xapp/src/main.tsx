import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

interface OrderItem {
    SKU: string;
    ProductName: string;
    Quantity: number;
    Price: number;
    Currency?: string;
    ReturnEligible: string | boolean;
}

interface CognigyData {
    orderNumber: string;
    locale: string;
    items: OrderItem[];
}

interface RmaResult {
    action: "rmaSelection";
    orderNumber: string;
    sku: string;
    productName: string;
    reason: string;
    comment: string;
}

const PREVIEW_DATA: CognigyData = {
    orderNumber: "AO-1002",
    locale: "en-US",
    items: [
        { SKU: "JKT-STORM-M", ProductName: "StormShell Rain Jacket (M)", Quantity: 1, Price: 179.95, Currency: "EUR", ReturnEligible: "true" },
        { SKU: "BPK-RIDGE45", ProductName: "Ridge 45L Backpack", Quantity: 1, Price: 149.95, Currency: "EUR", ReturnEligible: "true" },
        { SKU: "BTL-THERMO1", ProductName: "ThermoFlask 1L", Quantity: 2, Price: 43.95, Currency: "EUR", ReturnEligible: "false" }
    ]
};

const STRINGS = {
    en: {
        title: "Return an item",
        subPrefix: "Order",
        subSuffix: "— select the product to return.",
        reason: "Reason for return",
        reasons: ["Wrong size", "Not as described", "Arrived damaged", "Changed my mind", "Other"],
        comment: "Comments (optional)",
        submit: "Confirm return",
        notEligible: "Not returnable",
        done: "Thanks! You can close this window and continue in the chat."
    },
    de: {
        title: "Artikel zurückgeben",
        subPrefix: "Bestellung",
        subSuffix: "— wählen Sie das Produkt aus, das Sie zurückgeben möchten.",
        reason: "Rückgabegrund",
        reasons: ["Falsche Größe", "Entspricht nicht der Beschreibung", "Beschädigt angekommen", "Gefällt mir nicht", "Sonstiges"],
        comment: "Anmerkungen (optional)",
        submit: "Rückgabe bestätigen",
        notEligible: "Keine Rückgabe",
        done: "Vielen Dank! Sie können dieses Fenster schließen und im Chat fortfahren."
    }
};

/** Data injected by the Cognigy flow, or preview data when opened standalone. */
function getCognigyData(): CognigyData {
    const injected = (window as any).__COGNIGY_DATA__;
    if (injected && Array.isArray(injected.items)) {
        return injected as CognigyData;
    }
    return PREVIEW_DATA;
}

/**
 * Single integration point with the Cognigy xApp runtime — the rest of the
 * app is runtime-agnostic.
 *
 * The xApp host serves the Page SDK (loaded in template.html via
 * <script src="/sdk/app-page-sdk.js">), which exposes a global `SDK`.
 * `SDK.submit(payload)` sends the JSON payload back to the flow, where it
 * arrives as `input.data` (the node's Waiting Behavior must be enabled).
 */
function submitToCognigy(payload: RmaResult): void {
    const sdk = (window as any).SDK;
    if (sdk && typeof sdk.submit === "function") {
        sdk.submit(payload);
    } else {
        console.log("xApp result (preview mode):", payload);
        alert("Preview mode — payload logged to console.");
    }
}

function isEligible(item: OrderItem): boolean {
    return String(item.ReturnEligible).toLowerCase() === "true";
}

function RmaForm() {
    const data = useMemo(getCognigyData, []);
    const t = data.locale?.toLowerCase().startsWith("de") ? STRINGS.de : STRINGS.en;

    const [selectedSku, setSelectedSku] = useState<string | null>(null);
    const [reason, setReason] = useState(t.reasons[0]);
    const [comment, setComment] = useState("");
    const [submitted, setSubmitted] = useState(false);

    if (submitted) {
        return (
            <div className="done">
                <div className="check">✅</div>
                <p>{t.done}</p>
            </div>
        );
    }

    const selected = data.items.find((item) => item.SKU === selectedSku);

    const handleSubmit = () => {
        if (!selected) return;
        submitToCognigy({
            action: "rmaSelection",
            orderNumber: data.orderNumber,
            sku: selected.SKU,
            productName: selected.ProductName,
            reason,
            comment
        });
        setSubmitted(true);
    };

    return (
        <div>
            <h2>{t.title}</h2>
            <div className="sub">
                {t.subPrefix} <strong>{data.orderNumber}</strong> {t.subSuffix}
            </div>

            <div>
                {data.items.map((item) => {
                    const eligible = isEligible(item);
                    const classes = [
                        "item",
                        item.SKU === selectedSku ? "selected" : "",
                        eligible ? "" : "disabled"
                    ].join(" ").trim();

                    return (
                        <div
                            key={item.SKU}
                            className={classes}
                            onClick={() => eligible && setSelectedSku(item.SKU)}
                        >
                            <div className="thumb">{(item.ProductName || "?").charAt(0)}</div>
                            <div className="meta">
                                <div className="name">{item.ProductName}</div>
                                <div className="detail">
                                    {item.SKU} · {item.Quantity} × {item.Price} {item.Currency || "EUR"}
                                </div>
                            </div>
                            {!eligible && <span className="badge">{t.notEligible}</span>}
                        </div>
                    );
                })}
            </div>

            <label>{t.reason}</label>
            <select value={reason} onChange={(e) => setReason((e.target as HTMLSelectElement).value)}>
                {t.reasons.map((r) => (
                    <option key={r} value={r}>{r}</option>
                ))}
            </select>

            <label>{t.comment}</label>
            <textarea rows={2} value={comment} onChange={(e) => setComment((e.target as HTMLTextAreaElement).value)} />

            <button disabled={!selected} onClick={handleSubmit}>
                {t.submit}
            </button>
        </div>
    );
}

const rootElement = document.getElementById("rma-root");
if (rootElement) {
    createRoot(rootElement).render(<RmaForm />);
}
