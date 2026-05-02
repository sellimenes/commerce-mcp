import { createHmac, timingSafeEqual } from 'node:crypto';

export interface ConfirmationTokenPayload {
  action: string;
  args: unknown;
  expiresAt: string;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000;

export function createConfirmationToken(
  action: string,
  args: unknown,
  secret = process.env.COMMERCE_MCP_CONFIRMATION_SECRET ?? 'dev-confirmation-secret',
  ttlMs = DEFAULT_TTL_MS,
): { token: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const payload: ConfirmationTokenPayload = { action, args, expiresAt };
  const body = base64url(JSON.stringify(payload));
  const signature = sign(body, secret);
  return { token: `${body}.${signature}`, expiresAt };
}

export function verifyConfirmationToken(
  token: string,
  action: string,
  args: unknown,
  secret = process.env.COMMERCE_MCP_CONFIRMATION_SECRET ?? 'dev-confirmation-secret',
): { ok: true; expiresAt: string } | { ok: false; reason: string } {
  const [body, signature, ...rest] = token.split('.');
  if (!body || !signature || rest.length > 0)
    return { ok: false, reason: 'Malformed previewToken.' };

  const expected = sign(body, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return { ok: false, reason: 'previewToken signature is invalid.' };
  }

  let payload: ConfirmationTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as ConfirmationTokenPayload;
  } catch {
    return { ok: false, reason: 'previewToken payload is invalid.' };
  }

  if (payload.action !== action)
    return { ok: false, reason: `previewToken was issued for ${payload.action}.` };
  if (new Date(payload.expiresAt).getTime() < Date.now())
    return { ok: false, reason: 'previewToken has expired.' };
  if (stableStringify(payload.args) !== stableStringify(args)) {
    return { ok: false, reason: 'previewToken does not match the requested action arguments.' };
  }

  return { ok: true, expiresAt: payload.expiresAt };
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => [key, sortValue(v)]),
  );
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

function base64url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}
