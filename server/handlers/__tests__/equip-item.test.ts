import { describe, beforeAll, afterAll, expect, test, mock } from 'bun:test';
import { eventToData, formatMessage, setupSocket, signupUser, signinUser, once, setupDatabase } from '../../__tests__/util.js';
import mockPullItemResponse from '../../mocks/pull-item.json';

let unauthSocket: WebSocket;
let authSocket: WebSocket;

const TEST_USER = {
  username: 'equip-item-tester',
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

    // Mock generateItems to return our test data
    mock.module('../../llm/prompts', () => ({
      generateItems: async () => mockPullItemResponse,
      generatePersonaDescription: async () => require('../../mocks/describe-equipment.json')
    }));

  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

afterAll(() => {
  if (unauthSocket) unauthSocket.close();
  if (authSocket) authSocket.close();
});

describe('Equip Item handler', () => {
  test('should require authentication', async () => {
    unauthSocket.send(formatMessage('equip-item', { itemId: 'test-id', slot: 'hands' }));
    const event = await once(unauthSocket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('error');
    expect(data.body).toContain('Authentication required');
  });

  test('should handle equipping items to valid slots', async () => {
    // First create an item
    authSocket.send(formatMessage('pull-item'));
    const itemResponse = await once(authSocket, 'message');
    const itemData = eventToData(itemResponse);
    expect(itemData.type).toEqual('pulled-item');
    const itemId = itemData.body.item.id;

    // Equip the item
    authSocket.send(formatMessage('equip-item', { itemId, slot: 'hands' }));
    const equipResponse = await once(authSocket, 'message');
    const equipData = eventToData(equipResponse);
    expect(equipData.type).toEqual('item-equipped');
    expect(equipData.body.itemId).toEqual(itemId);
    expect(equipData.body.slot).toEqual('hands');

    // Verify item is in equipment slot
    authSocket.send(formatMessage('list-inventory', { inventoryId: `${testUser.userId}:hands` }));
    const inventoryResponse = await once(authSocket, 'message');
    const inventoryData = eventToData(inventoryResponse);
    expect(inventoryData.type).toEqual('inventory-items');
    expect(inventoryData.body.length).toEqual(1);
    expect(inventoryData.body[0].id).toEqual(itemId);
  }, 20000);

  test('should handle invalid equipment slots', async () => {
    // First create an item
    authSocket.send(formatMessage('pull-item'));
    const itemResponse = await once(authSocket, 'message');
    const itemData = eventToData(itemResponse);
    expect(itemData.type).toEqual('pulled-item');
    const itemId = itemData.body.item.id;

    // Try to equip to invalid slot
    authSocket.send(formatMessage('equip-item', { itemId, slot: 'invalid-slot' }));
    const equipResponse = await once(authSocket, 'message');
    const equipData = eventToData(equipResponse);
    expect(equipData.type).toEqual('error');
    expect(equipData.body).toContain('Invalid equipment slot');
  }, 20000);

  test('should not allow equipping items from another user\'s inventory', async () => {
    // Create a second user and socket
    const otherSocket = await setupSocket(WS_URL);
    const otherUser = {
      username: 'other-equip-user',
      password: process.env.TEST_PASSWORD || 'test-password'
    };
    await signupUser(otherSocket, otherUser);
    await signinUser(otherSocket, otherUser);

    // Create an item in other user's inventory
    otherSocket.send(formatMessage('pull-item'));
    const itemResponse = await once(otherSocket, 'message');
    const itemData = eventToData(itemResponse);
    expect(itemData.type).toEqual('pulled-item');
    const itemId = itemData.body.item.id;

    // Try to equip the item using the first user's connection
    authSocket.send(formatMessage('equip-item', { itemId, slot: 'hands' }));
    const equipResponse = await once(authSocket, 'message');
    const equipData = eventToData(equipResponse);
    expect(equipData.type).toEqual('error');
    expect(equipData.body).toContain('Item not in your inventory');

    // Clean up
    otherSocket.close();
  }, 20000);
});
