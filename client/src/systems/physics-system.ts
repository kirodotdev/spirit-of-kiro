import { computed, watch, type Ref } from 'vue';
import type { GameObject } from './game-object-system';
import { useGameStore } from '../stores/game';
import { 
  updatePhysicsPosition, 
  checkCollision, 
  handleCollision, 
  handleWallCollision,
  PhysicsType
} from '../utils/physics';

export class PhysicsSystem {
  private objects: Ref<GameObject[]>;
  private lastTimestamp: number = 0;
  private animationFrameId: number | null = null;
  private hasActivePhysics: Ref<boolean>;
  private accumulator: number = 0;
  private readonly FIXED_TIMESTEP = 1 / 60; // 60 FPS
  private readonly MAX_DELTA_TIME = 0.25; // 250ms max to prevent spiral of death
  private cachedWalls: Array<{ row: number; col: number; width: number; depth: number; height: number }> = [];
  private wallsCacheDirty: boolean = true;
  private visibilityChangeHandler: () => void;

  private physicsObjects = computed(() => this.objects.value.filter(obj => obj.physics))
  private walls = computed(() => this.objects.value.filter(obj => obj.physics && obj.physics.mass === Infinity))
  private activeObjects = computed(() => this.physicsObjects.value.filter(obj => obj.physics && obj.physics.active === true))
  private gameStore;

