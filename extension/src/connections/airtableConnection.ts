import { IConnectionSchema } from "@cognigy/extension-tools";

/**
 * Airtable credentials are stored as a managed Cognigy Connection (encrypted),
 * never as plain text in flow nodes.
 */
export const airtableConnection: IConnectionSchema = {
    type: "airtable",
    label: "Airtable (Personal Access Token)",
    fields: [
        { fieldName: "apiToken" },
        { fieldName: "baseId" }
    ]
};
