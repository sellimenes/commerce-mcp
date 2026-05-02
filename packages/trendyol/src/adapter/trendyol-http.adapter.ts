import { type MarketplaceAdapter, type Platform, UpstreamError } from '@commerce-mcp/core';
import type { TrendyolHttpClient } from './http-client.js';

/**
 * Real Trendyol HTTP adapter. Phase 3 will fill these in once API credentials
 * are available. Each method maps unified domain types to/from the Trendyol
 * REST shape using `mappers.ts`.
 *
 * Endpoint reference (path templates only):
 *   GET    /integration/order/sellers/{supplierId}/orders
 *   PUT    /integration/order/sellers/{supplierId}/shipment-packages/{packageId}
 *   PUT    /integration/order/sellers/{supplierId}/shipment-packages/{packageId}/tracking-details
 *   PUT    /integration/order/sellers/{supplierId}/shipment-packages/{packageId}/items/unsupplied
 *   GET    /integration/product/sellers/{supplierId}/products
 *   POST   /integration/product/sellers/{supplierId}/products
 *   GET    /integration/product/product-categories
 *   POST   /integration/inventory/sellers/{supplierId}/products/price-and-inventory
 *   GET    /integration/inventory/sellers/{supplierId}/batch-request-result/{batchId}
 *   GET    /integration/qna/sellers/{supplierId}/questions/filter
 *   POST   /integration/qna/sellers/{supplierId}/questions/{questionId}/answers
 *   GET    /integration/sellers/{supplierId}/claims
 *   GET    /integration/shipment-providers
 */
export class TrendyolHttpAdapter implements MarketplaceAdapter {
  readonly platform: Platform = 'trendyol';

  constructor(
    private readonly client: TrendyolHttpClient,
    private readonly supplierId: string,
  ) {}

  readonly orders = {
    list: async (): Promise<never> => {
      throw new UpstreamError('TrendyolHttpAdapter.orders.list not implemented yet (Phase 3).');
    },
    get: async (): Promise<never> => {
      throw new UpstreamError('TrendyolHttpAdapter.orders.get not implemented yet (Phase 3).');
    },
    ship: async (): Promise<never> => {
      throw new UpstreamError('TrendyolHttpAdapter.orders.ship not implemented yet (Phase 3).');
    },
    cancelItems: async (): Promise<never> => {
      throw new UpstreamError(
        'TrendyolHttpAdapter.orders.cancelItems not implemented yet (Phase 3).',
      );
    },
    updateStatus: async (): Promise<never> => {
      throw new UpstreamError(
        'TrendyolHttpAdapter.orders.updateStatus not implemented yet (Phase 3).',
      );
    },
  } as MarketplaceAdapter['orders'];

  readonly products = {
    list: async (): Promise<never> => {
      throw new UpstreamError('TrendyolHttpAdapter.products.list not implemented yet (Phase 3).');
    },
    get: async (): Promise<never> => {
      throw new UpstreamError('TrendyolHttpAdapter.products.get not implemented yet (Phase 3).');
    },
    listCategories: async (): Promise<never> => {
      throw new UpstreamError(
        'TrendyolHttpAdapter.products.listCategories not implemented yet (Phase 3).',
      );
    },
  } as MarketplaceAdapter['products'];

  readonly inventory = {
    update: async (): Promise<never> => {
      throw new UpstreamError(
        'TrendyolHttpAdapter.inventory.update not implemented yet (Phase 3).',
      );
    },
    batchStatus: async (): Promise<never> => {
      throw new UpstreamError(
        'TrendyolHttpAdapter.inventory.batchStatus not implemented yet (Phase 3).',
      );
    },
  } as MarketplaceAdapter['inventory'];

  readonly qna = {
    list: async (): Promise<never> => {
      throw new UpstreamError('TrendyolHttpAdapter.qna.list not implemented yet (Phase 3).');
    },
    reply: async (): Promise<never> => {
      throw new UpstreamError('TrendyolHttpAdapter.qna.reply not implemented yet (Phase 3).');
    },
  } as MarketplaceAdapter['qna'];

  readonly claims = {
    list: async (): Promise<never> => {
      throw new UpstreamError('TrendyolHttpAdapter.claims.list not implemented yet (Phase 3).');
    },
  } as MarketplaceAdapter['claims'];

  readonly shipmentProviders = {
    list: async (): Promise<never> => {
      throw new UpstreamError(
        'TrendyolHttpAdapter.shipmentProviders.list not implemented yet (Phase 3).',
      );
    },
  } as MarketplaceAdapter['shipmentProviders'];
}
