import { type Ref, computed, ref } from 'vue'
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
  skills?: { 
    name: string
    description: string
    targets?: number // 0 for self, 1 for single target, 2 for two targets
  }[]
}

export class ItemSystem {
  private items: Map<string, Ref<Item>>
  private socketSystem;
  private eventListenerIds: string[] = [];

  constructor(socketSystem: SocketSystem) {
    this.items = new Map()
    this.socketSystem = socketSystem;
    
    // Subscribe to inventory-items:* events
    this.eventListenerIds.push(this.socketSystem.addEventListener('inventory-items:*', this.handleInventoryItems.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('pulled-item', this.handlePulledItem.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('skill-use*', this.handleSkillResults.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('discarded-results', this.handleDiscardedResults.bind(this)))
  }

  useItem(itemId: string): Ref<Item> {
    const item = this.items.get(itemId)
    if (!item) {
      // Create a placeholder loading item
      const loadingItem: Item = {
        id: itemId,
        name: 'Loading...',
        description: 'This item is still loading...',
        imageUrl: '/src/assets/generic.png'
      }
      const loadingItemRef = ref(loadingItem)
      this.items.set(itemId, loadingItemRef)
      return loadingItemRef
    }
    return item
  }

  upsertItem(item: Item) {
    const existingRef = this.items.get(item.id)
    if (existingRef) {
      // Update the existing ref's value
      existingRef.value = item
    } else {
      // Create a new ref
      this.items.set(item.id, ref(item))
    }
  }

  removeItem(itemId: string) {
    this.items.delete(itemId)
  }

  clearItems() {
    this.items.clear()
  }
  
  /**
   * Handles inventory items received from socket events
   * @param data The inventory items data from the socket
   */
  private handleInventoryItems(data?: any, eventType?: string) {    
    // Add each item to the collection
    data.forEach((item: Item) => {
      this.upsertItem(item)
    })
  }

  /**
   * Adds item when an item is pulled
   */
  private handlePulledItem(data?: any, eventType?: string) {    
    this.upsertItem(data.item)
  }

  /**
   * Handles skill results from the server
   * @param data The skill results data containing story, tool, outputItems, and removedItemIds
   */
  private handleSkillResults(data?: any, eventType?: string) {
    // Update the tool item if present
    if (data.tool) {
      this.upsertItem(data.tool)
    }

    if (data.item) {
      this.upsertItem(data.item)
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
        this.upsertItem(item)
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