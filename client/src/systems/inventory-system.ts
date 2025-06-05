import { type Ref, computed } from 'vue'
import type { Item } from './item-system'
import type { SocketSystem } from './socket-system'

export class InventorySystem {
  private inventories: Ref<Map<string, string[]>>
  private inventoryForItem: Map<string, string>
  private socketSystem: SocketSystem
  private eventListenerIds: string[] = []
  private userId: Ref<string | null>

  constructor(
    inventories: Ref<Map<string, string[]>>,
    socketSystem: SocketSystem,
    userId: Ref<string | null>
  ) {
    this.inventories = inventories;
    this.inventoryForItem = new Map<string, string>();
    this.socketSystem = socketSystem
    this.userId = userId

    // Subscribe to inventory events
    this.eventListenerIds.push(this.socketSystem.addEventListener('inventory-items:*', this.handleInventoryItems.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('item-moved', this.handleItemMoved.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('skill-use*', this.handleSkillResults.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('clean-workbench-results', this.handleCleanWorkbenchResults.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('discarded-results', this.handleDiscardedResults.bind(this)))
  }

  /**
   * Get a reactive reference to item IDs in a specific inventory
   * @param inventoryName The name of the inventory to access
   * @returns A computed property that always returns the current value of the inventory
   */
  useInventory(inventoryName: string) {
    if (!this.inventories.value.has(inventoryName)) {
      this.inventories.value.set(inventoryName, []);
    }

    // Now request this inventory from the server
    this.socketSystem.listInventory(`${this.userId.value}:${inventoryName}`);

    // Return a computed property that always returns the current value of the inventory
    // or an empty array if the inventory doesn't exist
    return computed(() => this.inventories.value.get(inventoryName) || []);
  }

  /**
   * Move an item to a specific inventory
   * @param itemId The ID of the item to move
   * @param inventoryName The name of the target inventory
   */
  moveItemToInventory(itemId: string, inventoryName: string) {
    if (!this.userId.value) {
      console.error('Cannot move item: user ID is not set')
      return
    }

    const targetInventoryId = `${this.userId.value}:${inventoryName}`
    this.socketSystem.moveItem(itemId, targetInventoryId)
  }

  /**
   * Get all item IDs in a specific inventory
   * @param inventoryName The name of the inventory to get item IDs from
   * @returns An array of item IDs in the specified inventory
   */
  getInventoryItems(inventoryName: string): string[] {
    const inventory = this.inventories.value.get(inventoryName)
    if (!inventory) {
      return []
    }
    return [...inventory]
  }

  /**
   * Get the inventory name for a given item ID
   * @param itemId The ID of the item to look up
   * @returns The inventory name where the item is located, or null if not found
   */
  getItemInventory(itemId: string): string | null {
    return this.inventoryForItem.get(itemId) || null;
  }

  /**
   * Request updated inventory data from the server
   * @param inventoryName The name of the inventory to refresh
   */
  refreshInventory(inventoryName: string) {
    if (!this.userId.value) {
      console.error('Cannot refresh inventory: user ID is not set')
      return
    }

    const inventoryId = `${this.userId.value}:${inventoryName}`
    this.socketSystem.listInventory(inventoryId)
  }

  /**
   * Helper method to assign an item ID to an inventory
   * @param itemId The ID of the item to assign
   * @param inventoryName The name of the target inventory
   */
  private assignIdToInventory(itemId: string, inventoryName: string) {
    console.log('assignIdToInventory', itemId, inventoryName)
    // Get or create the target inventory
    let targetInventory = this.inventories.value.get(inventoryName)
    if (!targetInventory) {
      targetInventory = []
      this.inventories.value.set(inventoryName, targetInventory)
    }

    // Add the item ID to the target inventory if not already present
    if (!targetInventory.includes(itemId)) {
      targetInventory.push(itemId)
    }

    // Update the inventoryForItem map
    this.inventoryForItem.set(itemId, inventoryName)
  }

  /**
   * Helper method to remove an item ID from its current inventory
   * @param itemId The ID of the item to remove
   * @returns The name of the inventory the item was removed from, or null if not found
   */
  private removeId(itemId: string): string | null {
    const inventoryName = this.inventoryForItem.get(itemId)
    if (inventoryName) {
      const inventory = this.inventories.value.get(inventoryName)
      if (inventory) {
        const itemIndex = inventory.indexOf(itemId)
        if (itemIndex !== -1) {
          inventory.splice(itemIndex, 1)
          this.inventoryForItem.delete(itemId)
          return inventoryName
        }
      }
    }
    return null
  }

  /**
   * Handle inventory items received from socket events
   * @param data The inventory items data from the socket
   * @param eventType The event type string
   */
  private handleInventoryItems(data: any, eventType?: string) {
    // Extract inventory name from event type (format: "inventory-items:inventoryName")
    const inventoryName = eventType ? eventType.split(':')[1] : data.type?.split(':')[1]

    if (!inventoryName) {
      console.error('Invalid inventory event type:', eventType || data.type)
      return
    }

    // Sort items by createdAt date if available, otherwise keep original order
    const sortedItems = [...data].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return 0
    })

    // Extract only the item IDs in sorted order
    const itemIds = sortedItems.map(item => item.id)

    // Set the new inventory in the inventories Map
    this.inventories.value.set(inventoryName, itemIds)

    // Update the inventoryForItem map
    itemIds.forEach(itemId => {
      this.inventoryForItem.set(itemId, inventoryName)
    })
  }

  /**
   * Handle item moved events
   * @param data The item moved event data
   */
  private handleItemMoved(data: { itemId: string, targetInventoryId: string, item: Item }) {
    // Extract target inventory name from ID (format: "userId:inventoryName")
    const targetInventoryName = data.targetInventoryId.split(':')[1]

    if (!targetInventoryName) {
      console.error('Invalid target inventory ID in item-moved event:', data)
      return
    }

    // Remove item from source inventory
    this.removeId(data.itemId)

    // Add item to target inventory
    this.assignIdToInventory(data.itemId, targetInventoryName)
  }

  /**
   * Handle skill results events
   * @param data The skill results data containing removedItemIds and outputItems
   */
  private handleSkillResults(data: any) {
    // Process removed items if they exist
    if (data.itemId) {
      this.removeId(data.itemId)
    }

    // Process output items if they exist
    if (data.item) {
      const itemId = data.item.id
      this.assignIdToInventory(itemId, 'workbench-results')
    }
  }

  /**
   * Handle clean workbench results event
   * Moves items from workbench-results to workbench-working (max 5 items)
   * and any extra items to workbench-main or drops them if no space
   */
  private handleCleanWorkbenchResults() {
    // Get the workbench-results inventory
    const resultsInventory = [...(this.inventories.value.get('workbench-results') || [])]
    if (resultsInventory.length === 0) {
      return // Nothing to clean up
    }
    
    // Get or create the workbench-working inventory
    const workingInventory = [...(this.inventories.value.get('workbench-working') || [])]
    let remainingWorkingSpace = 5 - workingInventory.length
    
    // Process each item in the results inventory
    while (resultsInventory.length > 0) {
      const itemId = resultsInventory.shift()!
      
      // First try to move to workbench-working if it has less than 5 items
      if (remainingWorkingSpace > 0) {
        this.moveItemToInventory(itemId, 'workbench-working')
        remainingWorkingSpace--
      }
      // Otherwise move to main inventory and drop on the floor
      else {
        this.moveItemToInventory(itemId, 'main')
        this.socketSystem.emitEvent('workbench-overflow-item', { itemId })
      }
    }
  }

  /**
   * Handle discarded results events
   * @param data The discarded results data containing items
   */
  private handleDiscardedResults(data: any) {
    if (!data || !Array.isArray(data)) {
      return
    }
    
    // Extract item IDs from the discarded items
    const itemIds = data.map((item: any) => item.id)
    
    // Replace the computer inventory entirely with the new items
    this.inventories.value.set('computer', itemIds)
    
    // Update the inventoryForItem map
    itemIds.forEach((itemId: string) => {
      this.inventoryForItem.set(itemId, 'computer')
    })
  }

  /**
   * Clean up resources when the component is unmounted
   */
  cleanup() {
    // Remove event listeners
    this.eventListenerIds.forEach(id => {
      // Extract event type from the ID (assuming format: 'eventType:id')
      const eventType = id.includes(':') ? id.split(':')[0] : 'inventory-items:*';
      this.socketSystem.removeEventListener(eventType, id)
    })
    this.eventListenerIds = []

    // Clear inventories
    this.inventories.value = new Map()

    // Clear inventoryForItem map
    this.inventoryForItem.clear()
  }
}