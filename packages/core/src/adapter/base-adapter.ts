import type {
  CancelItemsInput,
  OrdersFilter,
  ShipInput,
  UnifiedOrder,
  UpdateStatusInput,
} from '../domain/order.js';
import type {
  Category,
  ProductFilter,
  ProductLookup,
  UnifiedProduct,
} from '../domain/product.js';
import type {
  BatchResult,
  PriceInventoryUpdate,
} from '../domain/inventory.js';
import type {
  CustomerQuestion,
  QuestionReplyInput,
  QuestionsFilter,
} from '../domain/question.js';
import type { ClaimsFilter, ReturnClaim } from '../domain/claim.js';
import type { ShipmentProvider } from '../domain/shipping.js';

export interface ListResult<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type Platform = 'trendyol' | 'hepsiburada' | 'n11' | 'pazarama';

export interface OrdersAdapter {
  list(filter: OrdersFilter): Promise<ListResult<UnifiedOrder>>;
  get(packageId: number): Promise<UnifiedOrder | null>;
  ship(input: ShipInput): Promise<{ ok: true }>;
  cancelItems(input: CancelItemsInput): Promise<{ ok: true }>;
  updateStatus(input: UpdateStatusInput): Promise<{ ok: true }>;
}

export interface ProductsAdapter {
  list(filter: ProductFilter): Promise<ListResult<UnifiedProduct>>;
  get(input: ProductLookup): Promise<UnifiedProduct | null>;
  listCategories(input: { parentId?: number }): Promise<Category[]>;
}

export interface InventoryAdapter {
  update(input: PriceInventoryUpdate): Promise<{ batchId: string }>;
  batchStatus(input: { batchId: string }): Promise<BatchResult | null>;
}

export interface QnaAdapter {
  list(filter: QuestionsFilter): Promise<ListResult<CustomerQuestion>>;
  reply(input: QuestionReplyInput): Promise<{ ok: true }>;
}

export interface ClaimsAdapter {
  list(filter: ClaimsFilter): Promise<ListResult<ReturnClaim>>;
}

export interface ShipmentProvidersAdapter {
  list(): Promise<ShipmentProvider[]>;
}

export interface MarketplaceAdapter {
  readonly platform: Platform;
  readonly orders: OrdersAdapter;
  readonly products: ProductsAdapter;
  readonly inventory: InventoryAdapter;
  readonly qna: QnaAdapter;
  readonly claims: ClaimsAdapter;
  readonly shipmentProviders: ShipmentProvidersAdapter;
}
