import { describe, expect, it } from 'vitest';
import { createConfirmationToken, verifyConfirmationToken } from './confirmation.js';

describe('confirmation tokens', () => {
  it('accepts the exact action payload and rejects changed payloads', () => {
    const args = { items: [{ barcode: '8690000000001', quantity: 12 }] };
    const { token } = createConfirmationToken('execute_inventory_update', args, 'test-secret');

    expect(
      verifyConfirmationToken(token, 'execute_inventory_update', args, 'test-secret'),
    ).toMatchObject({
      ok: true,
    });
    expect(
      verifyConfirmationToken(
        token,
        'execute_inventory_update',
        { items: [{ barcode: '8690000000001', quantity: 13 }] },
        'test-secret',
      ),
    ).toMatchObject({ ok: false });
  });
});
