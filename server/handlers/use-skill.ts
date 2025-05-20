import { ConnectionState } from '../types';
import { getItemById, locationForItemId } from '../state/item-store';
import { useSkill } from '../llm/prompts';

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
    
    // Log the result to the console
    console.log('Skill use result:', result);

    // Return the result
    return {};
  } catch (error) {
    console.error('Error using skill:', error);
    return {
      type: 'error',
      body: error.message || 'Failed to use skill'
    };
  }
}