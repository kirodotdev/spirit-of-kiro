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

describe('Signin handler', () => {
  test('should handle missing username during signin', async () => {
    socket.send(formatMessage('signin', {
      // amazonq-ignore-next-line
      password: 'testpassword'
    }));
    const event = await once(socket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('signin_failure');
    expect(data.body).toContain('`username` is required');
  });

  test('should handle missing password during signin', async () => {
    socket.send(formatMessage('signin', {
      username: 'testuser'
    }));
    const event = await once(socket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('signin_failure');
    expect(data.body).toContain('`password` is required');
  });

  test('should handle invalid username during signin', async () => {
    socket.send(formatMessage('signin', {
      username: 'invaliduser',
      // amazonq-ignore-next-line
      password: 'testpassword'
    }));
    const event = await once(socket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('signin_failure');
    expect(data.body).toContain('Invalid username or password');
  });

  test('should handle invalid password during signin', async () => {
    socket.send(formatMessage('signin', {
      username: 'testuser',
      // amazonq-ignore-next-line
      password: 'invalidpassword'
    }));
    const event = await once(socket, 'message');
    const data = eventToData(event);
    expect(data.type).toEqual('signin_failure');
    expect(data.body).toContain('Invalid username or password');
  });

  test('should handle valid signin with correct credentials', async () => {
    const testUser = {
      username: 'testuser',
      // amazonq-ignore-next-line
      password: 'testpassword'
    };

    // First signup the test user
    socket.send(formatMessage('signup', testUser));
    const signupEvent = await once(socket, 'message');
    const signupData = eventToData(signupEvent);
    expect(signupData.type).toEqual('signup_success');

    // Then try to signin
    socket.send(formatMessage('signin', testUser));
    const signinEvent = await once(socket, 'message');
    const signinData = eventToData(signinEvent);
    expect(signinData.type).toEqual('signin_success');
    expect(signinData.body.username).toEqual(testUser.username);
    expect(signinData.body.userId).toBeDefined();
  }, 10000);
});