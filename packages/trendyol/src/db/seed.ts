import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { defaultDbPath, openDb } from './client.js';
import { applyMigrations } from './migrate.js';
import {
  brands,
  categories,
  claims,
  orderItems,
  products,
  questions,
  shipmentPackages,
  shipmentProviders,
} from './schema.js';

interface SeedCategory {
  id: number;
  name: string;
  parentId: number | null;
}

const SEED_CATEGORIES: SeedCategory[] = [
  { id: 1, name: 'Elektronik', parentId: null },
  { id: 2, name: 'Telefon & Aksesuar', parentId: 1 },
  { id: 3, name: 'Bilgisayar', parentId: 1 },
  { id: 4, name: 'Ev & Yaşam', parentId: null },
  { id: 5, name: 'Mutfak Gereçleri', parentId: 4 },
  { id: 6, name: 'Moda', parentId: null },
  { id: 7, name: 'Kadın Giyim', parentId: 6 },
  { id: 8, name: 'Erkek Giyim', parentId: 6 },
];

const SEED_BRANDS = [
  { id: 1, name: 'Apple' },
  { id: 2, name: 'Samsung' },
  { id: 3, name: 'Xiaomi' },
  { id: 4, name: 'Lenovo' },
  { id: 5, name: 'Asus' },
  { id: 6, name: 'Arzum' },
  { id: 7, name: 'Karaca' },
  { id: 8, name: 'Schafer' },
  { id: 9, name: 'LCW' },
  { id: 10, name: 'Mavi' },
  { id: 11, name: 'Defacto' },
  { id: 12, name: 'Koton' },
];

const SEED_PROVIDERS = [
  { id: 17, code: 'YK', name: 'Yurtiçi Kargo' },
  { id: 19, code: 'ARAS', name: 'Aras Kargo' },
  { id: 30, code: 'MNG', name: 'MNG Kargo' },
  { id: 32, code: 'TEX', name: 'Trendyol Express' },
];

const STATUS_DISTRIBUTION: Array<[string, number]> = [
  ['Created', 8],
  ['Picking', 6],
  ['Invoiced', 4],
  ['Shipped', 10],
  ['Delivered', 8],
  ['Cancelled', 2],
  ['Returned', 2],
];

const TR_FIRST_NAMES = [
  'Ahmet',
  'Ayşe',
  'Mehmet',
  'Fatma',
  'Mustafa',
  'Zeynep',
  'Ali',
  'Elif',
  'Hüseyin',
  'Emine',
  'Hasan',
  'Hatice',
  'İbrahim',
  'Merve',
  'Osman',
  'Selin',
  'Yusuf',
  'Esra',
  'Murat',
  'Büşra',
  'Emre',
  'Seda',
];
const TR_LAST_NAMES = [
  'Yılmaz',
  'Kaya',
  'Demir',
  'Şahin',
  'Çelik',
  'Yıldız',
  'Yıldırım',
  'Öztürk',
  'Aydın',
  'Özdemir',
  'Arslan',
  'Doğan',
  'Kılıç',
  'Aslan',
  'Çetin',
  'Kara',
];

const TR_CITIES = [
  'İstanbul',
  'Ankara',
  'İzmir',
  'Bursa',
  'Antalya',
  'Adana',
  'Konya',
  'Gaziantep',
];

const PRODUCT_TEMPLATES = [
  { title: 'iPhone 15 Pro Max 256GB', categoryId: 2, brandId: 1, basePrice: 64999 },
  { title: 'Samsung Galaxy S24 Ultra 512GB', categoryId: 2, brandId: 2, basePrice: 54999 },
  { title: 'Xiaomi Redmi Note 13 Pro 256GB', categoryId: 2, brandId: 3, basePrice: 14999 },
  { title: 'Lenovo IdeaPad 5 Ryzen 7', categoryId: 3, brandId: 4, basePrice: 29999 },
  { title: 'Asus ROG Strix G15', categoryId: 3, brandId: 5, basePrice: 44999 },
  { title: 'Arzum Okka Türk Kahve Makinesi', categoryId: 5, brandId: 6, basePrice: 3499 },
  { title: 'Karaca Çay Sefası 18 Parça Set', categoryId: 5, brandId: 7, basePrice: 2299 },
  { title: 'Schafer Çelik Tencere Seti 7 Parça', categoryId: 5, brandId: 8, basePrice: 4799 },
  { title: 'LCW Erkek Basic Tişört', categoryId: 8, brandId: 9, basePrice: 199 },
  { title: 'Mavi Slim Fit Kot Pantolon', categoryId: 8, brandId: 10, basePrice: 899 },
  { title: 'Defacto Kadın Triko Kazak', categoryId: 7, brandId: 11, basePrice: 549 },
  { title: 'Koton Kadın Şifon Bluz', categoryId: 7, brandId: 12, basePrice: 449 },
];

