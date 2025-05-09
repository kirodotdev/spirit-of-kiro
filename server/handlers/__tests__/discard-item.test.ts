
import { describe, beforeAll, afterAll, expect, test } from 'bun:test';
import { eventToData, formatMessage, setupSocket, signupUser, signinUser, once, setupDatabase } from '../../__tests__/util.js';
import mockPullItemResponse from '../../mocks/pull-item.json';

let unauthSocket: WebSocket;
let authSocket: WebSocket;

const TEST_USER = {
  username: 'discard-item-tester01',
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
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

afterAll(() => {
  if (unauthSocket) unauthSocket.close();
  if (authSocket) authSocket.close();
});

describe('Discard Item handler', () => {
  test('should require authentication', async () => {
    unauthSocket.send(formatMessage('discard-item', { itemId: 'test-id' }));
    const event = await once(unauthSocket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('error');
    expect(data.body).toContain('Authentication required');
  });

  test('should be able to pull back a discarded item', async () => {
    // First create an item
    authSocket.send(formatMessage('pull-item'));
    const itemResponse = await once(authSocket, 'message');
    const itemData = eventToData(itemResponse);
    expect(itemData.type).toEqual('pulled-item');
    const itemOneId = itemData.body.item.id;
    expect(itemData.body.item.name).toEqual(mockPullItemResponse.items[0].name);

    // Discard the item
    authSocket.send(formatMessage('discard-item', { itemId: itemOneId }));
    const discardResponse = await once(authSocket, 'message');
    const discardData = eventToData(discardResponse);
    expect(discardData.type).toEqual('item-discarded');

    // Pull item and verify it's the same one we just discarded
    authSocket.send(formatMessage('pull-item'));
    const pullResponse = await once(authSocket, 'message');
    const pullData = eventToData(pullResponse);
    expect(pullData.type).toEqual('pulled-item');
    expect(pullData.body.item.name).toEqual(mockPullItemResponse.items[0].name); 
    expect(pullData.body.item.id).toEqual(itemOneId); 
  }, 20000);

  test('should generate new item when junk dimension is empty', async () => {
    // Pull item again, now that junk is empty
    authSocket.send(formatMessage('pull-item'));
    const pullResponse = await once(authSocket, 'message');
    const pullData = eventToData(pullResponse);
    expect(pullData.type).toEqual('pulled-item');

    // Because the junk dimension was empty now it should generate a fresh item using the mocked data
    expect(pullData.body.item.name).toEqual(mockPullItemResponse.items[0].name); 
  }, 20000);

  test('should not allow discarding items from another user\'s inventory', async () => {
    // Create a second user and socket
    const otherSocket = await setupSocket(WS_URL);
    const otherUser = {
      username: 'other-discard-inventory-user',
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

    // Try to discard the item using the first user's connection
    authSocket.send(formatMessage('discard-item', { itemId }));
    const discardResponse = await once(authSocket, 'message');
    const discardData = eventToData(discardResponse);
    expect(discardData.type).toEqual('error');
    expect(discardData.body).toContain('Item not in your inventory');

    // Clean up
    otherSocket.close();
  }, 20000);
});
