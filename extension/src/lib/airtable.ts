import axios from "axios";

export interface IAirtableConnection {
    apiToken: string;
    baseId: string;
}

const BASE_URL = "https://api.airtable.com/v0";

/** Escape single quotes for use inside an Airtable filterByFormula string literal. */
export function esc(value: string): string {
    return String(value).replace(/'/g, "\\'");
}

export async function listRecords(
    connection: IAirtableConnection,
    table: string,
    filterByFormula: string,
    maxRecords = 50
): Promise<any[]> {
    const response = await axios.get(`${BASE_URL}/${connection.baseId}/${encodeURIComponent(table)}`, {
        headers: { Authorization: `Bearer ${connection.apiToken}` },
        params: { filterByFormula, maxRecords },
        timeout: 8000
    });
    return response.data.records || [];
}

export async function createRecord(
    connection: IAirtableConnection,
    table: string,
    fields: Record<string, unknown>
): Promise<any> {
    const response = await axios.post(
        `${BASE_URL}/${connection.baseId}/${encodeURIComponent(table)}`,
        { records: [{ fields }], typecast: true },
        {
            headers: {
                Authorization: `Bearer ${connection.apiToken}`,
                "Content-Type": "application/json"
            },
            timeout: 8000
        }
    );
    return response.data.records[0];
}
