import { ref, computed } from 'vue'
import { PhysicsSystem } from '../systems/physics-system'
import { SocketSystem } from '../systems/socket-system'
import { defineStore } from 'pinia'

import { GameObjectSystem, type GameObject } from '../systems/game-object-system'
import { ItemSystem, type Item } from '../systems/item-system'

export const useGameStore = defineStore('game', () => {
  // Reactive state variables that are used by front facing
  // components, as well as manipulated by the logic layers
  const ws = ref<WebSocket | null>(null)
  const wsConnected = ref(false)
  const isAuthenticated = ref(false)
  const userId = ref<string | null>(null)
  const objects = ref<GameObject[]>([])
  const items = ref<Item[]>([])
  const tileSize = ref(50)
  const heldItemId = ref<string | null>(null)

  // Flags
  const debug = ref(false)
  const interactionLocked = ref(false)
  const hasActivePhysics = ref(false)

  // Logic layers that interact with aspects of the
  // shared reactive state
  new PhysicsSystem(objects, hasActivePhysics);
  const socketSystem = new SocketSystem(ws, wsConnected, isAuthenticated);
  const gameObjectSystem = new GameObjectSystem(objects);
  const itemSystem = new ItemSystem(items, socketSystem);

  return {
    // State
    ws,
    wsConnected,
    isAuthenticated,
    objects,
    items,
    itemsById: itemSystem.itemsById,
    debug,
    tileSize,
    interactionLocked,
    hasActivePhysics,
    heldItemId,

    // Socket actions
    initWebSocket: socketSystem.initWebSocket.bind(socketSystem),
    addEventListener: socketSystem.addEventListener.bind(socketSystem),
    removeEventListener: socketSystem.removeEventListener.bind(socketSystem),
    emitEvent: socketSystem.emitEvent.bind(socketSystem),
    pullItem: socketSystem.pullItem.bind(socketSystem),
    listInventory: socketSystem.listInventory.bind(socketSystem),
    discardItem: socketSystem.discardItem.bind(socketSystem),
    moveItem: socketSystem.moveItem.bind(socketSystem),
    reconnect: socketSystem.reconnect.bind(socketSystem),
    cleanup: socketSystem.cleanup.bind(socketSystem),

    // Game item actions (getting items is done using the reactive itemsById prop)
    addItem: itemSystem.addItem.bind(itemSystem),
    removeItem: itemSystem.removeItem.bind(itemSystem),
    clearItems: itemSystem.clearItems.bind(itemSystem),

    // Game object (drawn objects) actions
    addObject: gameObjectSystem.addObject.bind(gameObjectSystem),
    clearObjects: gameObjectSystem.clearObjects.bind(gameObjectSystem),
    updateObjectPhysics: gameObjectSystem.updateObjectPhysics.bind(gameObjectSystem),
    removeObject: gameObjectSystem.removeObject.bind(gameObjectSystem),
  }
})