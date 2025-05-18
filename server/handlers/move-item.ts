import { ConnectionState } from '../types';
import { moveItemLocation, locationForItemId } from '../state/item-store';

interface MoveItemMessage {
  type: 'move-item';
  body: {
    itemId: string;
    targetInventory: string;
  };
}

interface MoveItemResponse {
  type: string;
  body?: any;
}

// Currently only supporting chest1 as a valid inventory
const VALID_INVENTORIES = ['chest1'];

export default async function handleMoveItem(state: ConnectionState, data: MoveItemMessage): Promise<MoveItemResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  try {
    const { itemId, targetInventory } = data.body;
    
    // Validate that targetInventory is a valid inventory name
    if (!VALID_INVENTORIES.includes(targetInventory)) {
      return {
        type: 'error',
        body: 'Invalid target inventory'
      };
    }

    // Check that the item exists
    const currentLocation = await locationForItemId(itemId);
    
    if (!currentLocation) {
      return {
        type: 'error',
        body: 'Item not found'
      };
    }

    // Check that the item is in the user's main inventory
    if (currentLocation !== `${state.userId}:main`) {
      return {
        type: 'error',
        body: 'Item not in your main inventory'
      };
    }

    // Move the item from the user's main inventory to the target inventory
    const targetInventoryId = `${state.userId}:${targetInventory}`;
    await moveItemLocation(itemId, currentLocation, targetInventoryId);
    
    return {
      type: 'item-moved',
      body: { itemId, targetInventory }
    };
  } catch (error) {
    console.error('Error moving item:', error);
    return {
      type: 'error',
      body: error.message
    };
  }
}