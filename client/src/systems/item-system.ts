import { type Ref, computed } from 'vue'
import { useGameStore } from '../stores/game';
import type { SocketSystem } from './socket-system';

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
    this.eventListenerIds.push(this.socketSystem.addEventListener('skill-use*', this.handleSkillResults.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('discarded-results', this.handleDiscardedResults.bind(this)))
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
  private handleInventoryItems(data?: any, eventType?: string) {    
    // Add each item to the collection
    data.forEach((item: Item) => {
      this.addItem(item)
    })
  }

  /**
   * Adds item when an item is pulled
   */
  private handlePulledItem(data?: any, eventType?: string) {    
    this.addItem(data.item)
  }

  /**
   * Handles skill results from the server
   * @param data The skill results data containing story, tool, outputItems, and removedItemIds
   */
  private handleSkillResults(data?: any, eventType?: string) {
    // Update the tool item if present
    if (data.tool) {
      this.addItem(data.tool)
    }

    if (data.item) {
      this.addItem(data.item)
    }
    
    // Remove all items with IDs in the removedItemIds array
    // TODO: For now we will retain removed items so that they
    // can still be shown in the skill results window as a removed item.
    // In the future we should garbage collect these old items periodically
    // so that they don't add up and consume lots of memory on the client side
    // however retaining them until reload has minimal impact, while avoiding
    // UI bugs for now.
  }

  /**
   * Handles discarded results from the server
   * @param data The discarded results data containing items
   * @param eventType The type of event that triggered this handler
   */
  private handleDiscardedResults(data?: any, eventType?: string) {
    // Add all items to the local item store
    if (data && Array.isArray(data)) {
      data.forEach((item: Item) => {
        this.addItem(item)
      })
    }
  }
  
  /**
   * Clean up resources when the component is unmounted
   */
  cleanup() {
    // Remove event listeners
    this.eventListenerIds.forEach((id) => {
      this.socketSystem.removeEventListener('discarded-results', id)
    })
    this.eventListenerIds = [];
  }
}