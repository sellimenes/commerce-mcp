import type { MarketplaceAdapter } from '@commerce-mcp/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { register as registerOrdersList } from './orders/orders-list.js';
import { register as registerOrderShip } from './orders/order-ship.js';
import { register as registerOrderCancel } from './orders/order-cancel.js';
import { register as registerOrderStatusUpdate } from './orders/order-status-update.js';

import { register as registerProductsList } from './products/products-list.js';
import { register as registerProductGet } from './products/product-get.js';
import { register as registerCategoriesList } from './products/categories-list.js';

import { register as registerInventoryUpdate } from './inventory/inventory-update.js';
import { register as registerBatchStatus } from './inventory/batch-status.js';

import { register as registerQuestionsList } from './qna/questions-list.js';
import { register as registerQuestionReply } from './qna/question-reply.js';

import { register as registerClaimsList } from './claims/claims-list.js';
import { register as registerShipmentProvidersList } from './shipping/shipment-providers-list.js';

export function registerTools(server: McpServer, adapter: MarketplaceAdapter): void {
  registerOrdersList(server, adapter);
  registerOrderShip(server, adapter);
  registerOrderCancel(server, adapter);
  registerOrderStatusUpdate(server, adapter);

  registerProductsList(server, adapter);
  registerProductGet(server, adapter);
  registerCategoriesList(server, adapter);

  registerInventoryUpdate(server, adapter);
  registerBatchStatus(server, adapter);

  registerQuestionsList(server, adapter);
  registerQuestionReply(server, adapter);

  registerClaimsList(server, adapter);
  registerShipmentProvidersList(server, adapter);
}
