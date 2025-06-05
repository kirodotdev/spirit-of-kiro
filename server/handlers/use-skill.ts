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
    let updatedTool = null;
    let story = '';
    let pendingImageCount = 0;

    // Use the skill with streaming response
    useSkillStream(toolItem, toolSkillIndex, targetItems, {
      // Handle story chunks as they arrive
      onStory: async (storyChunk) => {
        console.log('STORY', storyChunk);
        story = storyChunk;
        // Send the story immediately to the client
        ws.send(formatMessage('skill-use-story', { story: storyChunk }));
      },
      
      // Handle tool updates as they arrive
      onTool: async (toolUpdate) => {
        console.log('TOOL', toolUpdate);
        if (toolUpdate && toolUpdate.id === toolId) {
          updatedTool = toolUpdate;
          
          // Check if the tool's icon has changed
          if (updatedTool.icon && toolItem.icon !== updatedTool.icon) {
            // Regenerate the image for the tool with the new icon
            try {
              pendingImageCount++;
              const imageServiceUrl = `${ITEM_IMAGES_SERVICE_CONFIG.url}/image`;
              const description = updatedTool.icon;
              const response = await fetch(`${imageServiceUrl}?description=${encodeURIComponent(description)}`);

              if (response.ok) {
                const imageData = await response.json();
                updatedTool.imageUrl = imageData.imageUrl;
                console.log("Regenerated tool image due to icon change", imageData);
              }
            } catch (error) {
              console.error('Error fetching updated image from item-images service:', error);
              // Continue without updating the image if fetching fails
            } finally {
              pendingImageCount--;
            }
          }

          if (!updatedTool.imageUrl) {
            // Fallback to keeping the same tool image
            updatedTool.imageUrl = toolItem.imageUrl;
          }

          // Update the tool item in the database
          await updateItem(toolId, updatedTool);
          
          // Send tool update to client
          ws.send(formatMessage('skill-use-tool-update', { tool: updatedTool }));
        }
      },
      
      // Handle output items as they arrive
      onOutputItem: async (item) => {
        console.log('OUTPUT', item)
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
              // Continue without image if fetching fails
            } finally {
              pendingImageCount--;
            }
          }

          const savedItem = await createItem(id, state.userId, item, `workbench-results`);
          processedItems.push(savedItem);
          
          // Send new item to client
          ws.send(formatMessage('skill-use-new-item', { item: savedItem }));
        } else {
          // Update existing item
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
        console.log('REMOVED', itemId);
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
        console.log("DONE", result);
        
        // Check if any images are still being generated
        const checkPendingImages = async () => {
          if (pendingImageCount > 0) {
            console.log(`${pendingImageCount} images still pending, retrying in 1s`);
            setTimeout(checkPendingImages, 1000);
            return;
          }
          
          // All images are ready, send completion event
          console.log("All images ready, sending completion event");
          ws.send(formatMessage('skill-use-done', { results: 'All done!'}));
        };
        
        // Start checking for pending images
        checkPendingImages();
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