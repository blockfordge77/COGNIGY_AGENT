import { createNodeDescriptor, INodeFunctionBaseParams } from "@cognigy/extension-tools";
import { IAirtableConnection, listRecords, esc } from "../lib/airtable";

export interface IGetOrderItemsParams extends INodeFunctionBaseParams {
    config: {
        connection: IAirtableConnection;
        orderNumber: string;
        onlyReturnEligible: boolean;
        storeLocation: "input" | "context";
        inputKey: string;
        contextKey: string;
    };
}

export const getOrderItemsNode = createNodeDescriptor({
    type: "getOrderItems",
    defaultLabel: "Get Order Items",
    summary: "Fetches the line items of an order from Airtable (feeds the RMA xApp)",
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
            key: "onlyReturnEligible",
            label: "Only return-eligible items",
            type: "toggle",
            defaultValue: false,
            description: "If enabled, items flagged ReturnEligible=false are excluded"
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
            defaultValue: "orderItems",
            condition: { key: "storeLocation", value: "input" }
        },
        {
            key: "contextKey",
            label: "Context Key to store Result",
            type: "cognigyText",
            defaultValue: "orderItems",
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
        { type: "field", key: "onlyReturnEligible" },
        { type: "section", key: "storage" }
    ],
    appearance: { color: "#1565C0" },
    function: async ({ cognigy, config }: IGetOrderItemsParams) => {
        const { api } = cognigy;
        const { connection, orderNumber, onlyReturnEligible, storeLocation, inputKey, contextKey } = config;

        let result: any;
        try {
            const formula = `{OrderNumber}='${esc(orderNumber.trim())}'`;
            const records = await listRecords(connection, "OrderItems", formula);

            let items = records.map((record) => ({ recordId: record.id, ...record.fields }));
            if (onlyReturnEligible) {
                items = items.filter((item: any) => String(item.ReturnEligible).toLowerCase() === "true");
            }

            result = { found: items.length > 0, orderNumber, count: items.length, items };
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
