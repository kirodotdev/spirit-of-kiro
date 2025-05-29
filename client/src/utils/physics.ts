export enum PhysicsType {
  Static = "static",
  Field = "field",
  Dynamic = "dynamic"
}

export interface PhysicsProperties {
  angle: number;  // Angle in degrees
  velocity: number;  // Velocity in tiles per second
  friction: number;  // Friction coefficient between 0 and 1
  active: boolean;
  event?: string; // Event to emit when this item collides with another item
  height: number;  // Current height above ground in tile units
  verticalVelocity: number;  // Vertical velocity in tile units per second
  bounceStrength: number;  // How much velocity is retained on bounce (0-1)
  mass: number;  // Mass of object for collision calculations
  physicsType?: PhysicsType;  // Type of physics object (static, field, or dynamic), defaults to dynamic
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface CollisionResult {
  collided: boolean;
  newVelocity?: Vector2D;
  newPosition?: Vector2D;
}

// Convert angle in degrees and magnitude to a vector
export function angleToVector(angle: number, magnitude: number): Vector2D {
  const radians = angle * (Math.PI / 180);
  return {
    x: Math.cos(radians) * magnitude,
    y: Math.sin(radians) * magnitude
  };
}

// Convert a vector to angle in degrees and magnitude
export function vectorToAngle(vector: Vector2D): { angle: number, magnitude: number } {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  let angle = Math.atan2(vector.y, vector.x) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return { angle, magnitude };
}

// Apply physics update to an object's position based on its physics properties
export function updatePhysicsPosition(
  row: number, 
  col: number, 
  physics: PhysicsProperties, 
  deltaTime: number
): { row: number, col: number, physics: PhysicsProperties } {
  if (!physics.active) {
    return { row, col, physics };
  }

  // Convert angle and velocity to vector
  const velocityVector = angleToVector(physics.angle, physics.velocity);
  
  // Update position based on velocity
  const newCol = col + (velocityVector.x * deltaTime);
  const newRow = row + (velocityVector.y * deltaTime);
  
  // Apply friction to slow down the object
  let newVelocity = physics.velocity * (1 - physics.friction * deltaTime);
  
  // Update vertical position based on vertical velocity
  let newHeight = physics.height + (physics.verticalVelocity * deltaTime);
  let newVerticalVelocity = physics.verticalVelocity;
  
  // Apply gravity if object is above ground
  const gravity = 9.8; // Gravity constant in tile units per second squared
  newVerticalVelocity -= gravity * deltaTime;
  
  // Check for ground collision
  if (newHeight <= 0) {
    newHeight = 0;
    // Bounce with reduced velocity based on bounce strength
    if (newVerticalVelocity < 0) {
      newVerticalVelocity = -newVerticalVelocity * physics.bounceStrength;
      
      // Apply some horizontal bounce effect too
      const horizontalBounceEffect = 0.8; // How much of the bounce affects horizontal movement
      newVelocity = newVelocity * (1 + (Math.abs(newVerticalVelocity) * horizontalBounceEffect * 0.1));
      
      // Stop very small bounces to prevent endless tiny bounces
      if (Math.abs(newVerticalVelocity) < 0.1) {
        newVerticalVelocity = 0;
      }
    }
  }
  
  // Stop physics if velocity is very low
  if (newVelocity < .1) {
    newVelocity = 0;
  }

  if (newHeight < .05 && Math.abs(newVerticalVelocity) < .05) {
    newHeight = 0;
    newVerticalVelocity = 0;
  }
  
  // Update physics properties
  const updatedPhysics = { 
    ...physics, 
    velocity: newVelocity,
    height: newHeight,
    verticalVelocity: newVerticalVelocity,
    active: newVelocity > 0 || newHeight > 0 || Math.abs(newVerticalVelocity) > 0
  };
  
  return { row: newRow, col: newCol, physics: updatedPhysics };
}

// Check for collision between two objects
export function checkCollision(
  obj1: { row: number, col: number, width: number, depth: number, physics: PhysicsProperties },
  obj2: { row: number, col: number, width: number, depth: number, physics: PhysicsProperties }
): boolean {
  // Improved height-based collision check
  // Calculate the effective height range for each object
  const obj1MinHeight = obj1.physics.height;
  const obj1MaxHeight = obj1.physics.height + Math.max(obj1.width, obj1.depth);
  const obj2MinHeight = obj2.physics.height;
  const obj2MaxHeight = obj2.physics.height + Math.max(obj2.width, obj2.depth);
  
  // Check if height ranges overlap
  if (obj1MaxHeight < obj2MinHeight || obj1MinHeight > obj2MaxHeight) {
    return false;
  }
  
  // Check for rectangle overlap
  return (
    obj1.col < obj2.col + obj2.width &&
    obj1.col + obj1.width > obj2.col &&
    obj1.row < obj2.row + obj2.depth &&
    obj1.row + obj1.depth > obj2.row
  );
}

// Handle collision between two objects with momentum transfer
export function handleCollision(
  obj1: { row: number, col: number, width: number, depth: number, physics: PhysicsProperties },
  obj2: { row: number, col: number, width: number, depth: number, physics: PhysicsProperties }
): { obj1Physics: PhysicsProperties, obj2Physics: PhysicsProperties } {
  // Convert angles and velocities to vectors
  const v1 = angleToVector(obj1.physics.angle, obj1.physics.velocity);
  const v2 = angleToVector(obj2.physics.angle, obj2.physics.velocity);
  
  // Calculate centers of objects
  const center1 = { x: obj1.col + obj1.width / 2, y: obj1.row + obj1.depth / 2 };
  const center2 = { x: obj2.col + obj2.width / 2, y: obj2.row + obj2.depth / 2 };
  
  // Calculate collision normal (direction from obj1 to obj2)
  const collisionNormal = {
    x: center2.x - center1.x,
    y: center2.y - center1.y
  };
  
  // Normalize the collision normal
  const distance = Math.sqrt(collisionNormal.x * collisionNormal.x + collisionNormal.y * collisionNormal.y);
  if (distance === 0) {
    // Objects are exactly at the same position, push in random direction
    const randomAngle = Math.random() * 360;
    collisionNormal.x = Math.cos(randomAngle * (Math.PI / 180));
    collisionNormal.y = Math.sin(randomAngle * (Math.PI / 180));
  } else {
    collisionNormal.x /= distance;
    collisionNormal.y /= distance;
  }
  
  // Calculate relative velocity
  const relativeVelocity = {
    x: v2.x - v1.x,
    y: v2.y - v1.y
  };
  
  // Calculate relative velocity in terms of the collision normal
  const velocityAlongNormal = relativeVelocity.x * collisionNormal.x + relativeVelocity.y * collisionNormal.y;
  
  // Do not resolve if objects are moving away from each other
  if (velocityAlongNormal > 0) {
    return { obj1Physics: obj1.physics, obj2Physics: obj2.physics };
  }
  
  // Calculate restitution (bounciness)
  const restitution = Math.min(obj1.physics.bounceStrength, obj2.physics.bounceStrength);
  
  // Calculate impulse scalar
  const impulseScalar = -(1 + restitution) * velocityAlongNormal / 
                        (1 / obj1.physics.mass + 1 / obj2.physics.mass);
  
  // Apply impulse
  const impulse = {
    x: impulseScalar * collisionNormal.x,
    y: impulseScalar * collisionNormal.y
  };
  
  // Update velocities
  const newV1 = {
    x: v1.x - (impulse.x / obj1.physics.mass),
    y: v1.y - (impulse.y / obj1.physics.mass)
  };
  
  const newV2 = {
    x: v2.x + (impulse.x / obj2.physics.mass),
    y: v2.y + (impulse.y / obj2.physics.mass)
  };
  
  // Convert back to angle and magnitude
  const newObj1 = vectorToAngle(newV1);
  const newObj2 = vectorToAngle(newV2);
  
  // Calculate height difference and adjust vertical velocities to separate objects vertically
  const heightDifference = obj1.physics.height - obj2.physics.height;
  let obj1VerticalVelocity = obj1.physics.verticalVelocity;
  let obj2VerticalVelocity = obj2.physics.verticalVelocity;
  
  // If objects are at similar heights, give them opposing vertical velocities to separate
  if (Math.abs(heightDifference) < 0.5) {
    const verticalSeparationImpulse = 2.0; // Strength of vertical separation
    if (heightDifference > 0) {
      // obj1 is higher, push it up more
      obj1VerticalVelocity = Math.max(obj1VerticalVelocity, verticalSeparationImpulse);
      obj2VerticalVelocity = Math.min(obj2VerticalVelocity, -verticalSeparationImpulse * 0.5);
    } else {
      // obj2 is higher, push it up more
      obj2VerticalVelocity = Math.max(obj2VerticalVelocity, verticalSeparationImpulse);
      obj1VerticalVelocity = Math.min(obj1VerticalVelocity, -verticalSeparationImpulse * 0.5);
    }
  } else {
    // Add a small random vertical bounce on collision
    obj1VerticalVelocity += Math.random() * 0.8 - 0.2; // -0.2 to 0.6 range
    obj2VerticalVelocity += Math.random() * 0.8 - 0.2;
  }
  
  // Create new physics objects with updated values
  const obj1Physics: PhysicsProperties = {
    ...obj1.physics,
    active: true,
    angle: newObj1.angle,
    velocity: newObj1.magnitude,
    verticalVelocity: obj1VerticalVelocity
  };
  
  const obj2Physics: PhysicsProperties = {
    ...obj2.physics,
    active: true,
    angle: newObj2.angle,
    velocity: newObj2.magnitude,
    verticalVelocity: obj2VerticalVelocity
  };
  
  return { obj1Physics, obj2Physics };
}

// Check for wall collisions and update physics accordingly
export function handleWallCollision(
  row: number,
  col: number,
  width: number,
  depth: number,
  physics: PhysicsProperties,
  walls: Array<{ row: number, col: number, width: number, depth: number, height?: number }>
): { row: number, col: number, physics: PhysicsProperties } {  
  let newRow = row;
  let newCol = col;
  let newPhysics = { ...physics };
  
  // Check collision with each wall
  for (const wall of walls) {
    // Get wall height (default to 1 if not specified)
    const wallHeight = wall.height !== undefined ? wall.height : 1;
    
    // Skip collision check if object's height is greater than wall's height
    if (physics.height > wallHeight) {
      continue;
    }
    
    // Check if object overlaps with wall
    if (
      col < wall.col + wall.width &&
      col + width > wall.col &&
      row < wall.row + wall.depth &&
      row + depth > wall.row
    ) {
      // Calculate overlap on each axis
      const overlapLeft = (wall.col + wall.width) - col;
      const overlapRight = (col + width) - wall.col;
      const overlapTop = (wall.row + wall.depth) - row;
      const overlapBottom = (row + depth) - wall.row;
      
      // Find the smallest overlap
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      
      // Determine which side of the wall was hit
      if (minOverlap === overlapLeft) {
        // Hit left side of wall
        newCol = wall.col + wall.width;
        // Reflect angle
        const velocity = angleToVector(physics.angle, physics.velocity);
        velocity.x = -velocity.x * physics.bounceStrength;
        const newAngleData = vectorToAngle(velocity);
        newPhysics.angle = newAngleData.angle;
        newPhysics.velocity = newAngleData.magnitude;
      } else if (minOverlap === overlapRight) {
        // Hit right side of wall
        newCol = wall.col - width;
        // Reflect angle
        const velocity = angleToVector(physics.angle, physics.velocity);
        velocity.x = -velocity.x * physics.bounceStrength;
        const newAngleData = vectorToAngle(velocity);
        newPhysics.angle = newAngleData.angle;
        newPhysics.velocity = newAngleData.magnitude;
      } else if (minOverlap === overlapTop) {
        // Hit top side of wall
        newRow = wall.row + wall.depth;
        // Reflect angle
        const velocity = angleToVector(physics.angle, physics.velocity);
        velocity.y = -velocity.y * physics.bounceStrength;
        const newAngleData = vectorToAngle(velocity);
        newPhysics.angle = newAngleData.angle;
        newPhysics.velocity = newAngleData.magnitude;
      } else if (minOverlap === overlapBottom) {
        // Hit bottom side of wall
        newRow = wall.row - depth;
        // Reflect angle
        const velocity = angleToVector(physics.angle, physics.velocity);
        velocity.y = -velocity.y * physics.bounceStrength;
        const newAngleData = vectorToAngle(velocity);
        newPhysics.angle = newAngleData.angle;
        newPhysics.velocity = newAngleData.magnitude;
      }

      newPhysics.active = true;
    }
  }
  
  return { row: newRow, col: newCol, physics: newPhysics };
}

// Function to detect and fix objects that are stuck in the air
export function detectAndFixStuckObjects(
  obj: { row: number, col: number, width: number, depth: number, physics: PhysicsProperties }
): PhysicsProperties {
  const physics = obj.physics;
  
  // Check if object is potentially stuck (above ground but not moving much)
  if (
    physics.height > 0.1 && // Object is above ground
    Math.abs(physics.verticalVelocity) < 0.2 && // Very little vertical movement
    physics.velocity < 0.2 // Very little horizontal movement
  ) {
    // Object appears to be stuck, apply a small downward force to help it fall
    return {
      ...physics,
      active: true,
      verticalVelocity: -1.0, // Apply downward velocity
      // Add a tiny random horizontal impulse to help break free from overlaps
      angle: Math.random() * 360,
      velocity: 0.5 + Math.random() * 0.5
    };
  }
  
  // Check for objects that have been above ground with minimal movement for too long
  // This is a more aggressive unstuck mechanism that should rarely be needed
  if (
    physics.height > 3 && // Significantly above ground
    Math.abs(physics.verticalVelocity) < 0.1 && // Almost no vertical movement
    physics.velocity < 0.1 // Almost no horizontal movement
  ) {
    // Force object to ground level with a reset
    return {
      ...physics,
      active: true,
      height: 0,
      verticalVelocity: 0,
      velocity: 0
    };
  }
  
  return physics;
}