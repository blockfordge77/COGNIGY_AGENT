import { createNodeDescriptor, INodeFunctionBaseParams } from "@cognigy/extension-tools";
import { IAirtableConnection, listRecords, esc } from "../lib/airtable";

export interface IGetOrderStatusParams extends INodeFunctionBaseParams {
    config: {
        connection: IAirtableConnection;
        orderNumber: string;
        email: string;
        storeLocation: "input" | "context";
        inputKey: string;
        contextKey: string;
    };
}

export const getOrderStatusNode = createNodeDescriptor({
    type: "getOrderStatus",
    defaultLabel: "Get Order Status",
    summary: "Looks up an Aurora Outdoors order in Airtable by order number and email",
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
            defaultValue: "orderStatus",
            condition: { key: "storeLocation", value: "input" }
        },
        {
            key: "contextKey",
            label: "Context Key to store Result",
            type: "cognigyText",
            defaultValue: "orderStatus",
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
        { type: "section", key: "storage" }
    ],
    appearance: { color: "#2E7D32" },
    function: async ({ cognigy, config }: IGetOrderStatusParams) => {
        const { api } = cognigy;
        const { connection, orderNumber, email, storeLocation, inputKey, contextKey } = config;

        let result: any;
        try {
            const formula = `AND({OrderNumber}='${esc(orderNumber.trim())}',LOWER({Email})='${esc(email.trim().toLowerCase())}')`;
            const records = await listRecords(connection, "Orders", formula, 1);

            result = records.length === 0
                ? { found: false, orderNumber }
                : { found: true, ...records[0].fields, recordId: records[0].id };
        } catch (error: any) {
            result = { found: false, error: true, message: error?.message || "Airtable request failed" };
        }

        if (storeLocation === "context") {
            api.addToContext(contextKey, result, "simple");
        } else {
            // @ts-ignore
            api.addToInput(inputKey, result);
        }
    }
});
