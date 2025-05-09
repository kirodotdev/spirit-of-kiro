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
    return {
      type: 'inventory-items',
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