  constructor(objects: Ref<GameObject[]>, hasActivePhysics: Ref<boolean>) {
    this.objects = objects;
    this.hasActivePhysics = hasActivePhysics;
    this.lastTimestamp = performance.now();
    const self = this;
    this.gameStore = useGameStore();

    // Page Visibility API - pause physics when tab is hidden
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        // Tab is hidden - pause physics
        self.stop();
      } else {
        // Tab is visible again - reset timestamp and resume
        self.lastTimestamp = performance.now();
        self.accumulator = 0; // Reset accumulator to prevent catch-up
        if (self.hasActivePhysics.value && self.activeObjects.value.length > 0) {
          self.start();
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    // Watch activeObjects to control physics loop
    watch(this.activeObjects, (newActiveObjects) => {
      if (newActiveObjects.length > 0 && hasActivePhysics.value === false) {
        hasActivePhysics.value = true;
        self.start();
      }

      if (hasActivePhysics.value === true && newActiveObjects.length === 0) {
        hasActivePhysics.value = false;
        self.stop();
      }
    })

    // Watch walls to invalidate cache
    watch(this.walls, () => {
      self.wallsCacheDirty = true;
    })
  }

  // Cleanup method to prevent memory leaks
  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  start() {
    if (this.animationFrameId !== null) {
      return; // Already running
    }
    
    // Start the physics loop
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.update.bind(this));
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private update(timestamp: number) {
    // Calculate delta time in seconds
    let deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    
    // Clamp delta time to prevent spiral of death
    if (deltaTime > this.MAX_DELTA_TIME) {
      deltaTime = this.MAX_DELTA_TIME;
    }

    // If we had a very long pause (>500ms), dampen velocities
    if (deltaTime > 0.5) {
      this.dampenAllVelocities(0.5); // Reduce by 50%
      deltaTime = this.FIXED_TIMESTEP; // Reset to one frame
    }
    
    // Fixed timestep with accumulator for consistent physics
    this.accumulator += deltaTime;
    
    // Run physics in fixed steps
    while (this.accumulator >= this.FIXED_TIMESTEP) {
      this.updatePhysics(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
    }
    
    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.update.bind(this));
  }

  // Dampen all velocities (used after long pauses)
  private dampenAllVelocities(factor: number) {
    for (const obj of this.physicsObjects.value) {
      if (obj.physics?.velocity) {
        obj.physics.velocity *= factor;
      }
      if (obj.physics?.verticalVelocity) {
        obj.physics.verticalVelocity *= factor;
      }
    }
  }

  private updatePhysics(deltaTime: number) {    
    // Update cached walls if needed
    if (this.wallsCacheDirty) {
      this.cachedWalls = this.walls.value.map(wall => ({
        row: wall.row,
        col: wall.col,
        width: wall.width || 1,
        depth: wall.depth || 1,
        height: wall.height || 1
      }));
      this.wallsCacheDirty = false;
    }

    // Update positions based on physics properties
    for (const obj of this.physicsObjects.value) {
      if (!obj.physics) {
        continue;
      }

      if (obj.physics.physicsType === PhysicsType.Static || obj.physics.physicsType === PhysicsType.Field) {
        // These items don't collide with each other
        continue;
      }

      // Sanitize physics to prevent runaway values
      this.sanitizePhysics(obj);

      // Update position based on physics
      const { row, col, physics } = updatePhysicsPosition(
        obj.row, 
        obj.col, 
        obj.physics, 
        deltaTime
      );
      
      // Check for wall collisions using cached walls
      const wallCollisionResult = handleWallCollision(
        row,
        col,
        obj.width || 1,
        obj.depth || 1,
        physics,
        this.cachedWalls
      );
      
      // Update object with new position and physics
      obj.row = wallCollisionResult.row;
      obj.col = wallCollisionResult.col;
      obj.physics = wallCollisionResult.physics;
    }
    
    // Check for collisions between active objects
    // Optimized: only check j > i to avoid duplicate checks
    for (let i = 0; i < this.physicsObjects.value.length; i++) {
      for (let j = i + 1; j < this.physicsObjects.value.length; j++) {
        const obj1 = this.physicsObjects.value[i];
        const obj2 = this.physicsObjects.value[j];

        if (!obj1.physics || !obj2.physics) {
          continue;
        }

        if (obj1.physics.physicsType === PhysicsType.Static || obj2.physics.physicsType === PhysicsType.Static) {
          // Static type collisions were handled already
          continue;
        }

        // Broadphase: AABB distance check to skip distant objects
        const distanceX = Math.abs(obj2.col - obj1.col);
        const distanceY = Math.abs(obj2.row - obj1.row);
        const maxDistance = 10; // Skip if objects are more than 10 units apart
        
        if (distanceX > maxDistance || distanceY > maxDistance) {
          continue;
        }
        
        // Check if objects are colliding
        const colliding = checkCollision(
          {
            row: obj1.row,
            col: obj1.col,
            width: obj1.width || 1,
            depth: obj1.depth || 1,
            physics: obj1.physics
          },
          {
            row: obj2.row,
            col: obj2.col,
            width: obj2.width || 1,
            depth: obj2.depth || 1,
            physics: obj2.physics
          }
        );
        
        if (!colliding) {
          continue;
        }
          
        if (obj1.physics.physicsType === PhysicsType.Field || obj2.physics.physicsType === PhysicsType.Field) {
          // Field type collisions don't actually collide, but they do event.
          if (obj1.physics.event && typeof obj1.physics.event === 'string') {
            this.gameStore.emitEvent(obj1.physics.event, { id: obj2.id });
          }
          if (obj2.physics.event && typeof obj2.physics.event === 'string') {
            this.gameStore.emitEvent(obj2.physics.event, { id: obj1.id });
          }

          continue;
        }

        // Handle collision with momentum transfer
        const { obj1Physics, obj2Physics } = handleCollision(
          {
            row: obj1.row,
            col: obj1.col,
            width: obj1.width || 1,
            depth: obj1.depth || 1,
            physics: obj1.physics
          },
          {
            row: obj2.row,
            col: obj2.col,
            width: obj2.width || 1,
            depth: obj2.depth || 1,
            physics: obj2.physics
          }
        );
        
        // Update physics properties
        obj1.physics = obj1Physics;
        obj2.physics = obj2Physics;
        
        // Check if either object has an event property in its physics configuration
        // and emit that event with the ID of the colliding object
        
        if (obj1.physics.event && typeof obj1.physics.event === 'string') {
          this.gameStore.emitEvent(obj1.physics.event, { id: obj2.id });
        }
        if (obj2.physics.event && typeof obj2.physics.event === 'string') {
          this.gameStore.emitEvent(obj2.physics.event, { id: obj1.id });
        }
        
        // Slightly separate objects to prevent sticking
        const pushFactor = 0.05;
        const centerDiffX = obj2.col - obj1.col;
        const centerDiffY = obj2.row - obj1.row;
        const distance = Math.sqrt(centerDiffX * centerDiffX + centerDiffY * centerDiffY);
        
        if (distance > 0) {
          const normalX = centerDiffX / distance;
          const normalY = centerDiffY / distance;
          
          obj1.col -= normalX * pushFactor;
          obj1.row -= normalY * pushFactor;
          obj2.col += normalX * pushFactor;
          obj2.row += normalY * pushFactor;
        }
      }
    }
  }

  // Apply an impulse to an object (useful for kicking or pushing)
  applyImpulse(objectId: string, angle: number, force: number) {
    const object = this.objects.value.find(obj => obj.id === objectId);
    if (!object || !object.physics) {
      return;
    }
    
    // Initialize physics if not active
    if (!object.physics.active) {
      object.physics.active = true;
      object.physics.velocity = 0;
    }
    
    // Convert current velocity to vector
    const currentVelocity = {
      x: Math.cos(object.physics.angle * (Math.PI / 180)) * object.physics.velocity,
      y: Math.sin(object.physics.angle * (Math.PI / 180)) * object.physics.velocity
    };
    
    // Convert impulse to vector
    const impulse = {
      x: Math.cos(angle * (Math.PI / 180)) * force,
      y: Math.sin(angle * (Math.PI / 180)) * force
    };
    
    // Add impulse to current velocity
    const newVelocity = {
      x: currentVelocity.x + impulse.x / object.physics.mass,
      y: currentVelocity.y + impulse.y / object.physics.mass
    };
    
    // Convert back to angle and magnitude
    const magnitude = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
    let newAngle = Math.atan2(newVelocity.y, newVelocity.x) * (180 / Math.PI);
    if (newAngle < 0) newAngle += 360;
    
    // Update physics properties
    object.physics.angle = newAngle;
    object.physics.velocity = magnitude;
    object.physics.active = true;
  }

  // Apply a vertical impulse (jumping or throwing upward)
  applyVerticalImpulse(objectId: string, force: number) {
    const object = this.objects.value.find(obj => obj.id === objectId);
    if (!object || !object.physics) {
      return;
    }
    
    // Initialize physics if not active
    if (!object.physics.active) {
      object.physics.active = true;
    }
    
    // Add vertical impulse
    object.physics.verticalVelocity += force / object.physics.mass;
  }

  // Sanitize physics to prevent runaway values
  private sanitizePhysics(obj: GameObject) {
    if (!obj.physics) return;
    
    const MAX_VELOCITY = 50;
    const MAX_POSITION = 1000;
    
    // Clamp velocity
    if (Math.abs(obj.physics.velocity) > MAX_VELOCITY) {
      obj.physics.velocity = Math.sign(obj.physics.velocity) * MAX_VELOCITY;
    }
    
    // Clamp vertical velocity
    if (obj.physics.verticalVelocity && Math.abs(obj.physics.verticalVelocity) > MAX_VELOCITY) {
      obj.physics.verticalVelocity = Math.sign(obj.physics.verticalVelocity) * MAX_VELOCITY;
    }
    
    // Reset if out of bounds
    if (Math.abs(obj.row) > MAX_POSITION || Math.abs(obj.col) > MAX_POSITION) {
      obj.physics.active = false;
      obj.physics.velocity = 0;
      if (obj.physics.verticalVelocity) {
        obj.physics.verticalVelocity = 0;
      }
      // Reset to origin or last known good position
      obj.row = Math.max(-MAX_POSITION, Math.min(MAX_POSITION, obj.row));
      obj.col = Math.max(-MAX_POSITION, Math.min(MAX_POSITION, obj.col));
    }
  }
}