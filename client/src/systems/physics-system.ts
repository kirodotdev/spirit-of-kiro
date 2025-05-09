import type { PhysicsState, PhysicsProperties, CollisionResult } from '../utils/physics'
import { updatePhysics, checkCollisionWith, resolveCollision } from '../utils/physics'
import { type Ref, watch, computed } from 'vue'
import { type GameObject } from './game-object-system'

// Interface for collision data
interface CollisionData {
  otherObj: GameObject;
  collisionResult: CollisionResult;
  otherState: PhysicsState;
}

export class PhysicsSystem {
  private objects: Ref<GameObject[]>
  private lastPhysicsUpdate: number = performance.now()
  private physicsAnimationFrame: number | null = null
  private hasActivePhysics: Ref<boolean>

  // Computed properties only recalculated when necessary
  private physicsObjects = computed(() => this.objects.value.filter(obj => obj.physics))
  private activeObjects = computed(() => this.physicsObjects.value.filter(obj => obj.physics?.active))

  constructor(objects: Ref<GameObject[]>, hasActivePhysics: Ref<boolean>) {
    const self = this;
    this.objects = objects;
    this.hasActivePhysics = hasActivePhysics;

    // Watch activeObjects to control physics loop
    watch(this.activeObjects, (newActiveObjects) => {
      self.hasActivePhysics.value = newActiveObjects.length > 0
      if (self.hasActivePhysics.value) {
        self.startPhysicsLoop()
      } else {
        self.stopPhysicsLoop()
      }
    })
  }

  startPhysicsLoop() {
    if (!this.physicsAnimationFrame) {
      this.lastPhysicsUpdate = performance.now()
      this.physicsAnimationFrame = requestAnimationFrame(this.doPhysicsTick.bind(this))
    }
  }

  stopPhysicsLoop() {
    if (this.physicsAnimationFrame) {
      cancelAnimationFrame(this.physicsAnimationFrame)
      this.physicsAnimationFrame = null
    }
  }

  // Clean up resources when the system is destroyed
  cleanup() {
    this.stopPhysicsLoop();
  }

  /**
  * Creates a physics state from a game object
  */
  private createPhysicsState(obj: GameObject): PhysicsState {
    return {
      position: {
        row: obj.row,
        col: obj.col
      },
      dimensions: {
        width: obj.width || 1,
        depth: obj.depth || 1,
        height: obj.height || 1,
      },
      physics: obj.physics
    };
  }

  /**
  * Detects collisions between an object's planned state and all other physics objects
  */
  private detectCollisions(objIndex: number, currentState: PhysicsState, plannedState: PhysicsState): CollisionData[] {
    const collisions: CollisionData[] = [];
    const obj = this.physicsObjects.value[objIndex];

    // Check collisions with all other objects
    for (let j = 0; j < this.physicsObjects.value.length; j++) {
      if (objIndex === j) continue; // Skip self

      const otherObj = this.physicsObjects.value[j];

      if (!otherObj.physics) {
        continue;
      }

      // Skip collision between two infinite mass objects
      if (obj.physics.mass === Infinity && otherObj.physics.mass === Infinity) {
        continue;
      }

      const otherState = this.createPhysicsState(otherObj);

      // Check for collisions with detailed overlap information
      const collisionResult = checkCollisionWith(currentState, plannedState, otherState);

      if (collisionResult.colliding) {
        collisions.push({
          otherObj,
          collisionResult,
          otherState
        });
      }
    }

    // Sort collisions by overlap magnitude (largest first)
    return collisions.sort((a, b) => {
      const overlapA = Math.max(a.collisionResult.horizontalOverlap, a.collisionResult.verticalOverlap);
      const overlapB = Math.max(b.collisionResult.horizontalOverlap, b.collisionResult.verticalOverlap);
      return overlapB - overlapA;
    });
  }

  /**
  * Resolves a collision with an immovable object
  */
  private resolveImmovableCollision(
    obj: GameObject,
    updatedCollision: CollisionResult,
    finalPosition: { row: number, col: number, angle: number, velocity: number }
  ): { row: number, col: number, angle: number, velocity: number, verticalVelocity?: number } {
    const { overlapDirection } = updatedCollision;
    let { row, col, angle, velocity } = finalPosition;
    let verticalVelocity = obj.physics.verticalVelocity || 0;
    
    // Calculate a small vertical bounce based on collision velocity
    const verticalBounceStrength = 0.2; // Adjust this value to control bounce height
    const collisionVerticalBounce = velocity * verticalBounceStrength * obj.physics.bounceStrength;

    // Determine which direction has the smallest overlap and adjust position
    if ((overlapDirection.left || overlapDirection.right) &&
      updatedCollision.horizontalOverlap < updatedCollision.verticalOverlap) {
      // Horizontal collision is smaller, adjust horizontally
      if (overlapDirection.left) {
        col += updatedCollision.horizontalOverlap;
        // Reverse horizontal velocity and apply bounce
        angle = 180 - angle;
      } else if (overlapDirection.right) {
        col -= updatedCollision.horizontalOverlap;
        // Reverse horizontal velocity and apply bounce
        angle = 180 - angle;
      }
      velocity = velocity * obj.physics.bounceStrength;
      
      // Add a small vertical bounce on horizontal collision
      verticalVelocity = Math.max(verticalVelocity, collisionVerticalBounce);
    }
    else if ((overlapDirection.top || overlapDirection.bottom) &&
      updatedCollision.verticalOverlap <= updatedCollision.horizontalOverlap) {
      // Vertical collision is smaller, adjust vertically
      if (overlapDirection.top) {
        row += updatedCollision.verticalOverlap;
        // Reverse vertical velocity and apply bounce
        angle = 360 - angle;
      } else if (overlapDirection.bottom) {
        row -= updatedCollision.verticalOverlap;
        // Reverse vertical velocity and apply bounce
        angle = 360 - angle;
      }
      velocity = velocity * obj.physics.bounceStrength;
      
      // For vertical collisions, we still want to add a small vertical bounce
      verticalVelocity = Math.max(verticalVelocity, collisionVerticalBounce);
    }

    return { row, col, angle, velocity, verticalVelocity };
  }

