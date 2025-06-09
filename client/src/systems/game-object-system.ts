import type { Component, Ref } from 'vue'
import { markRaw, watch } from 'vue'
import type { PhysicsProperties } from '../utils/physics'

export interface GameObject {
  id: string
  type: Component
  row: number
  col: number
  width?: number
  height?: number
  depth?: number
  playerIsNear?: boolean
  physics?: PhysicsProperties
  props: any
}

export class GameObjectSystem {
  private objects: Ref<GameObject[]>

  constructor(objects: Ref<GameObject[]>) {
    this.objects = objects
  }

  addObject(obj: GameObject) {
    this.objects.value.push({
      ...obj,
      type: markRaw(obj.type),
      playerIsNear: false
    })

    // Check to see if this object is the player, if
    // so attach a watcher to update proximity
    if (obj.id === 'player') {
      const playerObject = this.objects.value.find(o => o.id === 'player')

      if (!playerObject) {
        return
      }

      watch(
        playerObject,
        (player) => {
          if (player) {
            this.updatePlayerProximity(player.row, player.col)
          }
        },
        { deep: true }
      )
    }
  }

  clearObjects() {
    this.objects.value = []
  }

  updatePlayerProximity(playerRow: number, playerCol: number) {
    const proximityThreshold = 3 // Now in tile units instead of pixels
    let closestDistance = Infinity
    let closestInteractiveId: string | null = null

    // Reset all playerIsNear flags
    this.objects.value.forEach(obj => {
      if (obj.id !== 'player') {
        obj.playerIsNear = false
      }
    })

    // Find the closest object based on tile distance
    this.objects.value.forEach(obj => {
      if (obj.id === 'player') {
        return
      }

      const objRow = obj.row - 1
      const objCol = obj.col - 1
      const objWidth = obj.width || 1
      const objDepth = obj.depth || 1

      // Calculate closest points between player and object in tile coordinates
      const closestCol = Math.max(objCol, Math.min(playerCol, objCol + objWidth))
      const closestRow = Math.max(objRow, Math.min(playerRow, objRow + objDepth))

      // Calculate tile distance
      const distance = Math.sqrt(
        Math.pow(closestCol - playerCol, 2) +
        Math.pow(closestRow - playerRow, 2)
      )

      // Update closest object if this one is closer
      if (distance < closestDistance) {
        closestDistance = distance
        closestInteractiveId = obj.id
      }
    })

    // Mark only the closest object as near if it's within threshold
    if (closestInteractiveId && closestDistance < proximityThreshold) {
      const closestObject = this.objects.value.find(obj => obj.id === closestInteractiveId)
      if (closestObject) {
        closestObject.playerIsNear = true
      }
    }
  }

  updateObjectPhysics(objectId: string, physicsProps: Partial<PhysicsProperties>) {
    const object = this.objects.value.find(obj => obj.id === objectId)
    if (!object) {
      console.warn(`No object found with id ${objectId}`)
      return
    }

    // Initialize physics if it doesn't exist
    if (!object.physics) {
      object.physics = {
        active: false,
        angle: 0,
        velocity: 0,
        friction: 0.2,
        height: 0,
        verticalVelocity: 0,
        bounceStrength: 0.7,
        mass: 1.0
      }
    }

    // Update physics properties
    object.physics = {
      ...object.physics,
      ...physicsProps,
      active: true
    }
  }

  removeObject(objectId: string) {
    const index = this.objects.value.findIndex(obj => obj.id === objectId)
    if (index !== -1) {
      this.objects.value.splice(index, 1)
    }
  }
}