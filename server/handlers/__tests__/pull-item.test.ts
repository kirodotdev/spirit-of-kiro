import { describe, beforeAll, afterAll, expect, test, mock } from 'bun:test';
import { eventToData, formatMessage, once, setupSocket, signupUser, signinUser, setupDatabase } from '../../__tests__/util.js';
import mockPullItemResponse from '../../mocks/pull-item.json';

let unauthSocket: WebSocket;
let authSocket: WebSocket;

const TEST_USER = {
  username: 'pull-item-tester',
  password: process.env.TEST_PASSWORD || 'test-password'
};

const WS_URL = process.env.WS_URL || 'ws://localhost:8080';

beforeAll(async () => {
  try {
    await setupDatabase();
    unauthSocket = await setupSocket(WS_URL);
    authSocket = await setupSocket(WS_URL);
    await signupUser(authSocket, TEST_USER);
    await signinUser(authSocket, TEST_USER);

    // Mock generateItems to return our test data
    /*mock.module('../../llm/prompts', () => ({
      generateItems: async () => mockPullItemResponse
    }));*/

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

afterAll(() => {
  if (unauthSocket) {
    unauthSocket.close();
  }
  if (authSocket) {
    authSocket.close();
  }
});

describe('Pull Item handler', () => {
  test('should require authentication', async () => {
    unauthSocket.send(formatMessage('pull-item'));
    const event = await once(unauthSocket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('error');
    expect(data.body).toContain('Authentication required');
  }, 20000);

  test('should handle successful item creation', async () => {
    authSocket.send(formatMessage('pull-item'));
    const event = await once(authSocket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('pulled-item');
    expect(data.body).toHaveProperty('story');
    expect(data.body).toHaveProperty('item');
    expect(data.body.item).toHaveProperty('id');
    expect(data.body.item).toHaveProperty('name');
    expect(data.body.item).toHaveProperty('weight');
    expect(data.body.item).toHaveProperty('value');
    expect(data.body.item).toHaveProperty('icon');
    expect(data.body.item).toHaveProperty('description');
    expect(data.body.item).toHaveProperty('color');
    expect(data.body.item).toHaveProperty('materials');
    expect(data.body.item).toHaveProperty('damage');
    expect(Array.isArray(data.body.item.materials)).toBe(true);

    // Verify the mocked data matches
    //expect(data.body.story).toEqual(mockPullItemResponse.story);
    //expect(data.body.item.name).toEqual(mockPullItemResponse.items[0].name);
  }, 20000);
});