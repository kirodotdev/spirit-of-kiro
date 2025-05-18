import { ConnectionState } from '../types';
import { listInventoryItems } from '../state/item-store';

interface ListInventoryMessage {
  type: 'list-inventory';
  body: {
    inventoryId: string;
  };
}

interface ListInventoryResponse {
  type: string;
  body: any;
}

export default async function handleListInventory(state: ConnectionState, data: ListInventoryMessage): Promise<ListInventoryResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  // Check if trying to access someone else's inventory
  if (!data.body.inventoryId.startsWith(state.userId)) {
    return {
      type: 'error',
      body: 'Cannot access inventory'
    };
  }

  try {
    const items = await listInventoryItems(data.body.inventoryId);
    // Extract inventory name from inventoryId (format: userId:inventoryName)
    const inventoryName = data.body.inventoryId.split(':')[1] || 'unknown';
    return {
      type: `inventory-items:${inventoryName}`,
      body: items
    };
  } catch (error) {
    console.error('Error listing inventory items:', error);
    return {
      type: 'error',
      body: 'Failed to list inventory items'
    };
  }
}
