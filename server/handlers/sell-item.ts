import { moveItemLocation, locationForItemId, getItemById, updateItem } from '../state/item-store';
import { ConnectionState } from '../types';
import { appraiseItem } from '../llm/prompts';
import { incrementPersonaDetail } from '../state/user-store';

interface SellItemMessage {
  type: 'sell-item';
  body: {
    itemId: string;
  };
}

interface SellItemResponse {
  type: string;
  body?: any;
}

export default async function handleSellItem(state: ConnectionState, data: SellItemMessage): Promise<SellItemResponse> {
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

    // Get the item details
    const item = await getItemById(data.body.itemId);
    if (!item) {
      return {
        type: 'error',
        body: 'Item not found'
      };
    }

    // Set the lastOwner field to the current user's ID
    await updateItem(data.body.itemId, { lastOwner: state.userId });

    // Use the LLM to appraise the item
    const appraisal = await appraiseItem(item);

    // Increment the player's gold with the sale amount
    const newGold = await incrementPersonaDetail(state.userId, 'gold', appraisal.appraisal.saleAmount || 0);

    // Move the item to the discarded location
    await moveItemLocation(data.body.itemId, currentLocation, 'discarded');
    
    return {
      type: 'item-sold',
      body: { 
        itemId: data.body.itemId,
        appraisal,
        gold: newGold
      }
    };
  } catch (error) {
    console.error('Error selling item:', error);
    return {
      type: 'error',
      body: 'Failed to sell item'
    };
  }
}