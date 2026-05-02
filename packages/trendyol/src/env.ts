import { booleanFlag, loadEnvWith } from '@commerce-mcp/core';
import { z } from 'zod';

const envSchema = {
  TRENDYOL_USE_MOCK: booleanFlag,
  TRENDYOL_SUPPLIER_ID: z.string().optional(),
  TRENDYOL_API_KEY: z.string().optional(),
  TRENDYOL_API_SECRET: z.string().optional(),
  TRENDYOL_INTEGRATOR_NAME: z.string().default('SelfIntegration'),
  TRENDYOL_DB_PATH: z.string().optional(),
  TRENDYOL_API_BASE_URL: z.string().url().default('https://apigw.trendyol.com'),
};

export type TrendyolEnv = ReturnType<typeof loadTrendyolEnv>;

export function loadTrendyolEnv(): {
  useMock: boolean;
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  integratorName: string;
  dbPath?: string;
  baseUrl: string;
} {
  const raw = loadEnvWith(envSchema);

  if (raw.TRENDYOL_USE_MOCK) {
    return {
      useMock: true,
      supplierId: raw.TRENDYOL_SUPPLIER_ID ?? 'MOCK_SUPPLIER',
      apiKey: raw.TRENDYOL_API_KEY ?? '',
      apiSecret: raw.TRENDYOL_API_SECRET ?? '',
      integratorName: raw.TRENDYOL_INTEGRATOR_NAME,
      dbPath: raw.TRENDYOL_DB_PATH,
      baseUrl: raw.TRENDYOL_API_BASE_URL,
    };
  }

  const missing: string[] = [];
  if (!raw.TRENDYOL_SUPPLIER_ID) missing.push('TRENDYOL_SUPPLIER_ID');
  if (!raw.TRENDYOL_API_KEY) missing.push('TRENDYOL_API_KEY');
  if (!raw.TRENDYOL_API_SECRET) missing.push('TRENDYOL_API_SECRET');
  if (missing.length > 0) {
    throw new Error(
      `Missing Trendyol credentials: ${missing.join(', ')}.\nSet TRENDYOL_USE_MOCK=1 to use the SQLite mock instead.`,
    );
  }

  const { TRENDYOL_SUPPLIER_ID, TRENDYOL_API_KEY, TRENDYOL_API_SECRET } = raw;
  if (!TRENDYOL_SUPPLIER_ID || !TRENDYOL_API_KEY || !TRENDYOL_API_SECRET) {
    throw new Error('Missing Trendyol credentials after validation.');
  }

  return {
    useMock: false,
    supplierId: TRENDYOL_SUPPLIER_ID,
    apiKey: TRENDYOL_API_KEY,
    apiSecret: TRENDYOL_API_SECRET,
    integratorName: raw.TRENDYOL_INTEGRATOR_NAME,
    dbPath: raw.TRENDYOL_DB_PATH,
    baseUrl: raw.TRENDYOL_API_BASE_URL,
  };
}
