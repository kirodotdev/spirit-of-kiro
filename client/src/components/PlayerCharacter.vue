<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { type PhysicsProperties } from '../utils/physics';
import GameItem from './GameItem.vue';
import ghostNorth from '../assets/ghost/north.png';
import ghostSouth from '../assets/ghost/south.png';
import ghostSouthwest from '../assets/ghost/southwest.png';

interface Props {
  id: string;
  row: number;
  col: number;
  tileSize: number;
  width: number;
  depth: number;
  height: number;
  playerIsNear: boolean;
  physics?: PhysicsProperties;
  props: any;
}

const MOVEMENT_IMPULSE = 10;
const THROW_IMPULSE = 15; // Stronger impulse for throwing items
const props = defineProps<Props>();

import { useGameStore } from '../stores/game';
const gameStore = useGameStore();

// Track pressed keys
// Shared state for key tracking
const pressedKeys = ref<Set<string>>(new Set());

// Track the currently held item
const heldItemId = ref<string | null>(null);
const heldItem = computed(() => {
  if (heldItemId.value) {
    return gameStore.itemsById.get(heldItemId.value);
  } else {
    return null
  }
})

// Determine CSS class based on item rarity, similar to GameItem.vue
const getRarityClass = computed(() => {
  if (!heldItem) return 'item-common';
  
  const value = heldItem.value.value;
  if (value > 1000) return 'item-legendary';
  if (value > 500) return 'item-epic';
  if (value > 250) return 'item-rare';
  if (value > 100) return 'item-uncommon';
  return 'item-common';
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (gameStore.interactionLocked) {
    return;
  }

  const key = e.key.toLowerCase();
  
  if (key === 't') {
    if (heldItemId.value) {
      // If holding an item, throw it
      throwHeldItem();
    }
    return;
  }
  
  if (key === 'e') {
    // Use for interaction only
    gameStore.emitEvent('player-interaction');
    return;
  }
  
  if (key === 'i') {
    if (heldItemId.value) {
      // If holding an item, inspect it
      gameStore.emitEvent('inspect-item', {
        id: heldItemId.value
      });
    }
    return;
  }

  if (['w', 'a', 's', 'd'].includes(key)) {
    pressedKeys.value.add(key);
    updateMovement();
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (gameStore.interactionLocked) {
    return;
  }

  const key = e.key.toLowerCase();
  if (['w', 'a', 's', 'd'].includes(key)) {
    pressedKeys.value.delete(key);
    if (pressedKeys.value.size > 0) {
      updateMovement();
    }
  }
};

// Handle item pickup event
const handleItemPickup = (data: any) => {
  console.log(`Request to pickup item ${data.id}`)
  heldItemId.value = data.id;
  
  // Emit hint event when item is picked up with HTML formatting
  gameStore.emitEvent('hint', {
    message: "<b>T</b> - Throw<br><b>I</b> - Inspect",
    duration: 0 // 0 means it stays until cleared
  });
};

// Throw the currently held item
const throwHeldItem = () => {
  if (!heldItemId.value) return;
  
  const item = heldItem.value;
  if (!item) return;

  let throwOffset = 0
  if (angle.value == 270) {
    throwOffset = 1;  // When throwing an item while facing back, offset it a bit
  }
  
  // Add the item back to the game world at the player's position
  // with the appropriate angle and velocity to seem thrown
  gameStore.addObject({
    id: heldItemId.value,
    type: GameItem,
    row: props.row + throwOffset,
    col: props.col + 1,
    width: 1,
    depth: 1,
    props: {
      itemId: heldItemId.value,
      pickedUp: true // Set pickedUp flag to true when throwing a held item
    },
    physics: {
      active: true,
      angle: angle.value,
      velocity: THROW_IMPULSE,
      friction: 2,
      height: 3, // Start a bit above ground
      verticalVelocity: 0,
      bounceStrength: 0.4,
      mass: 1.0
    }
  });
  
  // Clear the held item
  heldItemId.value = null;
  
  // Clear the hint when item is thrown
  gameStore.emitEvent('clear-hint');
};

// Computed property for current sprite
const currentSprite = computed(() => {
  const a = angle.value;
  if (a == 0) {
    return ghostSouthwest;  // West (mirrored)
  } else if (a > 0 && a < 90) {
    return ghostSouthwest; // Southeast (mirrored)
  } else if (a == 90) {
    return ghostSouth;
  } else if (a >= 90 && a < 180) {
    return ghostSouthwest;
  } else if (a == 180) {
    return ghostSouthwest;
  } else if (a > 180 && a < 270) {
    // As an optimization the northwest sprite is
    // a reused northeast sprite that will be mirrored
    return ghostSouthwest; // Northwest (mirrored)
  } else if (a == 270) {
    return ghostNorth;
  } else if (a > 270 && a < 360) {
    return ghostSouthwest; // Northeast
  }
});

const transform = computed(() => {
  let scaleX = 1;
  let rotation = 0;

  if (angle.value > 270 && angle.value < 360) {
    // This is the northwest sprite which is the same
    // sprite as the northeast sprite, but mirrored
    scaleX = -1;
  } else if (angle.value == 0) {
    // For west direction, we're using east.png but flipping it horizontally
    scaleX = -1;
  } else if (angle.value > 0 && angle.value < 90) {
    // For southeast sprite we use the same sprite as southwest
    // sprite, but mirrored.
    scaleX = -1;
  } else {
    scaleX = 1;
  }

  if (angle.value == 180) {
    // Left
    rotation = 15;
  } else if (angle.value == 0) {
    // Right
    rotation = 15;
  } if (angle.value > 270 && angle.value < 360) {
    // Up right
    rotation = 35;
  } else if (angle.value > 180 && angle.value < 270) {
    // Up left
    rotation = 35;
  }

  return { scaleX, rotation };
});

let angle = ref(90);

const updateMovement = () => {
  const keys = Array.from(pressedKeys.value);
  
  // Calculate angle based on pressed keys
  let shouldMove = true;

  if (keys.includes('w') && keys.includes('d')) {
    angle.value = 315; // up-right
  }
  else if (keys.includes('w') && keys.includes('a')) {
    angle.value = 225; // up-left
  }
  else if (keys.includes('s') && keys.includes('d')) {
    angle.value = 45; // down-right
  }
  else if (keys.includes('s') && keys.includes('a')) {
    angle.value = 135; // down-left
  }
  else if (keys.includes('w')) {
    angle.value = 270; // up
  }
  else if (keys.includes('s')) {
    angle.value = 90; // down
  }
  else if (keys.includes('a')) {
    angle.value = 180; // left
  }
  else if (keys.includes('d')) {
    angle.value = 0; // right
  }
  else shouldMove = false;

  if (shouldMove) {
    // Apply physics impulse
    gameStore.updateObjectPhysics(props.id, {
      active: true,
      angle: angle.value,
      velocity: MOVEMENT_IMPULSE,
      friction: 3, // High friction for responsive controls
      height: 0,
      verticalVelocity: 0,
      bounceStrength: 0.1,
      mass: 10.0
    });
  }
};

let itemPickupListenerId: string;

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  // Listen for item pickup events
  itemPickupListenerId = gameStore.addEventListener('item-pickup', handleItemPickup);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  pressedKeys.value.clear();
  
  // Remove event listener
  gameStore.removeEventListener('item-pickup', itemPickupListenerId);
});

