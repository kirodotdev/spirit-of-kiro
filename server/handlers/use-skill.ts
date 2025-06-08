import { ConnectionState } from '../types';
import { getItemById, locationForItemId, createItem, moveItemLocation, updateItem } from '../state/item-store';
import { useSkillStream } from '../llm/prompts';
import { ITEM_IMAGES_SERVICE_CONFIG } from '../config';
import { ServerWebSocket } from 'bun';
import { formatMessage } from '../utils/message';

interface UseSkillMessage {
  type: 'use-skill';
  body: {
    toolId: string;
    toolSkillIndex: number;
    targetIds: string[];
  };
}

interface UseSkillResponse {
  type: string;
  body?: any;
}

export default async function handleUseSkill(state: ConnectionState, data: UseSkillMessage, ws: ServerWebSocket): Promise<UseSkillResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  const { toolId, toolSkillIndex, targetIds } = data.body;

  if (!toolId) {
    return {
      type: 'error',
      body: '`toolId` required'
    };
  }

  if (toolSkillIndex === undefined || toolSkillIndex < 0) {
    return {
      type: 'error',
      body: '`toolSkillIndex` required and must be a non-negative number'
    };
  }

  if (!targetIds || !Array.isArray(targetIds)) {
    return {
      type: 'error',
      body: '`targetIds` required and must be an array, though it may be empty'
    };
  }

  try {
    // Check that the tool item exists and belongs to the user
    const toolLocation = await locationForItemId(toolId);
    if (!toolLocation) {
      return {
        type: 'error',
        body: `Tool item ${toolId} not found`
      };
    }

    const [toolUserId] = toolLocation.split(':');
    if (toolUserId !== state.userId) {
      return {
        type: 'error',
        body: `Can't use a tool that you don't own`
      };
    }

    // Get the tool item
    const toolItem = await getItemById(toolId);
    if (!toolItem) {
      return {
        type: 'error',
        body: `Tool item ${toolId} not found in database`
      };
    }

    // Check if the tool has the requested skill
    if (!toolItem.skills || !toolItem.skills[toolSkillIndex]) {
      return {
        type: 'error',
        body: `Tool item does not have a skill at index ${toolSkillIndex}`
      };
    }

    // Get all target items and verify ownership
    const targetItems = [];
    for (const targetId of targetIds) {
      const targetLocation = await locationForItemId(targetId);
      if (!targetLocation) {
        return {
          type: 'error',
          body: `Target item ${targetId} not found`
        };
      }

      const [targetUserId] = targetLocation.split(':');
      if (targetUserId !== state.userId) {
        return {
          type: 'error',
          body: `Can't use a skill on an item that you don't own`
        };
      }

      const targetItem = await getItemById(targetId);
      if (!targetItem) {
        return {
          type: 'error',
          body: `Target item ${targetId} not found in database`
        };
      }

      targetItems.push(targetItem);
    }

    // Track processed items and removed items
    const processedItems = [];
    const removedItemIds = [];
    let story = '';
    let pendingImageCount = 0;

    // Use the skill with streaming response
    useSkillStream(toolItem, toolSkillIndex, targetItems, {
      // Handle story chunks as they arrive
      onStory: async (storyChunk) => {
        story = storyChunk;
        // Send the story immediately to the client
        ws.send(formatMessage('skill-use-story', { story: storyChunk }));
      },
      
      // Handle output items as they arrive
      onOutputItem: async (item) => {
        // Helper function to handle image regeneration
        const regenerateImage = async (item: any, existingItem: any) => {
          if (item.icon && existingItem?.icon !== item.icon) {
            try {
              pendingImageCount++;
              const imageServiceUrl = `${ITEM_IMAGES_SERVICE_CONFIG.url}/image`;
              const description = item.icon;
              const response = await fetch(`${imageServiceUrl}?description=${encodeURIComponent(description)}`);

              if (response.ok) {
                const imageData = await response.json();
                item.imageUrl = imageData.imageUrl;
              }
            } catch (error) {
              console.error('Error fetching image from item-images service:', error);
            } finally {
              pendingImageCount--;
            }
          }

          if (!item.imageUrl && existingItem?.imageUrl) {
            item.imageUrl = existingItem.imageUrl;
          }
        };

        if (item.id === 'new-item') {
          // Create a new item
          const id = crypto.randomUUID();
          item.id = id;

          // Try to fetch an image for the new item if it has an icon
          if (item.icon) {
            try {
              pendingImageCount++;
              const imageServiceUrl = `${ITEM_IMAGES_SERVICE_CONFIG.url}/image`;
              const description = item.icon;
              const response = await fetch(`${imageServiceUrl}?description=${encodeURIComponent(description)}`);

              if (response.ok) {
                const imageData = await response.json();
                item.imageUrl = imageData.imageUrl;
              }
            } catch (error) {
              console.error('Error fetching image from item-images service:', error);
            } finally {
              pendingImageCount--;
            }
          }

          const savedItem = await createItem(id, state.userId, item, `workbench-results`);
          processedItems.push(savedItem);
          
          // Send new item to client
          ws.send(formatMessage('skill-use-new-item', { item: savedItem }));
        } else if (item.id === toolId) {
          // Handle tool update
          const existingItem = await getItemById(item.id);
          await regenerateImage(item, existingItem);
          
          const updatedTool = await updateItem(item.id, item);
          processedItems.push(updatedTool);
          
          // Send tool update to client
          ws.send(formatMessage('skill-use-tool-update', { tool: updatedTool }));
        } else {
          // Handle target item update
          const existingItem = await getItemById(item.id);
          await regenerateImage(item, existingItem);
          
          const updatedItem = await updateItem(item.id, item);
          
          // Move it to the workbench-results inventory
          const itemLocation = await locationForItemId(item.id);
          if (itemLocation && itemLocation !== `${state.userId}:workbench-results`) {
            await moveItemLocation(item.id, itemLocation, `${state.userId}:workbench-results`);
          }

          processedItems.push(updatedItem);
          
          // Send updated item to client
          ws.send(formatMessage('skill-use-updated-item', { item: updatedItem }));
        }
      },
      
      // Handle removed items as they arrive
      onRemovedItemId: async (itemId) => {
        removedItemIds.push(itemId);
        
        // Set the lastOwner field to the current user's ID
        await updateItem(itemId, { lastOwner: state.userId });
        
        // Move the item to the discarded location
        const itemLocation = await locationForItemId(itemId);
        if (itemLocation) {
          await moveItemLocation(itemId, itemLocation, 'discarded');
        }
        
        // Send removed item ID to client
        ws.send(formatMessage('skill-use-removed-item', { itemId }));
      },
      
      // Handle completion of the entire process
      onComplete: async (result) => {
        // Check if any images are still being generated
        const checkPendingImages = async () => {
          if (pendingImageCount > 0) {
            setTimeout(checkPendingImages, 200);
            return;
          }
          
          // All images are ready, send completion event
          ws.send(formatMessage('skill-use-done', { results: 'All done!'}));
        };
        
        // Start checking for pending images
        setTimeout(checkPendingImages, 200);
      }
    });

    return {
      type: 'skill-use-started',
      body: {
        message: 'Skill results will be streamed via WebSocket'
      }
    }
  } catch (error) {
    console.error('Error using skill:', error);
    return {
      type: 'error',
      body: error.message || 'Failed to use skill'
    };
  }
}