import { randomUUID } from 'node:crypto';
import {
  type BatchResult,
  type CancelItemsInput,
  type Category,
  type ClaimsFilter,
  type CustomerQuestion,
  type ListResult,
  type MarketplaceAdapter,
  NotFoundError,
  type OrdersFilter,
  type Platform,
  type PriceInventoryUpdate,
  type ProductFilter,
  type ProductLookup,
  type QuestionReplyInput,
  type QuestionsFilter,
  type ReturnClaim,
  type ShipInput,
  type ShipmentProvider,
  type UnifiedOrder,
  type UnifiedProduct,
  type UpdateStatusInput,
  ValidationError,
  logger,
} from '@commerce-mcp/core';
import { and, asc, count, desc, eq, gte, inArray, lte, or } from 'drizzle-orm';
import type { DrizzleDb } from '../db/client.js';
import {
  apiLogs,
  batchRequests,
  brands,
  categories,
  claims,
  orderItems,
  products,
  questions,
  shipmentPackages,
  shipmentProviders,
} from '../db/schema.js';

const ALLOWED_SHIP_FROM: ReadonlySet<string> = new Set(['Created', 'Picking', 'Invoiced']);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export class TrendyolMockAdapter implements MarketplaceAdapter {
  readonly platform: Platform = 'trendyol';

  readonly orders;
  readonly products;
  readonly inventory;
  readonly qna;
  readonly claims;
  readonly shipmentProviders;

  constructor(private readonly db: DrizzleDb) {
    this.orders = this.makeOrders();
    this.products = this.makeProducts();
    this.inventory = this.makeInventory();
    this.qna = this.makeQna();
    this.claims = this.makeClaims();
    this.shipmentProviders = this.makeShipmentProviders();
  }

  private logCall(toolName: string, request: unknown, response: unknown, latencyMs: number, error?: string): void {
    try {
      this.db
        .insert(apiLogs)
        .values({ ts: new Date(), toolName, request, response, latencyMs, error: error ?? null })
        .run();
    } catch (e) {
      logger.warn({ err: e }, 'Failed to write api_logs row');
    }
  }

  private makeOrders() {
    return {
      list: async (filter: OrdersFilter): Promise<ListResult<UnifiedOrder>> => {
        const page = filter.page ?? 0;
        const size = Math.min(filter.size ?? 20, 200);

        const conditions = [];
        if (filter.status && filter.status.length > 0) {
          conditions.push(inArray(shipmentPackages.status, filter.status));
        }
        if (filter.startDate) conditions.push(gte(shipmentPackages.createdAt, filter.startDate));
        if (filter.endDate) conditions.push(lte(shipmentPackages.createdAt, filter.endDate));
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const totalRow = await this.db.select({ c: count() }).from(shipmentPackages).where(where ?? undefined).all();
        const totalElements = totalRow[0]?.c ?? 0;

        const rows = await this.db
          .select()
          .from(shipmentPackages)
          .where(where ?? undefined)
          .orderBy(desc(shipmentPackages.createdAt))
          .limit(size)
          .offset(page * size)
          .all();

        const packageIds = rows.map((r) => r.packageId);
        const items =
          packageIds.length > 0
            ? await this.db.select().from(orderItems).where(inArray(orderItems.packageId, packageIds)).all()
            : [];

        const itemsByPackage = new Map<number, typeof items>();
        for (const it of items) {
          const list = itemsByPackage.get(it.packageId) ?? [];
          list.push(it);
          itemsByPackage.set(it.packageId, list);
        }

        const orders: UnifiedOrder[] = rows.map((r) => this.toUnifiedOrder(r, itemsByPackage.get(r.packageId) ?? []));

        return {
          items: orders,
          page,
          size,
          totalElements,
          totalPages: Math.max(1, Math.ceil(totalElements / size)),
        };
      },

      get: async (packageId: number): Promise<UnifiedOrder | null> => {
        const row = await this.db
          .select()
          .from(shipmentPackages)
          .where(eq(shipmentPackages.packageId, packageId))
          .get();
        if (!row) return null;
        const items = await this.db.select().from(orderItems).where(eq(orderItems.packageId, packageId)).all();
        return this.toUnifiedOrder(row, items);
      },

      ship: async (input: ShipInput): Promise<{ ok: true }> => {
        const start = Date.now();
        const row = await this.db
          .select()
          .from(shipmentPackages)
          .where(eq(shipmentPackages.packageId, input.packageId))
          .get();
        if (!row) throw new NotFoundError(`Shipment package ${input.packageId} not found`);
        if (!ALLOWED_SHIP_FROM.has(row.status)) {
          throw new ValidationError(
            `Cannot ship a package in status "${row.status}". Allowed source statuses: ${[...ALLOWED_SHIP_FROM].join(', ')}.`,
          );
        }

        let providerName = row.cargoProviderName;
        let providerCode = input.providerCode ?? row.cargoProviderCode;
        if (input.providerCode) {
          const provider = await this.db
            .select()
            .from(shipmentProviders)
            .where(eq(shipmentProviders.code, input.providerCode))
            .get();
          if (!provider) {
            throw new ValidationError(`Unknown shipment provider code "${input.providerCode}".`);
          }
          providerName = provider.name;
          providerCode = provider.code;
        }

        await this.db
          .update(shipmentPackages)
          .set({
            status: 'Shipped',
            cargoTrackingNumber: input.trackingNumber,
            cargoProviderCode: providerCode,
            cargoProviderName: providerName,
            lastModifiedAt: new Date(),
          })
          .where(eq(shipmentPackages.packageId, input.packageId))
          .run();

        this.logCall('order_ship', input, { ok: true }, Date.now() - start);
        return { ok: true };
      },

      cancelItems: async (input: CancelItemsInput): Promise<{ ok: true }> => {
        const start = Date.now();
        const pkg = await this.db
          .select()
          .from(shipmentPackages)
          .where(eq(shipmentPackages.packageId, input.packageId))
          .get();
        if (!pkg) throw new NotFoundError(`Shipment package ${input.packageId} not found`);

        const allItems = await this.db
          .select()
          .from(orderItems)
          .where(eq(orderItems.packageId, input.packageId))
          .all();

        const targetIds = new Set(input.items.map((i) => i.orderLineItemId));
        const unknown = [...targetIds].filter((id) => !allItems.some((it) => it.orderLineItemId === id));
        if (unknown.length > 0) {
          throw new ValidationError(`Unknown orderLineItemId(s): ${unknown.join(', ')}`);
        }

        for (const id of targetIds) {
          await this.db
            .update(orderItems)
            .set({ status: 'Cancelled' })
            .where(and(eq(orderItems.packageId, input.packageId), eq(orderItems.orderLineItemId, id)))
            .run();
        }

        const remaining = allItems.filter((it) => !targetIds.has(it.orderLineItemId) && it.status !== 'Cancelled');
        if (remaining.length === 0) {
          await this.db
            .update(shipmentPackages)
            .set({ status: 'UnSupplied', lastModifiedAt: new Date() })
            .where(eq(shipmentPackages.packageId, input.packageId))
            .run();
        } else {
          await this.db
            .update(shipmentPackages)
            .set({ lastModifiedAt: new Date() })
            .where(eq(shipmentPackages.packageId, input.packageId))
            .run();
        }

        this.logCall('order_cancel', input, { ok: true }, Date.now() - start);
        return { ok: true };
      },

      updateStatus: async (input: UpdateStatusInput): Promise<{ ok: true }> => {
        const start = Date.now();
        const pkg = await this.db
          .select()
          .from(shipmentPackages)
          .where(eq(shipmentPackages.packageId, input.packageId))
          .get();
        if (!pkg) throw new NotFoundError(`Shipment package ${input.packageId} not found`);

        const transitions: Record<string, string[]> = {
          Created: ['Picking'],
          Picking: ['Invoiced'],
          Invoiced: ['Picking'],
        };
        const allowed = transitions[pkg.status] ?? [];
        if (!allowed.includes(input.status)) {
          throw new ValidationError(
            `Invalid transition from "${pkg.status}" to "${input.status}". Use order_ship to mark as Shipped.`,
          );
        }

        await this.db
          .update(shipmentPackages)
          .set({ status: input.status, lastModifiedAt: new Date() })
          .where(eq(shipmentPackages.packageId, input.packageId))
          .run();
        this.logCall('order_status_update', input, { ok: true }, Date.now() - start);
        return { ok: true };
      },
    };
  }

  private toUnifiedOrder(row: typeof shipmentPackages.$inferSelect, itemRows: (typeof orderItems.$inferSelect)[]): UnifiedOrder {
    const addr = row.shipmentAddress;
    return {
      packageId: row.packageId,
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      status: row.status as UnifiedOrder['status'],
      customerName: row.customerName,
      totalPrice: row.totalPrice,
      currency: row.currency,
      cargoTrackingNumber: row.cargoTrackingNumber ?? undefined,
      cargoProviderName: row.cargoProviderName ?? undefined,
      shipmentAddress: isObject(addr) ? (addr as unknown as UnifiedOrder['shipmentAddress']) : undefined,
      createdAt: row.createdAt,
      lastModifiedAt: row.lastModifiedAt,
      items: itemRows.map((it) => ({
        orderLineItemId: it.orderLineItemId,
        productMainId: it.productMainId,
        barcode: it.barcode,
        productName: it.productName,
        quantity: it.quantity,
        price: it.price,
        status: it.status as UnifiedOrder['status'],
      })),
    };
  }

  private makeProducts() {
    return {
      list: async (filter: ProductFilter): Promise<ListResult<UnifiedProduct>> => {
        const page = filter.page ?? 0;
        const size = Math.min(filter.size ?? 20, 200);
        const conditions = [];
        if (filter.approved !== undefined) conditions.push(eq(products.approved, filter.approved));
        if (filter.barcode) conditions.push(eq(products.barcode, filter.barcode));
        if (filter.stockCode) conditions.push(eq(products.stockCode, filter.stockCode));
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const totalRow = await this.db.select({ c: count() }).from(products).where(where ?? undefined).all();
        const totalElements = totalRow[0]?.c ?? 0;

        const rows = await this.db
          .select()
          .from(products)
          .where(where ?? undefined)
          .orderBy(desc(products.updatedAt))
          .limit(size)
          .offset(page * size)
          .all();

        const brandIds = [...new Set(rows.map((r) => r.brandId))];
        const categoryIds = [...new Set(rows.map((r) => r.categoryId))];
        const brandRows =
          brandIds.length > 0 ? await this.db.select().from(brands).where(inArray(brands.id, brandIds)).all() : [];
        const categoryRows =
          categoryIds.length > 0
            ? await this.db.select().from(categories).where(inArray(categories.id, categoryIds)).all()
            : [];
        const brandMap = new Map(brandRows.map((b) => [b.id, b.name] as const));
        const categoryMap = new Map(categoryRows.map((c) => [c.id, c.name] as const));

        return {
          items: rows.map((r) => this.toUnifiedProduct(r, brandMap, categoryMap)),
          page,
          size,
          totalElements,
          totalPages: Math.max(1, Math.ceil(totalElements / size)),
        };
      },

      get: async (input: ProductLookup): Promise<UnifiedProduct | null> => {
        if (!input.barcode && !input.productMainId) {
          throw new ValidationError('Provide either barcode or productMainId.');
        }
        if (input.barcode && input.productMainId) {
          throw new ValidationError('Provide barcode XOR productMainId, not both.');
        }
        const where = input.barcode
          ? eq(products.barcode, input.barcode)
          : eq(products.productMainId, input.productMainId!);
        const row = await this.db.select().from(products).where(where).get();
        if (!row) return null;
        const brand = await this.db.select().from(brands).where(eq(brands.id, row.brandId)).get();
        const cat = await this.db.select().from(categories).where(eq(categories.id, row.categoryId)).get();
        const brandMap = new Map(brand ? [[brand.id, brand.name]] : []);
        const categoryMap = new Map(cat ? [[cat.id, cat.name]] : []);
        return this.toUnifiedProduct(row, brandMap, categoryMap);
      },

      listCategories: async (input: { parentId?: number }): Promise<Category[]> => {
        const rows = input.parentId !== undefined
          ? await this.db.select().from(categories).where(eq(categories.parentId, input.parentId)).orderBy(asc(categories.name)).all()
          : await this.db.select().from(categories).orderBy(asc(categories.name)).all();
        return rows.map((r) => ({ id: r.id, name: r.name, parentId: r.parentId ?? null }));
      },
    };
  }

  private toUnifiedProduct(
    row: typeof products.$inferSelect,
    brandMap: Map<number, string>,
    categoryMap: Map<number, string>,
  ): UnifiedProduct {
    const result: UnifiedProduct = {
      productMainId: row.productMainId,
      barcode: row.barcode,
      stockCode: row.stockCode,
      title: row.title,
      brandId: row.brandId,
      categoryId: row.categoryId,
      listPrice: row.listPrice,
      salePrice: row.salePrice,
      quantity: row.quantity,
      approved: row.approved,
      vatRate: row.vatRate,
      dimensionalWeight: row.dimensionalWeight,
    };
    if (row.description) result.description = row.description;
    const brandName = brandMap.get(row.brandId);
    if (brandName) result.brandName = brandName;
    const categoryName = categoryMap.get(row.categoryId);
    if (categoryName) result.categoryName = categoryName;
    if (row.attributes && isObject(row.attributes)) result.attributes = row.attributes as Record<string, unknown>;
    return result;
  }

  private makeInventory() {
    return {
      update: async (input: PriceInventoryUpdate): Promise<{ batchId: string }> => {
        if (input.items.length === 0) throw new ValidationError('items must not be empty.');
        if (input.items.length > 1000) throw new ValidationError('Maximum 1000 items per batch.');
        const batchId = randomUUID();
        const now = new Date();
        await this.db
          .insert(batchRequests)
          .values({ id: batchId, type: 'price-inventory', status: 'created', itemCount: input.items.length, createdAt: now })
          .run();

        // Schedule async transitions: created (0s) → processing (~1s) → completed (~3s)
        setTimeout(() => {
          this.db
            .update(batchRequests)
            .set({ status: 'processing' })
            .where(eq(batchRequests.id, batchId))
            .run();
        }, 1_000);

        setTimeout(async () => {
          const results: { barcode: string; success: boolean; message?: string }[] = [];
          for (const item of input.items) {
            const exists = await this.db.select().from(products).where(eq(products.barcode, item.barcode)).get();
            if (!exists) {
              results.push({ barcode: item.barcode, success: false, message: 'Barcode not found' });
              continue;
            }
            const updates: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
            if (item.quantity !== undefined) updates.quantity = item.quantity;
            if (item.salePrice !== undefined) updates.salePrice = item.salePrice;
            if (item.listPrice !== undefined) updates.listPrice = item.listPrice;
            // Mock realism: 5% random failure injection
            if (Math.random() < 0.05) {
              results.push({ barcode: item.barcode, success: false, message: 'Simulated upstream error' });
              continue;
            }
            // listPrice >= salePrice rule
            const listPrice = item.listPrice ?? exists.listPrice;
            const salePrice = item.salePrice ?? exists.salePrice;
            if (listPrice < salePrice) {
              results.push({
                barcode: item.barcode,
                success: false,
                message: `listPrice (${listPrice}) must be >= salePrice (${salePrice}).`,
              });
              continue;
            }
            await this.db.update(products).set(updates).where(eq(products.barcode, item.barcode)).run();
            results.push({ barcode: item.barcode, success: true });
          }
          this.db
            .update(batchRequests)
            .set({ status: 'completed', results, completedAt: new Date() })
            .where(eq(batchRequests.id, batchId))
            .run();
        }, 3_000);

        return { batchId };
      },

      batchStatus: async (input: { batchId: string }): Promise<BatchResult | null> => {
        const row = await this.db.select().from(batchRequests).where(eq(batchRequests.id, input.batchId)).get();
        if (!row) return null;
        return {
          batchId: row.id,
          type: row.type,
          status: row.status as BatchResult['status'],
          itemCount: row.itemCount,
          results: Array.isArray(row.results) ? (row.results as BatchResult['results']) : undefined,
          createdAt: row.createdAt,
          completedAt: row.completedAt ?? undefined,
        };
      },
    };
  }

  private makeQna() {
    return {
      list: async (filter: QuestionsFilter): Promise<ListResult<CustomerQuestion>> => {
        const page = filter.page ?? 0;
        const size = Math.min(filter.size ?? 20, 200);
        if (filter.startDate && filter.endDate) {
          const diff = filter.endDate.getTime() - filter.startDate.getTime();
          if (diff > 14 * 86_400_000) {
            throw new ValidationError('Date range must not exceed 14 days (Trendyol QnA limit).');
          }
        }
        const conditions = [];
        if (filter.status) conditions.push(eq(questions.status, filter.status));
        if (filter.startDate) conditions.push(gte(questions.createdAt, filter.startDate));
        if (filter.endDate) conditions.push(lte(questions.createdAt, filter.endDate));
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const totalRow = await this.db.select({ c: count() }).from(questions).where(where ?? undefined).all();
        const totalElements = totalRow[0]?.c ?? 0;

        const rows = await this.db
          .select({
            q: questions,
            productName: products.title,
          })
          .from(questions)
          .leftJoin(products, eq(questions.productMainId, products.productMainId))
          .where(where ?? undefined)
          .orderBy(desc(questions.createdAt))
          .limit(size)
          .offset(page * size)
          .all();

        const items: CustomerQuestion[] = rows.map((r) => {
          const q = r.q;
          const item: CustomerQuestion = {
            id: q.id,
            productMainId: q.productMainId,
            customerName: q.customerName,
            text: q.text,
            status: q.status as CustomerQuestion['status'],
            createdAt: q.createdAt,
          };
          if (r.productName) item.productName = r.productName;
          if (q.answer) item.answer = q.answer;
          if (q.answeredAt) item.answeredAt = q.answeredAt;
          return item;
        });

        return {
          items,
          page,
          size,
          totalElements,
          totalPages: Math.max(1, Math.ceil(totalElements / size)),
        };
      },

      reply: async (input: QuestionReplyInput): Promise<{ ok: true }> => {
        if (input.text.length < 5 || input.text.length > 500) {
          throw new ValidationError('Reply text must be between 5 and 500 characters.');
        }
        const q = await this.db.select().from(questions).where(eq(questions.id, input.questionId)).get();
        if (!q) throw new NotFoundError(`Question ${input.questionId} not found`);
        if (q.status !== 'WAITING_FOR_ANSWER') {
          throw new ValidationError(`Question is already in status "${q.status}".`);
        }
        await this.db
          .update(questions)
          .set({ answer: input.text, status: 'ANSWERED', answeredAt: new Date() })
          .where(eq(questions.id, input.questionId))
          .run();
        this.logCall('question_reply', input, { ok: true }, 0);
        return { ok: true };
      },
    };
  }

  private makeClaims() {
    return {
      list: async (filter: ClaimsFilter): Promise<ListResult<ReturnClaim>> => {
        const page = filter.page ?? 0;
        const size = Math.min(filter.size ?? 20, 200);
        const conditions = [];
        if (filter.status) conditions.push(eq(claims.status, filter.status));
        if (filter.startDate) conditions.push(gte(claims.createdAt, filter.startDate));
        if (filter.endDate) conditions.push(lte(claims.createdAt, filter.endDate));
        const where = conditions.length > 0 ? and(...conditions) : undefined;

        const totalRow = await this.db.select({ c: count() }).from(claims).where(where ?? undefined).all();
        const totalElements = totalRow[0]?.c ?? 0;

        const rows = await this.db
          .select()
          .from(claims)
          .where(where ?? undefined)
          .orderBy(desc(claims.createdAt))
          .limit(size)
          .offset(page * size)
          .all();

        return {
          items: rows.map((r) => {
            const item: ReturnClaim = {
              id: r.id,
              packageId: r.packageId,
              orderLineItemId: r.orderLineItemId,
              productMainId: r.productMainId,
              status: r.status as ReturnClaim['status'],
              reason: r.reason,
              createdAt: r.createdAt,
            };
            if (r.productName) item.productName = r.productName;
            if (r.customerNote) item.customerNote = r.customerNote;
            return item;
          }),
          page,
          size,
          totalElements,
          totalPages: Math.max(1, Math.ceil(totalElements / size)),
        };
      },
    };
  }

  private makeShipmentProviders() {
    return {
      list: async (): Promise<ShipmentProvider[]> => {
        const rows = await this.db.select().from(shipmentProviders).orderBy(asc(shipmentProviders.name)).all();
        return rows.map((r) => {
          const provider: ShipmentProvider = { id: r.id, code: r.code, name: r.name };
          if (r.taxNumber) provider.taxNumber = r.taxNumber;
          return provider;
        });
      },
    };
  }
}
