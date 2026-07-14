import { createExtension } from "@cognigy/extension-tools";

import { airtableConnection } from "./connections/airtableConnection";
import { getOrderStatusNode } from "./nodes/getOrderStatus";
import { getOrderItemsNode } from "./nodes/getOrderItems";
import { createRmaNode } from "./nodes/createRma";
import { createTicketNode } from "./nodes/createTicket";

export default createExtension({
    nodes: [
        getOrderStatusNode,
        getOrderItemsNode,
        createRmaNode,
        createTicketNode
    ],
    connections: [airtableConnection],
    options: {
        label: "Aurora Airtable"
    }
});
