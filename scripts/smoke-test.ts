/**
 * Smoke test: exercises the mock adapter end-to-end against the seeded DB.
 * Prints results to stderr (stdout is reserved for MCP-style usage).
 */
import { openDb } from '../packages/trendyol/dist/db/client.js';
import { TrendyolMockAdapter } from '../packages/trendyol/dist/adapter/trendyol-mock.adapter.js';

const log = (msg: string, data?: unknown) => {
  process.stderr.write(`[smoke] ${msg}${data !== undefined ? ' ' + JSON.stringify(data, null, 2) : ''}\n`);
};

async function main() {
  const { db } = openDb();
  const adapter = new TrendyolMockAdapter(db);

  log('--- orders.list (no filter, size=3)');
  const ordersAll = await adapter.orders.list({ size: 3 });
  log(`total=${ordersAll.totalElements} returned=${ordersAll.items.length}`);
  log('first order:', {
    packageId: ordersAll.items[0]?.packageId,
    status: ordersAll.items[0]?.status,
    customer: ordersAll.items[0]?.customerName,
    items: ordersAll.items[0]?.items.length,
  });

  log('--- orders.list status=Created,Shipped');
  const filtered = await adapter.orders.list({ status: ['Created', 'Shipped'], size: 5 });
  log(`total=${filtered.totalElements}`);
  log('statuses:', filtered.items.map((o) => o.status));

  log('--- products.list approved=true size=3');
  const prods = await adapter.products.list({ approved: true, size: 3 });
  log(`total approved=${prods.totalElements}`);
  log('first product:', {
    title: prods.items[0]?.title,
    barcode: prods.items[0]?.barcode,
    quantity: prods.items[0]?.quantity,
    salePrice: prods.items[0]?.salePrice,
  });

  log('--- product.get by barcode');
  const byBarcode = await adapter.products.get({ barcode: prods.items[0]!.barcode });
  log('got:', { title: byBarcode?.title, brandName: byBarcode?.brandName });

  log('--- inventory.update batch');
  const batch = await adapter.inventory.update({
    items: [
      { barcode: prods.items[0]!.barcode, quantity: 999 },
      { barcode: prods.items[1]!.barcode, salePrice: 12345.67, listPrice: 13000 },
      { barcode: 'NONEXISTENT_BARCODE', quantity: 5 },
    ],
  });
  log(`batchId=${batch.batchId}`);

  log('immediate poll:');
  const s1 = await adapter.inventory.batchStatus({ batchId: batch.batchId });
  log(' status1:', s1?.status);

  await new Promise((r) => setTimeout(r, 3500));
  const s2 = await adapter.inventory.batchStatus({ batchId: batch.batchId });
  log(' status2 (after 3.5s):', { status: s2?.status, results: s2?.results });

  log('--- shipment_providers');
  const provs = await adapter.shipmentProviders.list();
  log('providers:', provs.map((p) => `${p.code}=${p.name}`).join(', '));

  log('--- order.ship');
  const created = await adapter.orders.list({ status: ['Created'], size: 1 });
  if (created.items.length > 0) {
    const target = created.items[0]!;
    await adapter.orders.ship({
      packageId: target.packageId,
      trackingNumber: 'SMOKE-TEST-12345',
      providerCode: 'YK',
    });
    const after = await adapter.orders.get(target.packageId);
    log('shipped:', { packageId: target.packageId, newStatus: after?.status, tracking: after?.cargoTrackingNumber });
  } else {
    log('no Created orders to test ship');
  }

  log('--- questions.list WAITING_FOR_ANSWER');
  const waiting = await adapter.qna.list({ status: 'WAITING_FOR_ANSWER', size: 2 });
  log(`waiting: ${waiting.totalElements}`);
  if (waiting.items.length > 0) {
    log('first:', { id: waiting.items[0]?.id, text: waiting.items[0]?.text, productName: waiting.items[0]?.productName });
    log('--- question.reply');
    await adapter.qna.reply({
      questionId: waiting.items[0]!.id,
      text: 'Smoke test cevabı: ürün stoklarımızda mevcut, hızlı kargo.',
    });
    log('reply ok');
  }

  log('--- claims.list');
  const cls = await adapter.claims.list({ size: 5 });
  log(`claims: total=${cls.totalElements}`);
  log('first claim:', cls.items[0] ? { id: cls.items[0].id, status: cls.items[0].status, reason: cls.items[0].reason } : null);

  log('=== DONE ===');
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[smoke] FAIL: ${err}\n`);
  if (err instanceof Error && err.stack) process.stderr.write(err.stack);
  process.exit(1);
});
