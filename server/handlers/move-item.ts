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

const VALID_INVENTORIES = ['main', 'chest1'];

export default async function handleMoveItem(state: ConnectionState, data: MoveItemMessage): Promise<MoveItemResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  const { itemId, targetInventoryId } = data.body;

  if (!itemId) {
    return {
      type: 'error',
      body: '`itemId` required'
    };
  }

  if (!targetInventoryId) {
    return {
      type: 'error',
      body: '`targetInventoryId` required'
    };
  }

  const [targetInventoryUser, targetInventoryName] = targetInventoryId.split(':');
  
  // Validate that targetInventory is a valid inventory name
  if (!VALID_INVENTORIES.includes(targetInventoryName)) {
    return {
      type: 'error',
      body: `Invalid target inventory \`${targetInventoryName}\`, only valid options are ${VALID_INVENTORIES}`
    };
  }

  try {
    // Check that the item exists
    const currentLocation = await locationForItemId(itemId);
    
    if (!currentLocation) {
      return {
        type: 'error',
        body: `Item ${itemId} not found`
      };
    }

    // Parse the current location to get the source inventory
    const [sourceUserId, sourceInventory] = currentLocation.split(':');
    
    // Check that the item belongs to the current user
    if (sourceUserId !== state.userId) {
      return {
        type: 'error',
        body: `Can't move item that you don't own. Item is in inventory ${currentLocation}`
      };
    }
    
    // Check that the source inventory is valid
    if (!VALID_INVENTORIES.includes(sourceInventory)) {
      return {
        type: 'error',
        body: `Source item is not in a valid inventory for moving. Item is in inventory ${currentLocation}`
      };
    }
    
    // Check that source and target are not the same
    if (sourceInventory === targetInventory) {
      return {
        type: 'error',
        body: 'Item is already in the given inventory'
      };
    }

    // Move the item from the source inventory to the target inventory
    const targetInventoryId = `${state.userId}:${targetInventoryName}`;
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