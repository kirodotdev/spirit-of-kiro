import { type Ref, computed } from 'vue'
import { useGameStore } from '../stores/game';

export interface Item {
  id: string
  name: string
  description: string
  imageUrl: string
  value?: number
  weight?: string
  damage?: string
  materials?: string[]
  skills?: { name: string, description: string }[]
}

export class ItemSystem {
  private items: Ref<Item[]>
  private socketSystem;
  private eventListenerIds: string[] = [];
  
  public itemsById = computed(() => {
    const map = new Map<string, Item>()
    this.items.value.forEach(item => {
      map.set(item.id, item)
    })
    return map
  })

  constructor(items: Ref<Item[]>, socketSystem: SocketSystem) {
    this.items = items
    this.socketSystem = socketSystem;
    
    // Subscribe to inventory-items:* events
    this.eventListenerIds.push(this.socketSystem.addEventListener('inventory-items:*', this.handleInventoryItems.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('pulled-item', this.handlePulledItem.bind(this)))
  }

  addItem(item: Item) {
    // Check if item with same ID already exists
    const existingItemIndex = this.items.value.findIndex(i => i.id === item.id)
    if (existingItemIndex !== -1) {
      // Replace existing item
      this.items.value[existingItemIndex] = item
    } else {
      // Add new item
      this.items.value.push(item)
    }
  }

  removeItem(itemId: string) {
    const index = this.items.value.findIndex(item => item.id === itemId)
    if (index !== -1) {
      this.items.value.splice(index, 1)
    }
  }

  clearItems() {
    this.items.value = []
  }
  
  /**
   * Handles inventory items received from socket events
   * @param data The inventory items data from the socket
   */
  private handleInventoryItems(data?: any) {    
    // Add each item to the collection
    data.forEach((item: Item) => {
      this.addItem(item)
    })
  }

  /**
   * Adds item when an item is pulled
   */
  private handlePulledItem(data?: any) {    
    this.addItem(data.item)
  }
  
  /**
   * Clean up resources when the component is unmounted
   */
  cleanup() {
    // Remove event listener if it exists
    this.eventListenerIds.forEach((id) => {
      this.socketSystem.removeEventListener(id)
    })
    this.eventListenerIds = [];
  }
}