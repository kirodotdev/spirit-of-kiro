import { ConnectionState } from '../types';
import { moveItemLocation, locationForItemId, listInventoryItems } from '../state/item-store';
import { invoke } from '../llm/model';
import { generatePersonaDescription } from '../llm/prompts';
import { savePersonaDetail } from '../state/user-store';

interface EquipItemMessage {
  type: 'equip-item';
  body: {
    itemId: string;
    slot: string;
  };
}

interface EquipItemResponse {
  type: string;
  body?: any;
}

interface EquipmentSlot {
  slot: string;
  effects: string;
}

interface EquippedItem {
  name: string;
  description: string;
  equipmentSlots: EquipmentSlot[];
}

const VALID_SLOTS = ['head', 'hands', 'body', 'legs', 'feet', 'toolbelt1', 'toolbelt2', 'toolbelt3'];

async function recalculateDescription(userId: string) {
  // Get all equipment slots
  const slots = ['head', 'hands', 'body', 'legs', 'feet', 'toolbelt1', 'toolbelt2', 'toolbelt3'];
  const equippedItems: EquippedItem[] = [];

  // Get items from each slot
  for (const slot of slots) {
    const items = await listInventoryItems(`${userId}:${slot}`);
    if (items && items.length > 0) {
      equippedItems.push(...items.map(item => ({
        name: item.name,
        description: item.description,
        equipmentSlots: item.equipmentSlots || []
      })));
    }
  }

  // Generate description if there are equipped items
  if (equippedItems.length > 0) {
    const description = await generatePersonaDescription(equippedItems);

    if (description) {
      await savePersonaDetail(userId, 'persona-description', description);
    }
  }
}

export default async function handleEquipItem(state: ConnectionState, data: EquipItemMessage): Promise<EquipItemResponse> {
  if (!state.userId) {
    return {
      type: 'error',
      body: 'Authentication required'
    };
  }

  try {
    const { itemId, slot } = data.body;
    
    if (!VALID_SLOTS.includes(slot)) {
      return {
        type: 'error',
        body: 'Invalid equipment slot'
      };
    }

    const currentLocation = await locationForItemId(itemId);
    
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

    const slotInventoryId = `${state.userId}:${slot}`;
    
    // Check if there's already an item in the slot
    const existingItems = await listInventoryItems(slotInventoryId);
    if (existingItems && existingItems.length > 0) {
      // Move existing item back to main inventory
      await moveItemLocation(existingItems[0].id, slotInventoryId, `${state.userId}:main`);
    }

    // Move new item to slot
    await moveItemLocation(itemId, currentLocation, slotInventoryId);
    
    // Recalculate persona description
    await recalculateDescription(state.userId);
    
    return {
      type: 'item-equipped',
      body: { itemId, slot }
    };
  } catch (error) {
    console.error('Error equipping item:', error);
    return {
      type: 'error',
      body: error.message
    };
  }
}