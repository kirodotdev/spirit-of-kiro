import { computed, watch } from 'vue';
import type { GameObject } from './game-object-system';
import { useGameStore } from '../stores/game';
import { 
  updatePhysicsPosition, 
  checkCollision, 
  handleCollision, 
  handleWallCollision,
  detectAndFixStuckObjects
} from '../utils/physics';

export class PhysicsSystem {
  private objects: Ref<GameObject[]>;
  private lastTimestamp: number = 0;
  private animationFrameId: number | null = null;
  private hasActivePhysics: Ref<boolean>;

  private physicsObjects = computed(() => this.objects.value.filter(obj => obj.physics))
  private walls = computed(() => this.objects.value.filter(obj => obj.physics && obj.physics.mass == Infinity))
  private activeObjects = computed(() => this.physicsObjects.value.filter(obj => obj.physics.active == true))
  private gameStore;

  constructor(objects: Ref<GameObject[]>, hasActivePhysics: Ref<boolean>) {
    this.objects = objects;
    this.hasActivePhysics = hasActivePhysics;
    this.lastTimestamp = performance.now();
    const self = this;
    this.gameStore = useGameStore();

    // Watch activeObjects to control physics loop
    watch(this.activeObjects, (newActiveObjects) => {
      if(newActiveObjects.length > 0 && hasActivePhysics.value == false) {
        hasActivePhysics.value = true;
        self.start();
      }

      if (hasActivePhysics.value == true && newActiveObjects.length == 0) {
        hasActivePhysics.value = false;
        self.stop();
      }
    })
  }

  start() {
    console.log('starting');
    if (this.animationFrameId !== null) {
      return; // Already running
    }
    
    // Start the physics loop
    this.lastTimestamp = performance.now();
    this.animationFrameId = requestAnimationFrame(this.update.bind(this));
  }

  stop() {
    console.log('stopping');
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private update(timestamp: number) {
    // Calculate delta time in seconds
    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    
    // Update physics for all objects
    this.updatePhysics(deltaTime);
    
    // Continue the loop
    this.animationFrameId = requestAnimationFrame(this.update.bind(this));
  }

  private updatePhysics(deltaTime: number) {    
    const self = this;
    // Update positions based on physics properties
    for (const obj of this.physicsObjects.value) {
      if (obj.physics.mass == Infinity) {
        // Walls don't collide with walls
        continue;
      }

      // First check if the object is stuck and fix it if needed
      obj.physics = detectAndFixStuckObjects({
        row: obj.row,
        col: obj.col,
        width: obj.width || 1,
        depth: obj.depth || 1,
        physics: obj.physics
      });

      // Update position based on physics
      const { row, col, physics } = updatePhysicsPosition(
        obj.row, 
        obj.col, 
        obj.physics, 
        deltaTime
      );
      
      // Check for wall collisions
      const wallCollisionResult = handleWallCollision(
        row,
        col,
        obj.width || 1,
        obj.depth || 1,
        physics,
        self.walls.value.map(wall => ({
          row: wall.row,
          col: wall.col,
          width: wall.width || 1,
          depth: wall.depth || 1
        }))
      );
      
      // Update object with new position and physics
      obj.row = wallCollisionResult.row;
      obj.col = wallCollisionResult.col;
      obj.physics = wallCollisionResult.physics;
    }
    
    // Check for collisions between active objects
    for (let i = 0; i < this.physicsObjects.value.length; i++) {
      for (let j = 0; j < this.physicsObjects.value.length; j++) {
        if (i == j) {
          continue;
        }

        const obj1 = this.physicsObjects.value[i];
        const obj2 = this.physicsObjects.value[j];

        if (obj1.physics.mass == Infinity || obj2.physics.mass == Infinity) {
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
        
        if (colliding) {
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
}