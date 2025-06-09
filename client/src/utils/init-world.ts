import PlayerCharacter from '../components/PlayerCharacter.vue'
import Dispenser from '../components/Dispenser.vue'
import Banner from '../components/Banner.vue'
import Workbench from '../components/Workbench.vue'
import Wall from '../components/Wall.vue'
import Chest from '../components/Chest.vue'
import PullLever from '../components/PullLever.vue'
import Garbage from '../components/Garbage.vue'
import Computer from '../components/Computer.vue'
import { PhysicsType } from './physics'

export function setupGameObjects(gameStore: any, gridSize: number) {
  // System items
  gameStore.addObject({
    id: 'player',
    type: PlayerCharacter,
    row: gridSize / 2,
    col: gridSize / 2,
    width: 1,
    depth: 1,
    height: 1,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 0.5,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0.3,
      mass: 1,
      physicsType: PhysicsType.Dynamic
    },
    props: {}
  })

  // System items
  gameStore.addObject({
    id: 'banner',
    type: Banner,
    row: 2,
    col: 2,
    width: gridSize - 2,
    depth: 1,
    props: {}
  })

  // Static blockers
  gameStore.addObject({
    id: 'backwall1',
    type: Wall,
    row: -2,
    col: 1,
    width: gridSize,
    depth: 7.9,
    height: 6,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })

  gameStore.addObject({
    id: 'leftwall',
    type: Wall,
    row: 1,
    col: -1, // Start 2 tiles outside the play area
    width: 3, // Increased width to 3
    depth: gridSize,
    height: 1000,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })

  gameStore.addObject({
    id: 'rightwall',
    type: Wall,
    row: 1,
    col: gridSize,
    width: 3, // Increased width to extend 2 tiles out of the play area
    depth: gridSize,
    height: 1000,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })

  gameStore.addObject({
    id: 'bottomwall-left',
    type: Wall,
    row: gridSize - 1.5,
    col: 1,
    width: 8,
    depth: 2.5,
    height: 5,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })

  gameStore.addObject({
    id: 'bottomwall-right',
    type: Wall,
    row: gridSize - 1.5,
    col: 13,
    width: 8,
    depth: 2.5,
    height: 5,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })

  gameStore.addObject({
    id: 'door-block',
    type: Wall,
    row: gridSize + .25,
    col: 9,
    width: 4,
    depth: .25,
    height: 1,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })

  gameStore.addObject({
    id: 'door-field',
    type: Wall,
    row: gridSize - 1.5,
    col: 9,
    width: 4,
    depth: 2,
    height: 1,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      event: 'near-door',
      physicsType: PhysicsType.Field
    },
    props: {}
  })

  gameStore.addObject({
    id: 'sell-field',
    type: Wall,
    row: gridSize + .5,
    col: 9,
    width: 4,
    depth: .1,
    height: 1,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      event: 'sell-item',
      physicsType: PhysicsType.Field
    },
    props: {}
  })

  // Interactive objects
  gameStore.addObject({
    id: 'chest1',
    type: Chest,
    row: 10.5,
    col: 17.75,
    width: 2,
    depth: 1.5,
    height: 3.5, // Helps prevent items getting stuck on top of chest
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })

  gameStore.addObject({
    id: 'dispenser1',
    type: Dispenser,
    row: 4.9,
    col: 9.15,
    width: 2.5,
    depth: 3,
    height: 3.5,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })

  gameStore.addObject({
    id: 'workbench1',
    type: Workbench,
    row: 3.5,
    col: 16,
    width: 2.5,
    depth: 3,
    height: 3,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })

  gameStore.addObject({
    id: 'lever1',
    type: PullLever,
    row: 5.5,
    col: 11.9,
    width: 1.5,
    depth: 1.5,
    height: 0,
    props: {
      pivotPoint: {
        x: 51,
        y: 81
      },
      initialAngle: 45,
      maxRotationAngle: 90,
      rotationSpeed: 300,
      autoReset: true,
      resetDelay: 100,
      resetSpeed: 500
    }
  })

  // Add garbage on the back wall
  gameStore.addObject({
    id: 'garbage1',
    type: Garbage,
    row: 4.4,
    col: 3.85,
    width: 2,
    depth: 2,
    height: 4,
    props: {}
  })

  // Add computer on the left side
  gameStore.addObject({
    id: 'computer1',
    type: Computer,
    row: 12.4,
    col: 2.25,
    width: 2.5,
    depth: 1.9,
    height: 4,
    physics: {
      active: false,
      angle: 0,
      velocity: 0,
      friction: 1,
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0,
      mass: Infinity,
      physicsType: PhysicsType.Static
    },
    props: {}
  })
}