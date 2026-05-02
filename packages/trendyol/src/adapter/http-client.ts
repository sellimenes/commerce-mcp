import {
  AuthError,
  type Logger,
  NotFoundError,
  RateLimitError,
  TokenBucket,
  UpstreamError,
  ValidationError,
  sleep,
} from '@commerce-mcp/core';
import axios, { type AxiosInstance } from 'axios';

export interface TrendyolHttpOptions {
  baseUrl: string;
  supplierId: string;
  apiKey: string;
  apiSecret: string;
  integratorName: string;
  logger: Logger;
}

export class TrendyolHttpClient {
  private readonly axios: AxiosInstance;
  private readonly bucket: TokenBucket;

  constructor(opts: TrendyolHttpOptions) {
    const auth = Buffer.from(`${opts.apiKey}:${opts.apiSecret}`).toString('base64');
    this.axios = axios.create({
      baseURL: opts.baseUrl,
      timeout: 30_000,
      headers: {
        Authorization: `Basic ${auth}`,
        'User-Agent': `${opts.supplierId} - ${opts.integratorName}`,
        'Content-Type': 'application/json',
      },
    });
    this.bucket = new TokenBucket(50, 10_000);
    this.logger = opts.logger;
  }

  private readonly logger: Logger;

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    params?: Record<string, unknown>,
  ): Promise<T> {
    await this.bucket.take();
    try {
      const res = await this.axios.request<T>({ method, url: path, data: body, params });
      return res.data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;
        if (status === 401 || status === 403) {
          throw new AuthError(
            `Trendyol auth failed (${status}). Check credentials and User-Agent.`,
            err,
          );
        }
        if (status === 404) {
          throw new NotFoundError(`Trendyol returned 404 for ${path}`, err);
        }
        if (status === 400 || status === 422) {
          throw new ValidationError(`Trendyol validation error: ${JSON.stringify(data)}`, err);
        }
        if (status === 429) {
          await sleep(1_000 + Math.random() * 500);
          await this.bucket.take();
          try {
            const retry = await this.axios.request<T>({ method, url: path, data: body, params });
            return retry.data;
          } catch (retryErr) {
            throw new RateLimitError(
              'Trendyol rate limit (50 req / 10s) hit. Slow down.',
              retryErr,
            );
          }
        }
        throw new UpstreamError(`Trendyol HTTP ${status ?? 'error'}: ${err.message}`, err);
      }
      throw err;
    }
  }
}
