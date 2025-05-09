import { describe, beforeAll, afterAll, expect, test } from 'bun:test';
import { eventToData, formatMessage, once, setupDatabase } from '../../__tests__/util';

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

describe('Ping handler', () => {
  test('should respond to pings', async () => {
    socket.send(formatMessage('ping'));
    const event = await once(socket, 'message');
    const data = eventToData(event);
    expect(data).toEqual({ type: 'pong' });
  });
});