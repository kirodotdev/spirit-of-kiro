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

describe('Signup handler', () => {
  test('should handle missing username during signup', async () => {
    socket.send(formatMessage('signup', {
      password: process.env.TEST_PASSWORD || 'test-password'
    }));
    const event = await once(socket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('signup_failure');
    expect(data.body).toContain('`username` is required');
  });

  test('should handle missing password during signup', async () => {
    socket.send(formatMessage('signup', {
      username: 'testuser'
    }));
    const event = await once(socket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('signup_failure');
    expect(data.body).toContain('`password` is required');
  });

  test('should handle username already taken during signup', async () => {
    // First create a valid user
    socket.send(formatMessage('signup', {
      username: 'dupeuser',
      password: process.env.TEST_PASSWORD || 'test-password'
    }));
    const firstEvent = await once(socket, 'message');
    const firstData = eventToData(firstEvent);
    expect(firstData.type).toEqual('signup_success');

    // Now attempt to create the user again
    socket.send(formatMessage('signup', {
      username: 'dupeuser',
      password: process.env.TEST_PASSWORD || 'test-password'
    }));
    const secondEvent = await once(socket, 'message');
    const secondData = eventToData(secondEvent);
    expect(secondData.type).toEqual('signup_failure');
    expect(secondData.body).toContain('Username already taken');
  });
});