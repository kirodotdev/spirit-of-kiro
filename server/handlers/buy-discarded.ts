import { moveItemLocation, locationForItemId, getItemById } from '../state/item-store';
import { ConnectionState } from '../types';
import { appraiseItem } from '../llm/prompts';
import { getPersonaDetails, incrementPersonaDetail } from '../state/user-store';

interface BuyDiscardedMessage {
  type: 'buy-discarded';
  body: {
    itemId: string;
  };
}

interface BuyDiscardedResponse {
  type: string;
  body?: any;
}

export default async function handleBuyDiscarded(state: ConnectionState, data: BuyDiscardedMessage): Promise<BuyDiscardedResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  try {
    // Verify the item exists and is in the discarded location
    const currentLocation = await locationForItemId(data.body.itemId);
    if (!currentLocation || currentLocation !== 'discarded') {
      return {
        type: 'error',
        body: 'Item not found in discarded items'
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

    // Get the item's value directly from the item
    const purchasePrice = item.value || 0;

    // Check if player has enough gold
    const personaDetails = await getPersonaDetails(state.userId);
    const currentGold = parseInt(personaDetails.gold || '0', 10);
    if (currentGold < purchasePrice) {
      return {
        type: 'error',
        body: 'Not enough gold to purchase this item'
      };
    }

    // Deduct the gold (using incrementPersonaDetail with negative amount)
    const newGold = await incrementPersonaDetail(state.userId, 'gold', -purchasePrice);

    // Move the item to the player's inventory
    await moveItemLocation(data.body.itemId, 'discarded', `${state.userId}:main`);
    
    return {
      type: 'buy-results',
      body: { 
        itemId: data.body.itemId,
        item: item,
        gold: newGold,
        purchasePrice
      }
    };
  } catch (error) {
    console.error('Error buying discarded item:', error);
    return {
      type: 'error',
      body: 'Failed to buy item'
    };
  }
} 