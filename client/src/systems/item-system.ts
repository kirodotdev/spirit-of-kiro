import { type Ref, computed } from 'vue'

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
  public itemsById = computed(() => {
    const map = new Map<string, Item>()
    this.items.value.forEach(item => {
      map.set(item.id, item)
    })
    return map
  })

  constructor(items: Ref<Item[]>) {
    this.items = items
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
}