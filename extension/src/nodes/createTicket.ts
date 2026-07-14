import { createNodeDescriptor, INodeFunctionBaseParams } from "@cognigy/extension-tools";
import { IAirtableConnection, createRecord } from "../lib/airtable";

export interface ICreateTicketParams extends INodeFunctionBaseParams {
    config: {
        connection: IAirtableConnection;
        email: string;
        subject: string;
        description: string;
        priority: "Low" | "Medium" | "High";
        storeLocation: "input" | "context";
        inputKey: string;
        contextKey: string;
    };
}

export const createTicketNode = createNodeDescriptor({
    type: "createTicket",
    defaultLabel: "Create Support Ticket",
    summary: "Creates a customer support ticket in Airtable",
    fields: [
        {
            key: "connection",
            label: "Airtable Connection",
            type: "connection",
            params: { connectionType: "airtable", required: true }
        },
        {
            key: "email",
            label: "Customer Email",
            type: "cognigyText",
            defaultValue: "{{context.email}}",
            params: { required: true }
        },
        {
            key: "subject",
            label: "Subject",
            type: "cognigyText",
            params: { required: true }
        },
        {
            key: "description",
            label: "Description",
            type: "cognigyText"
        },
        {
            key: "priority",
            label: "Priority",
            type: "select",
            defaultValue: "Medium",
            params: {
                options: [
                    { label: "Low", value: "Low" },
                    { label: "Medium", value: "Medium" },
                    { label: "High", value: "High" }
                ]
            }
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
            defaultValue: "ticket",
            condition: { key: "storeLocation", value: "input" }
        },
        {
            key: "contextKey",
            label: "Context Key to store Result",
            type: "cognigyText",
            defaultValue: "ticket",
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
        { type: "field", key: "email" },
        { type: "field", key: "subject" },
        { type: "field", key: "description" },
        { type: "field", key: "priority" },
        { type: "section", key: "storage" }
    ],
    appearance: { color: "#6A1B9A" },
    function: async ({ cognigy, config }: ICreateTicketParams) => {
        const { api } = cognigy;
        const { connection, email, subject, description, priority, storeLocation, inputKey, contextKey } = config;

        let result: any;
        try {
            const ticketNumber = `TCK-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

            const record = await createRecord(connection, "Tickets", {
                TicketNumber: ticketNumber,
                Email: email,
                Subject: subject,
                Description: description || "",
                Priority: priority || "Medium",
                Status: "Open",
                CreatedAt: new Date().toISOString().slice(0, 10)
            });

            result = { success: true, ticketNumber, recordId: record.id };
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
