import { type Ref, computed, ref } from 'vue'
import type { Item } from './item-system'
import type { SocketSystem } from './socket-system'

export class InventorySystem {
  private inventories: Map<string, Ref<string[]>>
  private inventoryForItem: Map<string, string>
  private socketSystem: SocketSystem
  private eventListenerIds: string[] = []
  private userId: Ref<string | null>

  constructor(
    socketSystem: SocketSystem,
    userId: Ref<string | null>
  ) {
    this.inventories = new Map<string, Ref<string[]>>();
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
   * @returns A ref to the array of item IDs in the inventory
   */
  useInventory(inventoryName: string) {
    if (!this.inventories.has(inventoryName)) {
      this.inventories.set(inventoryName, ref<string[]>([]));
    }

    // Now request this inventory from the server
    this.socketSystem.listInventory(`${this.userId.value}:${inventoryName}`);

    // Return the ref directly
    return this.inventories.get(inventoryName)!;
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
   * Helper method to get or create an inventory ref
   * @param inventoryName The name of the inventory
   * @returns The inventory ref
   */
  private getOrCreateInventoryRef(inventoryName: string): Ref<string[]> {
    let inventoryRef = this.inventories.get(inventoryName)
    if (!inventoryRef) {
      inventoryRef = ref<string[]>([])
      this.inventories.set(inventoryName, inventoryRef)
    }
    return inventoryRef
  }

  /**
   * Helper method to remove an item from an inventory
   * @param itemId The ID of the item to remove
   * @param inventoryName The name of the inventory to remove from
   * @returns true if the item was removed, false otherwise
   */
  private removeItemFromInventory(itemId: string, inventoryName: string): boolean {
    const inventoryRef = this.inventories.get(inventoryName)
    if (!inventoryRef) return false

    const inventory = [...inventoryRef.value]
    const itemIndex = inventory.indexOf(itemId)
    if (itemIndex === -1) return false

    inventory.splice(itemIndex, 1)
    inventoryRef.value = inventory
    this.inventoryForItem.delete(itemId)
    return true
  }

  /**
   * Helper method to add an item to an inventory
   * @param itemId The ID of the item to add
   * @param inventoryName The name of the inventory to add to
   */
  private addItemToInventory(itemId: string, inventoryName: string) {
    const inventoryRef = this.getOrCreateInventoryRef(inventoryName)
    const inventory = [...inventoryRef.value]
    
    // Remove from current inventory if it exists
    const currentInventoryName = this.inventoryForItem.get(itemId)
    if (currentInventoryName) {
      this.removeItemFromInventory(itemId, currentInventoryName)
    }

    // Add to new inventory
    inventory.push(itemId)
    inventoryRef.value = inventory
    this.inventoryForItem.set(itemId, inventoryName)
  }

  /**
   * Handle inventory items received from socket events
   * @param data The inventory items data from the socket
   * @param eventType The event type string
   */
  private handleInventoryItems(data: any, eventType?: string) {
    const inventoryName = eventType ? eventType.split(':')[1] : data.type?.split(':')[1]

    if (!inventoryName) {
      console.error('Invalid inventory event type:', eventType || data.type)
      return
    }

    const sortedItems = [...data].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return 0
    })

    const itemIds = sortedItems.map(item => item.id)
    const inventoryRef = this.getOrCreateInventoryRef(inventoryName)
    inventoryRef.value = itemIds

    itemIds.forEach(itemId => {
      this.inventoryForItem.set(itemId, inventoryName)
    })
  }

  /**
   * Handle item moved events
   * @param data The item moved event data
   */
  private handleItemMoved(data: { itemId: string, targetInventoryId: string, item: Item }) {
    const targetInventoryName = data.targetInventoryId.split(':')[1]

    if (!targetInventoryName) {
      console.error('Invalid target inventory ID in item-moved event:', data)
      return
    }

    const sourceInventoryName = this.inventoryForItem.get(data.itemId)
    if (sourceInventoryName) {
      this.removeItemFromInventory(data.itemId, sourceInventoryName)
    }

    this.addItemToInventory(data.itemId, targetInventoryName)
  }

  /**
   * Handle skill results events
   * @param data The skill results data containing removedItemIds and outputItems
   */
  private handleSkillResults(data: any) {
    if (data.itemId) {
      const inventoryName = this.inventoryForItem.get(data.itemId)
      if (inventoryName) {
        this.removeItemFromInventory(data.itemId, inventoryName)
      }
    }

    if (data.item) {
      const itemId = data.item.id
      if (itemId) {
        this.addItemToInventory(itemId, 'workbench-results')
      }
    }
  }

  /**
   * Handle clean workbench results event
   * Moves items from workbench-results to workbench-working (max 5 items)
   * and any extra items to workbench-main or drops them if no space
   */
  private handleCleanWorkbenchResults() {
    const resultsInventoryRef = this.inventories.get('workbench-results')
    if (!resultsInventoryRef || resultsInventoryRef.value.length === 0) {
      return
    }
    
    const resultsInventory = [...resultsInventoryRef.value]
    const workingInventoryRef = this.getOrCreateInventoryRef('workbench-working')
    const workingInventory = [...workingInventoryRef.value]
    let remainingWorkingSpace = 5 - workingInventory.length
    
    while (resultsInventory.length > 0) {
      const itemId = resultsInventory.shift()!
      
      if (remainingWorkingSpace > 0) {
        this.moveItemToInventory(itemId, 'workbench-working')
        remainingWorkingSpace--
      } else {
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
    
    const itemIds = data.map((item: any) => item.id)
    const computerInventoryRef = this.getOrCreateInventoryRef('computer')
    computerInventoryRef.value = itemIds
    
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
    this.inventories.clear()

    // Clear inventoryForItem map
    this.inventoryForItem.clear()
  }
}