function rand<T>(arr: readonly T[]): T {
  return mustGet(arr, Math.floor(Math.random() * arr.length), 'Cannot pick from an empty array.');
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function generateBarcode(seed: number): string {
  return `869${pad(seed, 10)}`;
}

function mustGet<T>(arr: readonly T[], index: number, message: string): T {
  const value = arr[index];
  if (!value) throw new Error(message);
  return value;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

export function seed(opts: { fresh?: boolean; path?: string } = {}): void {
  const path = opts.path ?? defaultDbPath();
  mkdirSync(dirname(path), { recursive: true });

  applyMigrations(path);

  const { db, raw } = openDb({ path });

  if (opts.fresh) {
    raw.exec(`
      DELETE FROM api_logs;
      DELETE FROM batch_requests;
      DELETE FROM questions;
      DELETE FROM claims;
      DELETE FROM order_items;
      DELETE FROM shipment_packages;
      DELETE FROM products;
      DELETE FROM categories;
      DELETE FROM brands;
      DELETE FROM shipment_providers;
    `);
  }

  // Categories, brands, providers
  db.insert(categories).values(SEED_CATEGORIES).run();
  db.insert(brands).values(SEED_BRANDS).run();
  db.insert(shipmentProviders).values(SEED_PROVIDERS).run();

  // Products: 80 total, alternating approved
  const productRows: (typeof products.$inferInsert)[] = [];
  for (let i = 0; i < 80; i++) {
    const tpl = mustGet(
      PRODUCT_TEMPLATES,
      i % PRODUCT_TEMPLATES.length,
      'Missing product template.',
    );
    const variant = Math.floor(i / PRODUCT_TEMPLATES.length) + 1;
    const productMainId = `PMI${pad(1000 + i, 6)}`;
    const listPrice = tpl.basePrice * (1 + Math.random() * 0.3);
    const salePrice = listPrice * (0.7 + Math.random() * 0.25);
    productRows.push({
      productMainId,
      barcode: generateBarcode(i + 1),
      stockCode: `SKU-${pad(i + 1, 5)}`,
      title: variant > 1 ? `${tpl.title} (Varyant ${variant})` : tpl.title,
      description: `${tpl.title} — orijinal ürün, hızlı kargo.`,
      brandId: tpl.brandId,
      categoryId: tpl.categoryId,
      listPrice: Math.round(listPrice * 100) / 100,
      salePrice: Math.round(salePrice * 100) / 100,
      quantity: randInt(0, 250),
      approved: i % 2 === 0,
      vatRate: 20,
      dimensionalWeight: Math.round((0.5 + Math.random() * 5) * 100) / 100,
      attributes: {
        renk: rand(['Siyah', 'Beyaz', 'Mavi', 'Kırmızı']),
        beden: rand(['S', 'M', 'L', 'XL']),
      },
      createdAt: daysAgo(randInt(30, 180)),
      updatedAt: daysAgo(randInt(0, 30)),
    });
  }
  db.insert(products).values(productRows).run();

  // Shipment packages: 40 total across statuses
  let packageIdCounter = 700_000_001;
  let orderIdCounter = 900_000_001;
  let lineItemIdCounter = 1_000_000_001;
  const allPackages: number[] = [];

  for (const [status, count] of STATUS_DISTRIBUTION) {
    for (let i = 0; i < count; i++) {
      const packageId = packageIdCounter++;
      const orderId = orderIdCounter++;
      const customerName = `${rand(TR_FIRST_NAMES)} ${rand(TR_LAST_NAMES)}`;
      const itemCount = randInt(1, 3);
      let total = 0;
      const items: (typeof orderItems.$inferInsert)[] = [];
      for (let j = 0; j < itemCount; j++) {
        const product = mustGet(
          productRows,
          randInt(0, productRows.length - 1),
          'Missing generated product.',
        );
        const qty = randInt(1, 3);
        const price = product.salePrice;
        total += qty * price;
        items.push({
          packageId,
          orderLineItemId: lineItemIdCounter++,
          productMainId: product.productMainId,
          barcode: product.barcode,
          productName: product.title,
          quantity: qty,
          price: Math.round(price * 100) / 100,
          status:
            status === 'Cancelled' ? 'Cancelled' : status === 'Returned' ? 'Returned' : 'Created',
        });
      }
      const ageDays =
        status === 'Delivered'
          ? randInt(7, 25)
          : status === 'Returned'
            ? randInt(15, 40)
            : randInt(0, 7);
      const createdAt = daysAgo(ageDays);
      const provider = rand(SEED_PROVIDERS);
      const hasTracking = ['Shipped', 'Delivered', 'Returned'].includes(status);
      db.insert(shipmentPackages)
        .values({
          packageId,
          orderId,
          orderNumber: `TY${pad(orderId, 12)}`,
          status,
          customerName,
          totalPrice: Math.round(total * 100) / 100,
          currency: 'TRY',
          cargoTrackingNumber: hasTracking ? `${pad(randInt(1, 9_999_999_999), 10)}` : null,
          cargoProviderCode: hasTracking ? provider.code : null,
          cargoProviderName: hasTracking ? provider.name : null,
          shipmentAddress: {
            firstName: customerName.split(' ')[0],
            lastName: customerName.split(' ')[1],
            fullAddress: `${rand(['Atatürk', 'İstiklal', 'Cumhuriyet', 'Mevlana'])} Cad. No:${randInt(1, 200)} D:${randInt(1, 30)}`,
            city: rand(TR_CITIES),
            district: rand(['Kadıköy', 'Beşiktaş', 'Çankaya', 'Konak', 'Nilüfer', 'Muratpaşa']),
            postalCode: pad(randInt(10000, 99999), 5),
            phone: `05${pad(randInt(0, 9_999_999_999), 9)}`,
          },
          createdAt,
          lastModifiedAt: daysAgo(randInt(0, ageDays)),
        })
        .run();
      db.insert(orderItems).values(items).run();
      allPackages.push(packageId);
    }
  }

  // Questions: 25 total, 15 unanswered
  const productList = productRows;
  const questionTexts = [
    'Bu ürün stokta var mı? Acil lazım.',
    'Kargoya ne zaman verilir?',
    'Garanti süresi nedir?',
    'Renk seçeneği var mı?',
    'Fatura kesilebiliyor mu?',
    'Beden ölçüleri nasıl?',
    'Faturalı orijinal ürün mü?',
    'İade koşulları nelerdir?',
    'Kapıda ödeme yapabilir miyim?',
    'Bu ürün su geçirmez mi?',
  ];
  for (let i = 0; i < 25; i++) {
    const product = mustGet(
      productList,
      randInt(0, productList.length - 1),
      'Missing generated product.',
    );
    const answered = i >= 15;
    const createdAt = daysAgo(randInt(0, 13));
    db.insert(questions)
      .values({
        productMainId: product.productMainId,
        customerName: rand(TR_FIRST_NAMES),
        text: rand(questionTexts),
        answer: answered
          ? 'Merhaba, ürün stoklarımızda mevcut, sipariş sonrası 1 iş günü içinde kargoya verilir.'
          : null,
        status: answered ? 'ANSWERED' : 'WAITING_FOR_ANSWER',
        createdAt,
        answeredAt: answered ? new Date(createdAt.getTime() + randInt(1, 24) * 3_600_000) : null,
      })
      .run();
  }

  // Claims: 6
  const deliveredOrReturned = allPackages.slice(-10);
  const claimReasons = [
    'Ürün açıklamada belirtilenden farklı',
    'Bedeni uymadı',
    'Hasarlı geldi',
    'Yanlış ürün gönderildi',
    'Beğenmedim',
    'Kalitesi beklediğim gibi değil',
  ];
  for (let i = 0; i < 6; i++) {
    const packageId = mustGet(
      deliveredOrReturned,
      i % deliveredOrReturned.length,
      'Missing package for claim.',
    );
    const items = db.select().from(orderItems).where(orderItemsByPackage(packageId)).all();
    if (items.length === 0) continue;
    const item = items[0];
    if (!item) continue;
    db.insert(claims)
      .values({
        id: `CLM${pad(50000 + i, 8)}`,
        packageId,
        orderLineItemId: item.orderLineItemId,
        productMainId: item.productMainId,
        productName: item.productName,
        status: i < 3 ? 'Created' : i < 5 ? 'WaitingInAction' : 'Accepted',
        reason: rand(claimReasons),
        customerNote: i % 2 === 0 ? 'Lütfen değişim yapılmasını rica ediyorum.' : null,
        createdAt: daysAgo(randInt(1, 14)),
      })
      .run();
  }

  raw.close();

  console.error(
    `[seed] populated ${path}
       products: ${productRows.length}
       shipment_packages: ${allPackages.length}
       questions: 25 (15 unanswered)
       claims: 6
       categories: ${SEED_CATEGORIES.length}, brands: ${SEED_BRANDS.length}, providers: ${SEED_PROVIDERS.length}`,
  );
}

import { eq } from 'drizzle-orm';
function orderItemsByPackage(packageId: number) {
  return eq(orderItems.packageId, packageId);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed({ fresh: true });
}
