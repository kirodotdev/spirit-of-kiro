import { describe, expect, test } from 'bun:test';
import { hashPassword, verifyPassword } from '../password';

describe('Password utils', () => {
  test('should hash password', async () => {
    // amazonq-ignore-next-line
    const password = 'testpassword';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
  });

  test('should verify password', async () => {
    // amazonq-ignore-next-line
    const password = 'testpassword';
    const hash = await hashPassword(password);
    const verified = await verifyPassword(password, hash);
    expect(verified).toBe(true);
  });

  test('should reject incorrect password', async () => {
    // amazonq-ignore-next-line
    const correctPassword = 'testpassword';
    const wrongPassword = 'wrongpassword';
    const hash = await hashPassword(correctPassword);
    const verified = await verifyPassword(wrongPassword, hash);
    expect(verified).toBe(false);
  });
});
