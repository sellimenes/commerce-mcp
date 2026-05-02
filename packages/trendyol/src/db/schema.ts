import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const shipmentPackages = sqliteTable(
  'shipment_packages',
  {
    packageId: integer('package_id').primaryKey(),
    orderId: integer('order_id').notNull(),
    orderNumber: text('order_number').notNull(),
    status: text('status').notNull(),
    customerName: text('customer_name').notNull(),
    totalPrice: real('total_price').notNull(),
    currency: text('currency').notNull().default('TRY'),
    cargoTrackingNumber: text('cargo_tracking_number'),
    cargoProviderCode: text('cargo_provider_code'),
    cargoProviderName: text('cargo_provider_name'),
    shipmentAddress: text('shipment_address', { mode: 'json' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    lastModifiedAt: integer('last_modified_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    statusIdx: index('shipment_packages_status_idx').on(t.status),
    createdAtIdx: index('shipment_packages_created_at_idx').on(t.createdAt),
  }),
);

export const orderItems = sqliteTable(
  'order_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    packageId: integer('package_id')
      .notNull()
      .references(() => shipmentPackages.packageId),
    orderLineItemId: integer('order_line_item_id').notNull(),
    productMainId: text('product_main_id').notNull(),
    barcode: text('barcode').notNull(),
    productName: text('product_name').notNull(),
    quantity: integer('quantity').notNull(),
    price: real('price').notNull(),
    status: text('status').notNull().default('Created'),
  },
  (t) => ({
    packageIdx: index('order_items_package_idx').on(t.packageId),
  }),
);

export const products = sqliteTable(
  'products',
  {
    productMainId: text('product_main_id').primaryKey(),
    barcode: text('barcode').notNull().unique(),
    stockCode: text('stock_code').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    brandId: integer('brand_id').notNull(),
    categoryId: integer('category_id').notNull(),
    listPrice: real('list_price').notNull(),
    salePrice: real('sale_price').notNull(),
    quantity: integer('quantity').notNull().default(0),
    approved: integer('approved', { mode: 'boolean' }).notNull().default(false),
    vatRate: integer('vat_rate').notNull().default(20),
    dimensionalWeight: real('dimensional_weight').notNull().default(1),
    attributes: text('attributes', { mode: 'json' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    barcodeIdx: index('products_barcode_idx').on(t.barcode),
    stockCodeIdx: index('products_stock_code_idx').on(t.stockCode),
    approvedIdx: index('products_approved_idx').on(t.approved),
  }),
);

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
});

export const brands = sqliteTable('brands', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

export const claims = sqliteTable(
  'claims',
  {
    id: text('id').primaryKey(),
    packageId: integer('package_id')
      .notNull()
      .references(() => shipmentPackages.packageId),
    orderLineItemId: integer('order_line_item_id').notNull(),
    productMainId: text('product_main_id').notNull(),
    productName: text('product_name'),
    status: text('status').notNull(),
    reason: text('reason').notNull(),
    customerNote: text('customer_note'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    statusIdx: index('claims_status_idx').on(t.status),
    createdAtIdx: index('claims_created_at_idx').on(t.createdAt),
  }),
);

export const questions = sqliteTable(
  'questions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productMainId: text('product_main_id')
      .notNull()
      .references(() => products.productMainId),
    customerName: text('customer_name').notNull(),
    text: text('text').notNull(),
    answer: text('answer'),
    status: text('status').notNull().default('WAITING_FOR_ANSWER'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    answeredAt: integer('answered_at', { mode: 'timestamp' }),
  },
  (t) => ({
    statusIdx: index('questions_status_idx').on(t.status),
    createdAtIdx: index('questions_created_at_idx').on(t.createdAt),
  }),
);

export const batchRequests = sqliteTable(
  'batch_requests',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    status: text('status').notNull(),
    itemCount: integer('item_count').notNull(),
    results: text('results', { mode: 'json' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (t) => ({
    statusIdx: index('batch_requests_status_idx').on(t.status),
  }),
);

export const shipmentProviders = sqliteTable('shipment_providers', {
  id: integer('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  taxNumber: text('tax_number'),
});

export const apiLogs = sqliteTable(
  'api_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ts: integer('ts', { mode: 'timestamp' }).notNull(),
    toolName: text('tool_name').notNull(),
    request: text('request', { mode: 'json' }),
    response: text('response', { mode: 'json' }),
    latencyMs: integer('latency_ms'),
    error: text('error'),
  },
  (t) => ({
    tsIdx: index('api_logs_ts_idx').on(t.ts),
  }),
);
