import { ConnectionState, PullItemMessage } from '../types';
import { generateItems } from '../llm/prompts';
import { createItem, moveItemLocation, findJunkItem } from '../state/item-store';
import { ITEM_IMAGES_SERVICE_CONFIG } from '../config';

interface PullItemResponse {
  type: string;
  body?: any;
}

export default async function handlePullItem(state: ConnectionState, _data: PullItemMessage): Promise<PullItemResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  try {
    // Try to find a junk item up to 5 times (increased to account for potential skips)
    for (let i = 0; i < 5; i++) {
      const junkItem = await findJunkItem();
      if (junkItem) {
        // Check if this item was previously owned by the current user
        // The more users a server has, and the more discarded items from different
        // users, the less likely this will get
        if (junkItem.lastOwner === state.userId) {
          console.log(`Skipping item ${junkItem.id} as it was previously owned by user ${state.userId}`);
          continue; // Skip this item and try to find another one
        }
        
        // Move item from junk to user's inventory
        await moveItemLocation(junkItem.id, 'discarded', `${state.userId}:main`);
        return {
          type: 'pulled-item',
          body: {
            story: `Whoosh! The ${junkItem.name} flies out in a gentle arc.`,
            item: junkItem
          }
        };
      }
    }

    // If no junk item found, generate new one
    const resultData = await generateItems(1);
    if (!resultData) {
      throw new Error('No result from LLM');
    }

    // Get the first item from the items array
    const itemData = resultData.items[0];

    // Generate a GUID for the item
    const id = crypto.randomUUID();

    // Fetch image from the item-images service
    try {
      const imageServiceUrl = `${ITEM_IMAGES_SERVICE_CONFIG.url}/image`;
      const description = itemData.icon; // Use the item's icon as the description
      const response = await fetch(`${imageServiceUrl}?description=${encodeURIComponent(description)}`);

      if (!response.ok) {
        throw new Error(`Image service returned status ${response.status}`);
      }

      const imageData = await response.json();

      // Update the item with the image URL from the service
      itemData.imageUrl = imageData.imageUrl;
    } catch (error) {
      console.error('Error fetching image from item-images service:', error);
      // Continue without image if fetching fails
    }

    // Store in DynamoDB and get full item back
    const savedItem = await createItem(id, state.userId, itemData);

    // Return the full result with story and single item
    return {
      type: 'pulled-item',
      body: {
        story: resultData.story,
        item: savedItem
      }
    };
  } catch (error) {
    console.error('Error generating item:', error);
    return {
      type: 'error',
      body: 'Failed to generate item'
    };
  }
}