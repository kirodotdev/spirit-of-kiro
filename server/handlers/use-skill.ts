import { ConnectionState } from '../types';
import { getItemById, locationForItemId, createItem, moveItemLocation, updateItem } from '../state/item-store';
import { useSkill } from '../llm/prompts';
import { ITEM_IMAGES_SERVICE_CONFIG } from '../config';

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

export default async function handleUseSkill(state: ConnectionState, data: UseSkillMessage): Promise<UseSkillResponse> {
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

    // Use the skill
    const result = await useSkill(toolItem, toolSkillIndex, targetItems);

    if (!result) {
      return {
        type: 'error',
        body: 'Failed to use skill: No result from LLM'
      };
    }

    // Process the updated tool item
    const updatedTool = result.tool;
    if (updatedTool && updatedTool.id === toolId) {
      // Update the tool item in the database
      await updateItem(toolId, updatedTool);
    }

    // Process output items
    const processedItems = [];
    if (result.outputItems && Array.isArray(result.outputItems)) {
      for (const item of result.outputItems) {
        if (item.id === 'new-item') {
          // Create a new item
          const id = crypto.randomUUID();
          
          // Try to fetch an image for the new item if it has an icon
          if (item.icon) {
            try {
              const imageServiceUrl = `${ITEM_IMAGES_SERVICE_CONFIG.url}/image`;
              const description = item.icon;
              const response = await fetch(`${imageServiceUrl}?description=${encodeURIComponent(description)}`);

              if (response.ok) {
                const imageData = await response.json();
                item.imageUrl = imageData.imageUrl;
                console.log("Got item image for new item", imageData);
              }
            } catch (error) {
              console.error('Error fetching image from item-images service:', error);
              // Continue without image if fetching fails
            }
          }
          
          const savedItem = await createItem(id, state.userId, item);
          processedItems.push(savedItem);
        } else {
          // Update existing item
          const updatedItem = await updateItem(item.id, item);
          processedItems.push(updatedItem);
        }
      }
    }

    // Process removed items
    if (result.removedItemIds && Array.isArray(result.removedItemIds)) {
      for (const itemId of result.removedItemIds) {
        // Move the item to the discarded location
        const itemLocation = await locationForItemId(itemId);
        if (itemLocation) {
          await moveItemLocation(itemId, itemLocation, 'discarded');
        }
      }
    }

    // Return the results to the client
    return {
      type: 'skill-results',
      body: {
        story: result.story,
        tool: updatedTool,
        outputItems: processedItems,
        removedItemIds: result.removedItemIds || []
      }
    };
  } catch (error) {
    console.error('Error using skill:', error);
    return {
      type: 'error',
      body: error.message || 'Failed to use skill'
    };
  }
}