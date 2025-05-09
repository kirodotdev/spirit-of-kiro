import { describe, beforeAll, afterAll, expect, test } from 'bun:test';
import { eventToData, once, setupDatabase } from './util';

let socket: WebSocket;

beforeAll(async () => {
  await setupDatabase();
  // amazonq-ignore-next-line
  socket = new WebSocket("ws://localhost:8080");

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
});

afterAll(() => {
  if (socket) {
    socket.close();
  }
});

describe('WebSocket server', () => {
  test('should handle malformed messages', async () => {
    socket.send('malformed message');
    const event = await once(socket, 'message');
    const data = eventToData(event);
    expect(data).toEqual({ type: 'error', body: 'Invalid message format' })
  });

  test('should handle unknown message types', async () => {
    socket.send(JSON.stringify({ type: 'unknown' }));
    const event = await once(socket, 'message');
    const data = eventToData(event);
    expect(data).toEqual({ type: 'error', body: 'Invalid message type' })
  });
});