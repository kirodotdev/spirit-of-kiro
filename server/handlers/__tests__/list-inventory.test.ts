import { describe, beforeAll, afterAll, expect, test } from 'bun:test';
import { eventToData, formatMessage, setupSocket, signupUser, signinUser, once, setupDatabase } from '../../__tests__/util.js';
import mockPullItemResponse from '../../mocks/pull-item.json';

let unauthSocket: WebSocket;
let authSocket: WebSocket;

const TEST_USER = {
  username: 'list-inventory-tester',
  password: process.env.TEST_PASSWORD || 'test-password'
};
let testUser: { userId: string };

const WS_URL = process.env.WS_URL || 'ws://localhost:8080';

beforeAll(async () => {
  try {
    await setupDatabase();
    unauthSocket = await setupSocket(WS_URL);
    authSocket = await setupSocket(WS_URL);
    await signupUser(authSocket, TEST_USER);
    testUser = await signinUser(authSocket, TEST_USER);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});