  /**
  * Main physics tick function - processes physics for all active objects
  */
  private doPhysicsTick(timestamp: number) {
    // Calculate the time delta, but cap it to prevent physics issues when tabbing out/in
    const maxDeltaTime = 50; // Cap at 50ms (20fps equivalent)
    const rawDeltaTime = timestamp - this.lastPhysicsUpdate;
    const deltaTime = Math.min(rawDeltaTime, maxDeltaTime);
    this.lastPhysicsUpdate = timestamp;

    // Check if we have any active objects to work on
    if (!this.activeObjects.value.length) {
      this.physicsAnimationFrame = requestAnimationFrame(this.doPhysicsTick.bind(this))
      return
    }

    // Process each object individually - update physics and handle collisions immediately
    for (let i = 0; i < this.physicsObjects.value.length; i++) {
      const obj = this.physicsObjects.value[i];

      // Skip inactive objects or objects with infinite mass
      if (!obj.physics || !obj.physics.active || obj.physics.mass === Infinity) {
        continue;
      }

      // Get current state and calculate new state based on physics
      const currentState = this.createPhysicsState(obj);
      const plannedState = updatePhysics(currentState, deltaTime);

      // Detect collisions with the planned position
      const collisions = this.detectCollisions(i, currentState, plannedState);

      // If no collisions, simply apply the planned physics update
      if (collisions.length === 0) {
        // Apply the direct physics update inline
        obj.row = plannedState.position.row;
        obj.col = plannedState.position.col;
        obj.physics.velocity = plannedState.physics.velocity;
        obj.physics.height = plannedState.physics.height;
        obj.physics.verticalVelocity = plannedState.physics.verticalVelocity;
        obj.physics.active = plannedState.physics.active;
        continue;
      }

      // Process collisions and adjust the planned position
      let finalPosition = {
        row: plannedState.position.row,
        col: plannedState.position.col,
        angle: plannedState.physics.angle,
        velocity: plannedState.physics.velocity
      };

      // Process each collision
      for (const collision of collisions) {
        const { otherObj, otherState } = collision;

        // Re-check collision with current adjusted position
        const currentAdjustedState: PhysicsState = {
          position: { row: finalPosition.row, col: finalPosition.col },
          dimensions: plannedState.dimensions,
          physics: {
            ...plannedState.physics,
            angle: finalPosition.angle,
            velocity: finalPosition.velocity
          }
        };

        const updatedCollision = checkCollisionWith(currentState, currentAdjustedState, otherState);

        // Skip if the collision is no longer happening after previous adjustments
        if (!updatedCollision.colliding) {
          continue;
        }

        if (otherObj.physics.mass === Infinity) {
          // Handle collision with immovable object
          finalPosition = this.resolveImmovableCollision(obj, updatedCollision, finalPosition);
        } else {
          // Both objects have finite mass, resolve collision between them
          const currentAdjustedState: PhysicsState = {
            position: { row: finalPosition.row, col: finalPosition.col },
            dimensions: plannedState.dimensions,
            physics: {
              ...plannedState.physics,
              angle: finalPosition.angle,
              velocity: finalPosition.velocity
            }
          };

          // Note: resolveCollision still uses two parameters as it's handling the physics resolution
          // between two objects that are already colliding
          const [newState1, newState2] = resolveCollision(currentAdjustedState, otherState);

          // Apply changes to this object
          finalPosition.row = newState1.position.row;
          finalPosition.col = newState1.position.col;
          finalPosition.angle = newState1.physics.angle;
          finalPosition.velocity = newState1.physics.velocity;

          // Apply changes to the other object immediately
          otherObj.row = newState2.position.row;
          otherObj.col = newState2.position.col;
          otherObj.physics.angle = newState2.physics.angle;
          otherObj.physics.velocity = newState2.physics.velocity;
          otherObj.physics.active = newState2.physics.active || otherObj.physics.active;
        }
      }

      // Apply the final adjusted state to the object inline
      // Apply the final adjusted position and physics properties
      obj.row = finalPosition.row;
      obj.col = finalPosition.col;
      obj.physics.velocity = finalPosition.velocity;
      obj.physics.angle = finalPosition.angle;

      // Apply common physics properties from the current state
      if (obj.physics) {
        // Apply vertical velocity from collision if it was set
        if ('verticalVelocity' in finalPosition && finalPosition.verticalVelocity !== undefined) {
          obj.physics.verticalVelocity = finalPosition.verticalVelocity;
          // Set a small height to start the bounce if object is on the ground
          if (obj.physics.height === 0) {
            obj.physics.height = 0.01;
          }
        } else {
          obj.physics.verticalVelocity = obj.physics.verticalVelocity;
        }
        obj.physics.height = obj.physics.height;
        obj.physics.active = true; // Ensure the object remains active
      }
    }

    // Schedule the next physics tick
    this.physicsAnimationFrame = requestAnimationFrame(this.doPhysicsTick.bind(this))
  }
}