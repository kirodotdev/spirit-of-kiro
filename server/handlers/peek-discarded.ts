import { ConnectionState } from '../types';
import { findJunkItem } from '../state/item-store';
import { ItemResponse } from '../state/item-store';

interface PeekDiscardedMessage {
  type: 'peek-discarded';
  body: {
    numberOfItems: number;
  };
}

interface PeekDiscardedResponse {
  type: string;
  body?: any;
}

export default async function handlePeekDiscarded(state: ConnectionState, data: PeekDiscardedMessage): Promise<PeekDiscardedResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  try {
    const { numberOfItems } = data.body;
    const items: ItemResponse[] = [];
    const seenItemIds = new Set<string>();

    // Find the requested number of items
    while (items.length < numberOfItems) {
      const item = await findJunkItem();
      if (item && !seenItemIds.has(item.id)) {
        items.push(item);
        seenItemIds.add(item.id);
      }
    }

    return {
      type: 'discarded-results',
      body: items
    };
  } catch (error) {
    console.error('Error peeking discarded items:', error);
    return {
      type: 'error',
      body: 'Failed to peek discarded items'
    };
  }
} 