</script>

<template>
  <div
    :id="props.id"
    :style="{
      position: 'absolute',
      top: `${row * tileSize}px`,
      left: `${col * tileSize}px`,
      width: `${tileSize}px`,
      height: `${tileSize}px`,
      border: gameStore.debug ? '1px solid red': 'none',
      display: 'flex',
      justifyContent: 'center'
    }">
    <!-- Height visualization line (only visible in debug mode) -->
    <div v-if="gameStore.debug" 
         class="height-line"
         :style="{
           position: 'absolute',
           left: '0',
           bottom: '0',
           width: '2px',
           height: `${height * tileSize}px`,
           backgroundColor: 'blue',
           zIndex: 1000
         }">
    </div>
    <!-- Held item display above player's head -->
    <div v-if="heldItem"
      class="held-item-container"
      :style="{
        position: 'absolute',
        width: `${tileSize}px`,
        height: `${tileSize}px`,
        top: `-${tileSize * 2}px`,
      }">
      <div class="item-container" :class="getRarityClass">
        <img 
          :src="heldItem.imageUrl || '/src/assets/generic.png'" 
          :alt="heldItem.name"
          class="held-item-image"
        />
      </div>
    </div>
    
    <!-- Drop shadow under player's feet -->
    <div
      class="player-shadow"
      :style="{
        position: 'absolute',
        bottom: `-0px`,
        width: `${tileSize * 0.7}px`,
        height: `${tileSize * 0.2}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '50%',
        filter: 'blur(3px)',
      }"
    ></div>
    
    <img
      :src="currentSprite"
      :style="{ 
        position: 'absolute',
        top: `-${tileSize}px`,
        margin: '0 auto',
        height: `${tileSize * 2}px`,
        '--scale-x': transform.scaleX,
        '--rotation': `${transform.rotation}deg`,
      }"
      class="ghost-container"
      alt="Ghost character"
    />
  </div>
</template>

<style scoped>
.held-item-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  position: relative;
}

.held-item-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 10px;
  transition: transform 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
  transform: scale(1.1);
  border: 2px solid #333;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.item-name {
  position: absolute;
  bottom: -24px;
  left: 0;
  width: 100%;
  color: white;
  font-size: 12px;
  text-align: center;
  padding: 4px;
  word-break: break-word;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* Apply different colors based on item rarity */
.item-common .item-name {
  color: #ffffff;
}

.item-uncommon .item-name {
  color: #4caf50;
}

.item-rare .item-name {
  color: #2196f3;
}

.item-epic .item-name {
  color: #9c27b0;
  text-shadow: 0 0 4px rgba(156, 39, 176, 0.6);
}

.item-legendary .item-name {
  color: #ff9800;
  text-shadow: 0 0 6px rgba(255, 152, 0, 0.8);
  animation: pulse-glow 2s infinite;
}

/* Apply rarity-based styling to held item images */
.item-common .held-item-image {
  border-color: #333;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.item-uncommon .held-item-image {
  border-color: #4caf50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
}

.item-rare .held-item-image {
  border-color: #2196f3;
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.3);
}

.item-epic .held-item-image {
  border-color: #9c27b0;
  box-shadow: 0 0 10px rgba(156, 39, 176, 0.3);
}

.item-legendary .held-item-image {
  border-color: #ff9800;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
  animation: image-pulse 2s infinite;
}

@keyframes pulse-glow {
  0% { text-shadow: 0 0 4px rgba(255, 152, 0, 0.6); }
  50% { text-shadow: 0 0 10px rgba(255, 152, 0, 0.9); }
  100% { text-shadow: 0 0 4px rgba(255, 152, 0, 0.6); }
}

@keyframes image-pulse {
  0% { box-shadow: 0 0 10px rgba(255, 152, 0, 0.3); }
  50% { box-shadow: 0 0 20px rgba(255, 152, 0, 0.6); }
  100% { box-shadow: 0 0 10px rgba(255, 152, 0, 0.3); }
}

.ghost-container {
  animation: ghost-bobbing 1s ease-in-out infinite;
  transform: scaleX(var(--scale-x, 1)) rotate(var(--rotation, 0));
}

@keyframes ghost-bobbing {
  0% { transform: scaleX(var(--scale-x, 1)) rotate(var(--rotation, 0)) translateY(0); }
  50% { transform: scaleX(var(--scale-x, 1)) rotate(var(--rotation, 0)) translateY(-8px); }
  100% { transform: scaleX(var(--scale-x, 1)) rotate(var(--rotation, 0)) translateY(0); }
}
</style>