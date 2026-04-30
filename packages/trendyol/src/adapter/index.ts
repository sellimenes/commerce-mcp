import type { MarketplaceAdapter } from '@commerce-mcp/core';
import { logger } from '@commerce-mcp/core';
import { openDb } from '../db/client.js';
import type { TrendyolEnv } from '../env.js';
import { TrendyolHttpAdapter } from './trendyol-http.adapter.js';
import { TrendyolHttpClient } from './http-client.js';
import { TrendyolMockAdapter } from './trendyol-mock.adapter.js';

export function createAdapter(env: TrendyolEnv): MarketplaceAdapter {
  if (env.useMock) {
    const { db } = openDb({ path: env.dbPath ?? undefined });
    logger.info({ mode: 'mock', dbPath: env.dbPath ?? '~/.commerce-mcp/trendyol.db' }, 'Trendyol adapter ready');
    return new TrendyolMockAdapter(db);
  }
  const client = new TrendyolHttpClient({
    baseUrl: env.baseUrl,
    supplierId: env.supplierId,
    apiKey: env.apiKey,
    apiSecret: env.apiSecret,
    integratorName: env.integratorName,
    logger,
  });
  logger.info({ mode: 'http', supplierId: env.supplierId, baseUrl: env.baseUrl }, 'Trendyol adapter ready');
  return new TrendyolHttpAdapter(client, env.supplierId);
}

export { TrendyolMockAdapter } from './trendyol-mock.adapter.js';
export { TrendyolHttpAdapter } from './trendyol-http.adapter.js';
