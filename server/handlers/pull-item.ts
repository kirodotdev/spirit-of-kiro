import { ConnectionState, PullItemMessage } from '../types';
import { generateItems } from '../llm/prompts';
import { createItem, moveItemLocation, findJunkItem } from '../state/item-store';
import { getImage } from '../llm/item-image';

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
    // Try to find a junk item up to 3 times
    for (let i = 0; i < 3; i++) {
      const junkItem = await findJunkItem();
      if (junkItem) {
        // Move item from junk to user's inventory
        await moveItemLocation(junkItem.id, 'discarded', `${state.userId}:main`);
        return {
          type: 'pulled-item',
          body: {
            story: 'You found a discarded item and restored it to working condition.',
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

    // Store in DynamoDB and get full item back
    const savedItem = await createItem(id, state.userId, itemData);

    console.log('Created item', savedItem.id);

    // Generate and upload an image for the item
    try {
      const imageUrl = await getImage(savedItem);
      // Update the item with the image URL
      savedItem.imageUrl = imageUrl;
    } catch (error) {
      console.error('Error generating image for item:', error);
      // Continue without image if generation fails
    }

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