
export interface PhysicsProperties {
  angle: number;  // Angle in degrees
  velocity: number;  // Velocity in tiles per second
  friction: number;  // Friction coefficient between 0 and 1
  active: boolean;
  height: number;  // Current height above ground in tile units
  verticalVelocity: number;  // Vertical velocity in tile units per second
  bounceStrength: number;  // How much velocity is retained on bounce (0-1)
  mass: number;  // Mass of object for collision calculations
}

export interface CollisionSides {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export interface PhysicsState {
  position: {
    row: number;
    col: number;
  };
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  physics: PhysicsProperties;
}

export interface CollisionResult {
  colliding: boolean;
  horizontalOverlap: number;
  verticalOverlap: number;
  overlapDirection: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
}

export function checkCollisionWith(movingObjectStart: PhysicsState, movingObjectEnd: PhysicsState, targetObject: PhysicsState): CollisionResult {
  // Extract position and dimensions for the target object
  const targetLeft = targetObject.position.col;
  const targetRight = targetObject.position.col + targetObject.dimensions.width;
  const targetTop = targetObject.position.row;
  const targetBottom = targetObject.position.row + targetObject.dimensions.depth;

  // Extract start and end positions for the moving object
  const startLeft = movingObjectStart.position.col;
  const startRight = startLeft + movingObjectStart.dimensions.width;
  const startTop = movingObjectStart.position.row;
  const startBottom = startTop + movingObjectStart.dimensions.depth;

  const endLeft = movingObjectEnd.position.col;
  const endRight = endLeft + movingObjectEnd.dimensions.width;
  const endTop = movingObjectEnd.position.row;
  const endBottom = endTop + movingObjectEnd.dimensions.depth;

  // Check for height-based collision (if objects are at different heights)
  const movingHeight = movingObjectEnd.physics.height;
  const targetHeight = targetObject.physics.height;
  const movingMaxHeight = movingHeight + movingObjectEnd.dimensions.height;
  const targetMaxHeight = targetHeight + targetObject.dimensions.height;

  // If one object is above the other's maximum height, no collision
  if (movingHeight > targetMaxHeight || targetHeight > movingMaxHeight) {
    return {
      colliding: false,
      horizontalOverlap: 0,
      verticalOverlap: 0,
      overlapDirection: { top: false, bottom: false, left: false, right: false }
    };
  }

  // Determine direction of movement
  const movingRight = endLeft > startLeft;
  const movingDown = endTop > startTop;

  // Calculate current overlaps at the end position
  let horizontalOverlap = 0;
  let verticalOverlap = 0;

  // Calculate horizontal overlap at end position
  if (endRight > targetLeft && endLeft < targetRight) {
    horizontalOverlap = Math.min(endRight, targetRight) - Math.max(endLeft, targetLeft);
  }

  // Calculate vertical overlap at end position
  if (endBottom > targetTop && endTop < targetBottom) {
    verticalOverlap = Math.min(endBottom, targetBottom) - Math.max(endTop, targetTop);
  }

  // Initialize collision sides
  const overlapDirection = {
    left: false,
    right: false,
    top: false,
    bottom: false
  };

  // Check if there's a collision at the end position
  const isColliding = horizontalOverlap > 0 && verticalOverlap > 0;

  if (isColliding) {
    // Determine which sides were hit based on movement direction

    // Moving right and hit the left side of target
    if (movingRight && startRight <= targetLeft && endRight > targetLeft) {
      overlapDirection.right = true;
      horizontalOverlap = endRight - targetLeft;
    }
    // Moving left and hit the right side of target
    else if (!movingRight && startLeft >= targetRight && endLeft < targetRight) {
      overlapDirection.left = true;
      horizontalOverlap = targetRight - endLeft;
    }
    // Object moved entirely inside target horizontally or was already overlapping
    else if (endLeft >= targetLeft && endRight <= targetRight) {
      // Determine which side is closer based on movement direction
      if (movingRight) {
        overlapDirection.right = true;
        horizontalOverlap = endRight - targetLeft;
      } else {
        overlapDirection.left = true;
        horizontalOverlap = targetRight - endLeft;
      }
    }
    // Object partially overlaps target horizontally
    else {
      // Determine which side has more overlap
      const leftOverlap = endRight - targetLeft;
      const rightOverlap = targetRight - endLeft;

      if (leftOverlap < rightOverlap) {
        overlapDirection.right = true;
        horizontalOverlap = leftOverlap;
      } else {
        overlapDirection.left = true;
        horizontalOverlap = rightOverlap;
      }
    }

    // Moving down and hit the top side of target
    if (movingDown && startBottom <= targetTop && endBottom > targetTop) {
      overlapDirection.bottom = true;
      verticalOverlap = endBottom - targetTop;
    }
    // Moving up and hit the bottom side of target
    else if (!movingDown && startTop >= targetBottom && endTop < targetBottom) {
      overlapDirection.top = true;
      verticalOverlap = targetBottom - endTop;
    }
    // Object moved entirely inside target vertically or was already overlapping
    else if (endTop >= targetTop && endBottom <= targetBottom) {
      // Determine which side is closer based on movement direction
      if (movingDown) {
        overlapDirection.bottom = true;
        verticalOverlap = endBottom - targetTop;
      } else {
        overlapDirection.top = true;
        verticalOverlap = targetBottom - endTop;
      }
    }
    // Object partially overlaps target vertically
    else {
      // Determine which side has more overlap
      const topOverlap = endBottom - targetTop;
      const bottomOverlap = targetBottom - endTop;

      if (topOverlap < bottomOverlap) {
        overlapDirection.bottom = true;
        verticalOverlap = topOverlap;
      } else {
        overlapDirection.top = true;
        verticalOverlap = bottomOverlap;
      }
    }

    // For objects that moved entirely inside the target, determine the smallest overlap
    // to provide the most efficient way to move the object back outside
    if (endLeft > targetLeft && endRight < targetRight &&
      endTop > targetTop && endBottom < targetBottom) {

      // Find the smallest overlap to determine which side was hit first
      const overlaps = [
        { side: 'left', value: targetRight - endLeft },
        { side: 'right', value: endRight - targetLeft },
        { side: 'top', value: targetBottom - endTop },
        { side: 'bottom', value: endBottom - targetTop }
      ];

      // Sort by smallest overlap
      overlaps.sort((a, b) => a.value - b.value);

      // Reset all directions
      overlapDirection.left = false;
      overlapDirection.right = false;
      overlapDirection.top = false;
      overlapDirection.bottom = false;

      // Set only the direction with smallest overlap
      const smallestOverlap = overlaps[0];
      if (smallestOverlap.side === 'left') {
        overlapDirection.left = true;
        horizontalOverlap = smallestOverlap.value;
        verticalOverlap = 0;
      } else if (smallestOverlap.side === 'right') {
        overlapDirection.right = true;
        horizontalOverlap = smallestOverlap.value;
        verticalOverlap = 0;
      } else if (smallestOverlap.side === 'top') {
        overlapDirection.top = true;
        verticalOverlap = smallestOverlap.value;
        horizontalOverlap = 0;
      } else if (smallestOverlap.side === 'bottom') {
        overlapDirection.bottom = true;
        verticalOverlap = smallestOverlap.value;
        horizontalOverlap = 0;
      }
    }
  }

  // Return collision data
  return {
    colliding: isColliding,
    horizontalOverlap,
    verticalOverlap,
    overlapDirection
  };
}

export function resolveCollision(obj1: PhysicsState, obj2: PhysicsState): [PhysicsState, PhysicsState] {
  // Get collision information
  // Since resolveCollision is used for objects that are already colliding,
  // we use the same state for start and end positions
  const collisionResult = checkCollisionWith(obj1, obj1, obj2);

  // Calculate collision normal
  const dx = obj2.position.col - obj1.position.col;
  const dy = obj2.position.row - obj1.position.row;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Avoid division by zero
  const nx = distance > 0 ? dx / distance : 0;
  const ny = distance > 0 ? dy / distance : 0;

  // Convert angles to velocity components
  const angle1 = obj1.physics.angle * (Math.PI / 180);
  const angle2 = obj2.physics.angle * (Math.PI / 180);

  const v1x = obj1.physics.velocity * Math.cos(angle1);
  const v1y = obj1.physics.velocity * Math.sin(angle1);
  const v2x = obj2.physics.velocity * Math.cos(angle2);
  const v2y = obj2.physics.velocity * Math.sin(angle2);

  // Calculate relative velocity
  const rvx = v2x - v1x;
  const rvy = v2y - v1y;
  const velAlongNormal = rvx * nx + rvy * ny;

  // Calculate restitution (using bounce strength)
  const restitution = Math.min(obj1.physics.bounceStrength, obj2.physics.bounceStrength);

  // Calculate masses
  const m1 = obj1.physics.mass || 1;
  const m2 = obj2.physics.mass || 1;

  let newV1x = v1x;
  let newV1y = v1y;
  let newV2x = v2x;
  let newV2y = v2y;

  // Handle separation based on overlap information
  if (collisionResult.colliding) {
    // Determine which direction has the smallest overlap
    const isHorizontalOverlapSmaller = collisionResult.horizontalOverlap < collisionResult.verticalOverlap;

    // Calculate separation vector based on overlap direction
    let sepX = 0;
    let sepY = 0;

    if (isHorizontalOverlapSmaller) {
      // Horizontal separation
      sepX = collisionResult.horizontalOverlap * (collisionResult.overlapDirection.left ? -1 : 1);
    } else {
      // Vertical separation
      sepY = collisionResult.verticalOverlap * (collisionResult.overlapDirection.top ? -1 : 1);
    }

    // Apply separation force based on mass ratio
    const totalMass = m1 + m2;
    const m1Ratio = m2 / totalMass;
    const m2Ratio = m1 / totalMass;

    // Calculate separation velocity components
    const separationStrength = 2.0;
    const sep1x = -sepX * separationStrength * m1Ratio;
    const sep1y = -sepY * separationStrength * m1Ratio;
    const sep2x = sepX * separationStrength * m2Ratio;
    const sep2y = sepY * separationStrength * m2Ratio;

    // Apply separation velocity
    newV1x += sep1x;
    newV1y += sep1y;
    newV2x += sep2x;
    newV2y += sep2y;
  }

  // Only apply collision response if objects are moving towards each other
  if (velAlongNormal < 0) {
    // Calculate impulse
    const j = -(1 + restitution) * velAlongNormal / (1 / m1 + 1 / m2);
    const impulseX = j * nx;
    const impulseY = j * ny;

    newV1x -= (impulseX / m1);
    newV1y -= (impulseY / m1);
    newV2x += (impulseX / m2);
    newV2y += (impulseY / m2);
  }

  // Convert back to angle/velocity format
  const newObj1 = {
    ...obj1,
    position: {
      row: obj1.position.row,
      col: obj1.position.col
    },
    physics: {
      ...obj1.physics,
      angle: Math.atan2(newV1y, newV1x) * (180 / Math.PI),
      velocity: Math.sqrt(newV1x * newV1x + newV1y * newV1y),
    }
  };

  const newObj2 = {
    ...obj2,
    position: {
      row: obj2.position.row,
      col: obj2.position.col
    },
    physics: {
      ...obj2.physics,
      angle: Math.atan2(newV2y, newV2x) * (180 / Math.PI),
      velocity: Math.sqrt(newV2x * newV2x + newV2y * newV2y),
    }
  };

  // Apply position adjustments to prevent overlap
  if (collisionResult.colliding) {
    // Determine which direction has the smallest overlap
    const isHorizontalOverlapSmaller = collisionResult.horizontalOverlap < collisionResult.verticalOverlap;

    // Calculate position adjustments based on mass ratio
    const totalMass = m1 + m2;
    const m1Ratio = m2 / totalMass;
    const m2Ratio = m1 / totalMass;

    if (isHorizontalOverlapSmaller) {
      // Horizontal adjustment
      const adjustment = collisionResult.horizontalOverlap * 1.05; // Add a small buffer
      if (collisionResult.overlapDirection.left) {
        newObj1.position.col += adjustment * m1Ratio;
        newObj2.position.col -= adjustment * m2Ratio;
      } else {
        newObj1.position.col -= adjustment * m1Ratio;
        newObj2.position.col += adjustment * m2Ratio;
      }
    } else {
      // Vertical adjustment
      const adjustment = collisionResult.verticalOverlap * 1.05; // Add a small buffer
      if (collisionResult.overlapDirection.top) {
        newObj1.position.row += adjustment * m1Ratio;
        newObj2.position.row -= adjustment * m2Ratio;
      } else {
        newObj1.position.row -= adjustment * m1Ratio;
        newObj2.position.row += adjustment * m2Ratio;
      }
    }
  }

  // Update active states
  newObj1.physics.active = newObj1.physics.velocity > 0 || newObj1.physics.verticalVelocity > 0 || newObj1.physics.height > 0;
  newObj2.physics.active = newObj2.physics.velocity > 0 || newObj2.physics.verticalVelocity > 0 || newObj2.physics.height > 0;

  return [newObj1, newObj2];
}

export function updatePhysics(state: PhysicsState, deltaTime: number): PhysicsState {
  if (!state.physics.active) {
    return state;
  }

  const gravity = 9.8; // 9 tiles per second 
  const deltaSeconds = deltaTime / 1000;

  // Convert angle to radians
  const angleRad = state.physics.angle * (Math.PI / 180);

  // Apply friction to horizontal velocity
  const frictionFactor = Math.pow(1 - state.physics.friction, deltaSeconds);
  let newVelocity = state.physics.velocity * frictionFactor;

  // Stop horizontal velocity once object slows enough
  if (newVelocity < .25) {
    newVelocity = 0;
  }

  // Calculate lateral velocity components
  const velocityX = newVelocity * Math.cos(angleRad);
  const velocityY = newVelocity * Math.sin(angleRad);

  // Update vertical motion with gravity
  let newHeight = 0;
  let newVerticalVelocity = 0;
  if (state.physics.height >= 0) {
    newVerticalVelocity = state.physics.verticalVelocity - gravity * deltaSeconds;
    newHeight = state.physics.height + newVerticalVelocity * deltaSeconds;

    // Handle bouncing off the ground
    if (newHeight <= 0) {
      newHeight = 0;
      newVerticalVelocity = -newVerticalVelocity * state.physics.bounceStrength;

      // If bounce is too weak, stop vertical motion and set height to 0
      if (Math.abs(newVerticalVelocity) < .25) {
        newVerticalVelocity = 0;
        newHeight = 0;
      }
    }
  }

  // Anti infinite bounce
  if (newHeight < .01 && Math.abs(newVerticalVelocity) < .01) {
    newVerticalVelocity = 0;
    newHeight = 0;
  }

  // Calculate proposed new position
  const proposedPosition = {
    row: state.position.row + (velocityY * deltaSeconds),
    col: state.position.col + (velocityX * deltaSeconds)
  };

  // The actual new position will be validated against collisions
  const newPosition = {
    row: proposedPosition.row,
    col: proposedPosition.col
  };

  // Check if object has essentially stopped moving
  const isMoving = newVelocity > 0 || Math.abs(newVerticalVelocity) > 0 || newHeight > 0;

  return {
    position: newPosition,
    dimensions: state.dimensions,
    physics: {
      ...state.physics,
      velocity: newVelocity,
      height: newHeight,
      verticalVelocity: newVerticalVelocity,
      active: isMoving
    }
  };
}
