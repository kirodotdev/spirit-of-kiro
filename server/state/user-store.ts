import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DYNAMODB_CONFIG } from '../config';

const client = new DynamoDBClient(DYNAMODB_CONFIG);
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = 'Users';
const USERNAMES_TABLE = 'Usernames';

export async function createUser(userId: string, username: string, hashedPassword: string) {
  // First check if username exists
  const usernameCommand = new GetCommand({
    TableName: USERNAMES_TABLE,
    Key: {
      username
    }
  });

  const usernameResult = await docClient.send(usernameCommand);
  if (usernameResult.Item) {
    throw new Error('Username already taken');
  }

  // Create user and username entries
  const userCommand = new PutCommand({
    TableName: USERS_TABLE,
    Item: {
      userId,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    }
  });

  const usernameCreateCommand = new PutCommand({
    TableName: USERNAMES_TABLE,
    Item: {
      username,
      userId,
      createdAt: new Date().toISOString()
    }
  });

  await Promise.all([
    docClient.send(userCommand),
    docClient.send(usernameCreateCommand)
  ]);

  return { userId, username };
}

export async function getUser(username: string) {
  // First get userId from username
  const usernameCommand = new GetCommand({
    TableName: USERNAMES_TABLE,
    Key: {
      username
    }
  });

  const usernameResult = await docClient.send(usernameCommand);
  if (!usernameResult.Item) {
    return null;
  }

  // Then get full user data
  const userCommand = new GetCommand({
    TableName: USERS_TABLE,
    Key: {
      userId: usernameResult.Item.userId
    }
  });

  const userResult = await docClient.send(userCommand);
  return userResult.Item;
}

export async function savePersonaDetail(userId: string, detail: string, value: string) {
  const command = new PutCommand({
    TableName: 'Persona',
    Item: {
      userId,
      detail,
      value,
      createdAt: new Date().toISOString()
    }
  });

  await docClient.send(command);
  return true;
}