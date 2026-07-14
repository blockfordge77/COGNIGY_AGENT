import { createNodeDescriptor, INodeFunctionBaseParams } from "@cognigy/extension-tools";
import { IAirtableConnection, createRecord } from "../lib/airtable";

export interface ICreateRmaParams extends INodeFunctionBaseParams {
    config: {
        connection: IAirtableConnection;
        orderNumber: string;
        email: string;
        sku: string;
        productName: string;
        reason: string;
        storeLocation: "input" | "context";
        inputKey: string;
        contextKey: string;
    };
}

export const createRmaNode = createNodeDescriptor({
    type: "createRma",
    defaultLabel: "Create RMA",
    summary: "Creates a Return Merchandise Authorization record in Airtable",
    fields: [
        {
            key: "connection",
            label: "Airtable Connection",
            type: "connection",
            params: { connectionType: "airtable", required: true }
        },
        {
            key: "orderNumber",
            label: "Order Number",
            type: "cognigyText",
            defaultValue: "{{context.orderNumber}}",
            params: { required: true }
        },
        {
            key: "email",
            label: "Customer Email",
            type: "cognigyText",
            defaultValue: "{{context.email}}",
            params: { required: true }
        },
        {
            key: "sku",
            label: "Product SKU",
            type: "cognigyText",
            defaultValue: "{{context.returnSelection.sku}}",
            params: { required: true }
        },
        {
            key: "productName",
            label: "Product Name",
            type: "cognigyText",
            defaultValue: "{{context.returnSelection.productName}}"
        },
        {
            key: "reason",
            label: "Return Reason",
            type: "cognigyText",
            defaultValue: "{{context.returnSelection.reason}}"
        },
        {
            key: "storeLocation",
            label: "Where to store the result",
            type: "select",
            defaultValue: "context",
            params: {
                required: true,
                options: [
                    { label: "Input", value: "input" },
                    { label: "Context", value: "context" }
                ]
            }
        },
        {
            key: "inputKey",
            label: "Input Key to store Result",
            type: "cognigyText",
            defaultValue: "rma",
            condition: { key: "storeLocation", value: "input" }
        },
        {
            key: "contextKey",
            label: "Context Key to store Result",
            type: "cognigyText",
            defaultValue: "rma",
            condition: { key: "storeLocation", value: "context" }
        }
    ],
    sections: [
        {
            key: "storage",
            label: "Storage Options",
            defaultCollapsed: true,
            fields: ["storeLocation", "inputKey", "contextKey"]
        }
    ],
    form: [
        { type: "field", key: "connection" },
        { type: "field", key: "orderNumber" },
        { type: "field", key: "email" },
        { type: "field", key: "sku" },
        { type: "field", key: "productName" },
        { type: "field", key: "reason" },
        { type: "section", key: "storage" }
    ],
    appearance: { color: "#E65100" },
    function: async ({ cognigy, config }: ICreateRmaParams) => {
        const { api } = cognigy;
        const { connection, orderNumber, email, sku, productName, reason, storeLocation, inputKey, contextKey } = config;

        let result: any;
        try {
            // Human-readable, collision-safe enough for a demo dataset
            const rmaNumber = `RMA-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

            const record = await createRecord(connection, "RMAs", {
                RmaNumber: rmaNumber,
                OrderNumber: orderNumber,
                Email: email,
                SKU: sku,
                ProductName: productName,
                Reason: reason || "Not specified",
                Status: "Approved",
                CreatedAt: new Date().toISOString().slice(0, 10)
            });

            result = { success: true, rmaNumber, recordId: record.id, productName, orderNumber };
        } catch (error: any) {
            result = { success: false, error: true, message: error?.message || "Airtable request failed" };
        }

        if (storeLocation === "context") {
            api.addToContext(contextKey, result, "simple");
        } else {
            // @ts-ignore
            api.addToInput(inputKey, result);
        }
    }
});
