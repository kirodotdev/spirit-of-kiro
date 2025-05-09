
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DYNAMODB_CONFIG } from '../config';

export function eventToData(event: { data: string }) {
  if (!event.data) {
    console.error("Malformed event: ", event);
    return null;
  }

  try {
    return JSON.parse(event.data)
  } catch (e) {
    console.error("Malformed event data: ", event.data);
    return null;
  }
}

export function formatMessage(messageType: string, params?: any) {
  return JSON.stringify({
    type: messageType,
    body: params
  })
}

// Utility to convert WebSocket events to promises
export function once<T extends keyof WebSocketEventMap>(
  socket: WebSocket,
  eventName: T
): Promise<WebSocketEventMap[T]> {
  return new Promise((resolve, reject) => {
    socket.addEventListener(eventName, resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
}

// Helper functions
export async function setupSocket(url: string): Promise<WebSocket> {
  const socket = new WebSocket(url);
  await once(socket, 'open');
  return socket;
}

export async function signupUser(socket: WebSocket, user: any): Promise<void> {
  socket.send(formatMessage('signup', user));
  const event = await once(socket, 'message');
  const data = eventToData(event);

  if (data.type !== 'signup_success') {
    console.error('Failed to signup user: ', data);
    process.exit(1);
  }
}

export async function signinUser(socket: WebSocket, user: any): Promise<{ userId: string }> {
  socket.send(formatMessage('signin', user));
  const event = await once(socket, 'message');
  const data = eventToData(event);

  if (data.type !== 'signin_success') {
    console.error('Failed to signup user: ', data);
    process.exit(1);
  }

  return data.body;
}

export async function setupDatabase() {
  const client = new DynamoDBClient(DYNAMODB_CONFIG);
  // Check and delete existing tables
  const tables = ['Users', 'Usernames', 'Items', 'Inventory', 'Location', 'Persona'];

  for (const table of tables) {
    try {
      await client.send(new DescribeTableCommand({ TableName: table }));
      // Table exists, delete it
      await client.send(new DeleteTableCommand({ TableName: table }));
    } catch (err: any) {
      // Table doesn't exist, continue
      if (err.name !== 'ResourceNotFoundException') {
        console.error(`Error checking/deleting table ${table}:`, err);
      }
    }
  }

  // Create Users table
  try {
    await client.send(new CreateTableCommand({
      TableName: 'Users',
      AttributeDefinitions: [{
        AttributeName: 'userId',
        AttributeType: 'S'
      }],
      KeySchema: [{
        AttributeName: 'userId',
        KeyType: 'HASH'
      }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    }));

    // Create Usernames table
    await client.send(new CreateTableCommand({
      TableName: 'Usernames',
      AttributeDefinitions: [{
        AttributeName: 'username',
        AttributeType: 'S'
      }],
      KeySchema: [{
        AttributeName: 'username',
        KeyType: 'HASH'
      }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    }));

    // Create Items table
    await client.send(new CreateTableCommand({
      TableName: 'Items',
      AttributeDefinitions: [{
        AttributeName: 'id',
        AttributeType: 'S'
      }],
      KeySchema: [{
        AttributeName: 'id',
        KeyType: 'HASH'
      }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    }));

    // Create Inventory table
    await client.send(new CreateTableCommand({
      TableName: 'Inventory',
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' },
        { AttributeName: 'itemId', KeyType: 'RANGE' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' },
        { AttributeName: 'itemId', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));

    // Create Location table
    await client.send(new CreateTableCommand({
      TableName: 'Location',
      KeySchema: [
        { AttributeName: 'itemId', KeyType: 'HASH' },
        { AttributeName: 'location', KeyType: 'RANGE' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'itemId', AttributeType: 'S' },
        { AttributeName: 'location', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));

    // Create Persona table
    await client.send(new CreateTableCommand({
      TableName: 'Persona',
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'detail', KeyType: 'RANGE' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'detail', AttributeType: 'S' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }));

  } catch (err) {
    console.error('Error creating tables:', err);
  }
}
