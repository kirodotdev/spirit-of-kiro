import { moveItemLocation, locationForItemId } from '../state/item-store';
import { ConnectionState } from '../types';

interface DiscardItemMessage {
  type: 'discard-item';
  body: {
    itemId: string;
  };
}

interface DiscardItemResponse {
  type: string;
  body?: any;
}

export default async function handleDiscardItem(state: ConnectionState, data: DiscardItemMessage): Promise<DiscardItemResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  try {
    const currentLocation = await locationForItemId(data.body.itemId);

    if (!currentLocation) {
      return {
        type: 'error',
        body: 'Item not found'
      };
    }

    if (!currentLocation.startsWith(state.userId)) {
      return {
        type: 'error',
        body: 'Item not in your inventory'
      };
    }

    await moveItemLocation(data.body.itemId, currentLocation, 'discarded');
    return {
      type: 'item-discarded',
      body: { itemId: data.body.itemId }
    };
  } catch (error) {
    console.error('Error discarding item:', error);
    return {
      type: 'error',
      body: 'Failed to discard item'
    };
  }
}