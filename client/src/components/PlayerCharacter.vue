<script setup lang="ts">
import { ref, onMounted, onUnmounted, onBeforeUnmount, computed, watch } from 'vue';
import { type PhysicsProperties } from '../utils/physics';
import GameItem from './GameItem.vue';
import ghostNorth from '../assets/kiro-ghost/north.png';
import ghostEast from '../assets/kiro-ghost/east.png';
import ghostSouth from '../assets/kiro-ghost/south.png';
import ghostSouthwest from '../assets/kiro-ghost/southwest.png';
import { storeToRefs } from 'pinia';
import { getRarityClass } from '../utils/items';

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
const { heldItemId } = storeToRefs(gameStore);

// Track pressed keys
// Shared state for key tracking
const pressedKeys = ref<Set<string>>(new Set());

// Function to clear all pressed keys
const clearPressedKeys = () => {
  pressedKeys.value.clear();
};

// Use the shared utility function for rarity class
const rarityClass = computed(() => {
  if (!heldItem.value) return getRarityClass();
  return getRarityClass(heldItem.value.value);
});

// Computed property for the held item
const heldItem = computed(() => {
  if (heldItemId.value) {
    return gameStore.itemsById.get(heldItemId.value);
  } else {
    return null;
  }
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
  if (heldItemId.value) {
    // If holding an item, throw it in order to pick up the new item.
    throwHeldItem();
  }

  console.log(`Pickup item ${data.id}`);
  heldItemId.value = data.id;
};

// Handle item discarded event
const handleItemDiscarded = (data: any) => {
  console.log(`Item discarded: ${data.itemId}`);
  // If the discarded item is the one we're holding, clear it
  if (heldItemId.value === data.itemId) {
    heldItemId.value = null;
  }
};

// Handle drop item event
const handleDropItem = (data: any) => {
  if (!heldItemId.value) return;
  
  // Check if the item ID in the event matches the held item
  if (data.itemId && data.itemId !== heldItemId.value) return;
  
  const item = heldItem.value;
  if (!item) return;

  // Add the item back to the game world at the player's position
  // with minimal velocity and physics settings
  gameStore.addObject({
    id: heldItemId.value,
    type: GameItem,
    row: props.row,
    col: props.col,
    width: 1,
    depth: 1,
    props: {
      itemId: heldItemId.value,
      pickedUp: true
    },
    physics: {
      active: true,
      angle: angle.value,
      velocity: 2, // Minimal velocity
      friction: 3,
      height: 1, // Lower height
      verticalVelocity: 0,
      bounceStrength: 0.2,
      mass: 1.0
    }
  });
  
  // Clear the held item
  heldItemId.value = null;
};

// Throw the currently held item
const throwHeldItem = () => {
  if (!heldItemId.value) return;
  
  const item = heldItem.value;
  if (!item) return;

  let throwOffset = 0;
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
};

// Computed property for current sprite
const currentSprite = computed(() => {
  const a = angle.value;
  if (a == 0) {
    return ghostEast;  // West (mirrored)
  } else if (a > 0 && a < 90) {
    return ghostSouthwest; // Southeast (mirrored)
  } else if (a == 90) {
    return ghostSouth;
  } else if (a >= 90 && a < 180) {
    return ghostSouthwest;
  } else if (a == 180) {
    return ghostEast;
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
  } else if (angle.value == 180) {
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
    //rotation = 15;
  } else if (angle.value == 0) {
    // Right
    ///rotation = 15;
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
let itemDiscardedListenerId: string;
let dropItemListenerId: string;

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', clearPressedKeys);
  
  // Listen for item pickup events
  itemPickupListenerId = gameStore.addEventListener('item-pickup', handleItemPickup);
  
  // Listen for item discarded events
  itemDiscardedListenerId = gameStore.addEventListener('item-discarded', handleItemDiscarded);
  
  // Listen for drop item events
  dropItemListenerId = gameStore.addEventListener('drop-item', handleDropItem);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('blur', clearPressedKeys);
  pressedKeys.value.clear();
  
  // Remove event listeners
  gameStore.removeEventListener('item-pickup', itemPickupListenerId);
  gameStore.removeEventListener('item-discarded', itemDiscardedListenerId);
  gameStore.removeEventListener('drop-item', dropItemListenerId);
});

onBeforeUnmount(() => {
  clearPressedKeys();
});

// Watch for changes to heldItemId
watch(() => heldItemId.value, (newValue) => {
  if (newValue) {
    // Player is now holding an item, show the hint
    gameStore.emitEvent('hint', {
      message: "<b>T</b> - Throw<br><b>I</b> - Inspect",
      duration: 0 // 0 means it stays until cleared
    });
  } else {
    // Player is no longer holding an item, clear the hint
    gameStore.emitEvent('clear-hint');
  }
}, { immediate: true });
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
      <div class="item-container ghost-glow" :class="rarityClass">
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
      class="ghost-container ghost-glow"
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
  transform: scale(1.1);
  animation: item-floating 1.2s ease-in-out infinite;
}

@keyframes item-floating {
  0% { transform: scale(1.1) translateY(0); }
  50% { transform: scale(1.1) translateY(-4px); }
  100% { transform: scale(1.1) translateY(0); }
}

.ghost-container {
  animation: ghost-bobbing 1s ease-in-out infinite;
  transform: scaleX(var(--scale-x, 1)) rotate(var(--rotation, 0));
}

.ghost-container.ghost-glow,
.item-container.ghost-glow {
  filter: drop-shadow(0 0 15px white);
}

@keyframes ghost-bobbing {
  0% { transform: scaleX(var(--scale-x, 1)) rotate(var(--rotation, 0)) translateY(0); }
  50% { transform: scaleX(var(--scale-x, 1)) rotate(var(--rotation, 0)) translateY(-8px); }
  100% { transform: scaleX(var(--scale-x, 1)) rotate(var(--rotation, 0)) translateY(0); }
}
</style>