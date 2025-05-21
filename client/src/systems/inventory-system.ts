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
    this.eventListenerIds.push(this.socketSystem.addEventListener('skill-results', this.handleSkillResults.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('clean-workbench-results', this.handleCleanWorkbenchResults.bind(this)))
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

    // Create a new Map to maintain reactivity
    const newInventories = new Map(this.inventories.value)

    // Sort items by createdAt date if available, otherwise keep original order
    const sortedItems = [...data].sort((a, b) => {
      // Since createdAt is not in the Item interface, we need to check if it exists
      // TypeScript will allow this with the 'any' type from the data parameter
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return 0
    })

    // Extract only the item IDs in sorted order
    const itemIds = sortedItems.map(item => item.id)

    // Set the new inventory in the inventories Map
    newInventories.set(inventoryName, itemIds)

    // Update the inventoryForItem map
    itemIds.forEach(itemId => {
      this.inventoryForItem.set(itemId, inventoryName);
    });

    // Update the ref
    this.inventories.value = newInventories
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

    // Look up the source inventory from the inventoryForItem map
    const sourceInventoryName = this.inventoryForItem.get(data.itemId)

    // Create a new Map to maintain reactivity
    const newInventories = new Map(this.inventories.value)

    // Remove item from source inventory if we know where it was
    if (sourceInventoryName && newInventories.has(sourceInventoryName)) {
      const sourceInventory = [...newInventories.get(sourceInventoryName) || []]
      const itemIndex = sourceInventory.indexOf(data.itemId)
      if (itemIndex !== -1) {
        sourceInventory.splice(itemIndex, 1)
        newInventories.set(sourceInventoryName, sourceInventory)

        // Remove from inventoryForItem map
        this.inventoryForItem.delete(data.itemId)
      }
    }

    // Add item to target inventory
    let targetInventory: string[]
    if (!newInventories.has(targetInventoryName)) {
      targetInventory = []
      newInventories.set(targetInventoryName, targetInventory)
    } else {
      targetInventory = [...newInventories.get(targetInventoryName) || []]
    }

    // Add the item ID to the target inventory
    // Since we can't properly sort by createdAt without accessing the item store,
    // we'll just add the item ID to the end of the array for now
    targetInventory.push(data.itemId)

    newInventories.set(targetInventoryName, targetInventory)

    // Update the inventoryForItem map
    this.inventoryForItem.set(data.itemId, targetInventoryName)

    // Update the ref
    this.inventories.value = newInventories
  }

  /**
   * Handle skill results events
   * @param data The skill results data containing removedItemIds and outputItems
   */
  private handleSkillResults(data: any) {
    // Create a new Map to maintain reactivity
    const newInventories = new Map(this.inventories.value)

    // Process removed items if they exist
    if (data.removedItemIds && Array.isArray(data.removedItemIds)) {
      // For each removed item ID
      data.removedItemIds.forEach((itemId: string) => {
        // Find which inventory contains the item using the inventoryForItem map
        const inventoryName = this.inventoryForItem.get(itemId)

        if (inventoryName && newInventories.has(inventoryName)) {
          // Get the inventory array
          const inventory = [...newInventories.get(inventoryName) || []]

          // Find the item in the inventory
          const itemIndex = inventory.indexOf(itemId)

          if (itemIndex !== -1) {
            // Remove the item from that inventory
            inventory.splice(itemIndex, 1)

            // Update the inventory in the map
            newInventories.set(inventoryName, inventory)
          }

          // Remove the item from the inventoryForItem map
          this.inventoryForItem.delete(itemId)
        }
      })
    }

    // Process output items if they exist
    if (data.outputItems && Array.isArray(data.outputItems)) {
      // Get or create the workbench-results inventory
      const workbenchResults = [...(newInventories.get('workbench-results') || [])]

      // Add each output item ID to the workbench-results inventory
      data.outputItems.forEach((item: any) => {
        const itemId = item.id
        if (itemId && !workbenchResults.includes(itemId)) {
          workbenchResults.push(itemId)

          // Update the inventoryForItem map
          this.inventoryForItem.set(itemId, 'workbench-results')
        }
      })

      // Update the workbench-results inventory in the map
      newInventories.set('workbench-results', workbenchResults)
    }

    // Update the ref to maintain reactivity
    this.inventories.value = newInventories
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