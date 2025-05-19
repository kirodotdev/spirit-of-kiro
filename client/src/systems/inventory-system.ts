import { type Ref } from 'vue'
import type { Item } from './item-system'
import type { SocketSystem } from './socket-system'

export class InventorySystem {
  private inventories: Ref<Map<string, Map<string, Item>>>
  private socketSystem: SocketSystem
  private eventListenerIds: string[] = []
  private userId: Ref<string | null>

  constructor(
    inventories: Ref<Map<string, Map<string, Item>>>,
    socketSystem: SocketSystem,
    userId: Ref<string | null>
  ) {
    this.inventories = inventories;
    this.socketSystem = socketSystem
    this.userId = userId

    // Subscribe to inventory events
    this.eventListenerIds.push(this.socketSystem.addEventListener('inventory-items:*', this.handleInventoryItems.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('item-moved', this.handleItemMoved.bind(this)))
  }

  /**
   * Get a reactive reference to items in a specific inventory
   * @param inventoryName The name of the inventory to access
   * @returns A computed reference containing the items in the specified inventory
   */
  useInventory(inventoryName: string) {
    if (!this.inventories.value.has(inventoryName)) {
      this.inventories.value.set(inventoryName, new Map());
    }

    // Now request this inventory from the server
    this.socketSystem.listInventory(`${this.userId}:${inventoryName}`);

    return this.inventories.value.get(inventoryName);
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
   * Get all items in a specific inventory
   * @param inventoryName The name of the inventory to get items from
   * @returns An array of items in the specified inventory
   */
  getInventoryItems(inventoryName: string): Item[] {
    const inventory = this.inventories.value.get(inventoryName)
    if (!inventory) {
      return []
    }
    return Array.from(inventory.values())
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
    console.log('handling inventory', data);

    // Extract inventory name from event type (format: "inventory-items:inventoryName")
    const inventoryName = eventType ? eventType.split(':')[1] : data.type?.split(':')[1]

    if (!inventoryName) {
      console.error('Invalid inventory event type:', eventType || data.type)
      return
    }

    // Create a new Map to maintain reactivity
    const newInventories = new Map(this.inventories.value)

    // Create a new inventory Map
    const inventoryMap = new Map<string, Item>()

    // Add new items
    data.forEach(item => {
      inventoryMap.set(item.id, item)
    })

    // Set the new inventory in the inventories Map
    newInventories.set(inventoryName, inventoryMap)

    // Update the ref
    this.inventories.value = newInventories
  }

  /**
   * Handle item moved events
   * @param data The item moved event data
   */
  private handleItemMoved(data: { itemId: string, sourceInventoryId: string, targetInventoryId: string, item: Item }, eventType?: string) {
    if (!data || !data.itemId || !data.sourceInventoryId || !data.targetInventoryId || !data.item) {
      console.error('Invalid item-moved event data:', data)
      return
    }

    // Extract inventory names from IDs (format: "userId:inventoryName")
    const sourceInventoryName = data.sourceInventoryId.split(':')[1]
    const targetInventoryName = data.targetInventoryId.split(':')[1]

    if (!sourceInventoryName || !targetInventoryName) {
      console.error('Invalid inventory IDs in item-moved event:', data)
      return
    }

    // Create a new Map to maintain reactivity
    const newInventories = new Map(this.inventories.value)

    // Remove item from source inventory
    if (newInventories.has(sourceInventoryName)) {
      const sourceInventory = new Map(newInventories.get(sourceInventoryName))
      sourceInventory.delete(data.itemId)
      newInventories.set(sourceInventoryName, sourceInventory)
    }

    // Add item to target inventory
    let targetInventory: Map<string, Item>
    if (!newInventories.has(targetInventoryName)) {
      targetInventory = new Map()
      newInventories.set(targetInventoryName, targetInventory)
    } else {
      targetInventory = new Map(newInventories.get(targetInventoryName))
      newInventories.set(targetInventoryName, targetInventory)
    }

    // Add the item to the target inventory
    targetInventory.set(data.itemId, data.item)

    // Update the ref
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
  }
}