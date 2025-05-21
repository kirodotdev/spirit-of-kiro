import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand, TransactWriteCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DYNAMODB_CONFIG } from '../config';

const client = new DynamoDBClient(DYNAMODB_CONFIG);
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'Items';
const INVENTORY_TABLE = 'Inventory';
const LOCATION_TABLE = 'Location';

interface ItemResponse {
  id: string;
  [key: string]: any;
}

export async function listInventoryItems(inventoryId: string) {
  // First get inventory references
  const command = new QueryCommand({
    TableName: INVENTORY_TABLE,
    KeyConditionExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':id': inventoryId
    }
  });

  const result = await docClient.send(command);
  const inventoryRefs = result.Items || [];

  // If no items, return empty array
  if (inventoryRefs.length === 0) {
    return [];
  }

  // DynamoDB BatchGet has a limit of 100 items per request
  const batchSize = 100;
  const items: ItemResponse[] = [];

  // Process items in batches
  for (let i = 0; i < inventoryRefs.length; i += batchSize) {
    const batch = inventoryRefs.slice(i, i + batchSize);
    const batchKeys = batch.map(ref => ({
      id: ref.itemId
    }));

    const batchCommand = new BatchGetCommand({
      RequestItems: {
        [TABLE_NAME]: {
          Keys: batchKeys
        }
      }
    });

    const batchResult = await docClient.send(batchCommand);
    if (batchResult.Responses?.[TABLE_NAME]) {
      items.push(...(batchResult.Responses[TABLE_NAME] as ItemResponse[]));
    }
  }

  return items;
}

export async function locationForItemId(itemId: string): Promise<string | null> {
  const locationCommand = new QueryCommand({
    TableName: LOCATION_TABLE,
    KeyConditionExpression: 'itemId = :itemId',
    ExpressionAttributeValues: {
      ':itemId': itemId
    }
  });

  const locationResult = await docClient.send(locationCommand);
  return locationResult.Items?.[0]?.location || null;
}

export async function createItem(id: string, userId: string, itemData: any, inventory?: string) {
  const inventoryName = inventory || 'main';
  const inventoryId = `${userId}:${inventoryName}`;

  const command = new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            id,
            userId,
            ...itemData,
            createdAt: new Date().toISOString()
          }
        }
      },
      {
        Put: {
          TableName: INVENTORY_TABLE,
          Item: {
            id: inventoryId,
            itemId: id,
            createdAt: new Date().toISOString()
          }
        }
      },
      {
        Put: {
          TableName: LOCATION_TABLE,
          Item: {
            itemId: id,
            location: inventoryId,
            createdAt: new Date().toISOString()
          }
        }
      }
    ]
  });

  await docClient.send(command);
  return { id, ...itemData };
}

export async function findJunkItem(): Promise<ItemResponse | null> {
  // Generate random UUID to use as start key
  const randomId = crypto.randomUUID();

  const command = new QueryCommand({
    TableName: INVENTORY_TABLE,
    KeyConditionExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':id': 'discarded'
    },
    ExclusiveStartKey: {
      id: 'discarded',
      itemId: randomId
    },
    Limit: 1
  });

  const result = await docClient.send(command);
  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  // Get the actual item data
  const itemCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      id: result.Items[0].itemId
    }
  });

  const itemResult = await docClient.send(itemCommand);
  return itemResult.Item as ItemResponse;
}

export async function moveItemLocation(itemId: string, oldLocation: string, newLocation: string) {
  const command = new TransactWriteCommand({
    TransactItems: [
      {
        Delete: {
          TableName: INVENTORY_TABLE,
          Key: {
            id: oldLocation,
            itemId: itemId
          }
        }
      },
      {
        Put: {
          TableName: INVENTORY_TABLE,
          Item: {
            id: newLocation,
            itemId: itemId,
            createdAt: new Date().toISOString()
          }
        }
      },
      {
        Delete: {
          TableName: LOCATION_TABLE,
          Key: {
            itemId: itemId,
            location: oldLocation
          }
        }
      },
      {
        Put: {
          TableName: LOCATION_TABLE,
          Item: {
            itemId: itemId,
            location: newLocation,
            createdAt: new Date().toISOString()
          }
        }
      }
    ]
  });

  await docClient.send(command);
  return true;
}

export async function getItemById(itemId: string): Promise<ItemResponse | null> {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      id: itemId
    }
  });

  const result = await docClient.send(command);
  return result.Item as ItemResponse || null;
}

export async function updateItem(itemId: string, itemData: any): Promise<ItemResponse> {
  // First get the existing item to preserve certain fields
  const existingItem = await getItemById(itemId);
  
  if (!existingItem) {
    throw new Error(`Item with id ${itemId} not found`);
  }
  
  // Preserve these fields from the original item
  const { id, userId, createdAt } = existingItem;
  
  // Create update expression and attribute values
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};
  
  // Process each property in the itemData
  Object.entries(itemData).forEach(([key, value]) => {
    // Skip id, userId, and createdAt as we want to preserve these
    if (key === 'id' || key === 'userId' || key === 'createdAt') {
      return;
    }
    
    const attributeName = `#${key}`;
    const attributeValue = `:${key}`;
    
    updateExpressions.push(`${attributeName} = ${attributeValue}`);
    expressionAttributeNames[attributeName] = key;
    expressionAttributeValues[attributeValue] = value;
  });
  
  // If there's nothing to update, return the existing item
  if (updateExpressions.length === 0) {
    return existingItem;
  }
  
  const updateExpression = `SET ${updateExpressions.join(', ')}`;
  
  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { id: itemId },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  });
  
  const result = await docClient.send(command);
  
  // Return the updated item
  return result.Attributes as ItemResponse;
}