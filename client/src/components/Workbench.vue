<script setup lang="ts">
import workbenchImage from '../assets/workbench.png';
import workbenchZoomImage from '../assets/workbench-zoom.png';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';
import WorkbenchFullscreen from './WorkbenchFullscreen.vue';
import { getRarityClass } from '../utils/items';
import GameItem from './GameItem.vue';

const props = defineProps<{
  row: number;
  col: number;
  tileSize: number;
  width: number;
  depth: number;
  height: number;
  playerIsNear: boolean;
}>();

const gameStore = useGameStore();
const showFullscreen = ref(false);

// Define inventory names
const workingInventoryName = "workbench-working";
const toolsInventoryName = "workbench-tools";

// Use the inventory system to get reactive references to the inventories
const workingInventoryIds = gameStore.useInventory(workingInventoryName);
const toolsInventoryIds = gameStore.useInventory(toolsInventoryName);

// Add maxCapacity constants for both inventories
const workingMaxCapacity = 5;
const toolsMaxCapacity = 32;

// Create computed properties for the actual inventory items
const workingInventory = computed(() => {
  return workingInventoryIds.value.map(id => gameStore.useItem(id).value);
});

const toolsInventory = computed(() => {
  return toolsInventoryIds.value.map(id => gameStore.useItem(id).value);
});

// Create computed properties for capacity
const workingUsedCapacity = computed(() => {
  return workingInventory.value.length;
});

// Computed property for working inventory capacity dots
const workingCapacityDots = computed(() => {
  const dots = [];
  
  // Fill dots with items that exist in inventory
  for (let i = 0; i < Math.min(workingInventory.value.length, workingMaxCapacity); i++) {
    const item = workingInventory.value[i];
    if (!item) {
      continue;
    }
    const rarityClass = getRarityClass(item.value);
    dots.push({
      filled: true,
      rarityClass
    });
  }
  
  // Fill remaining dots as empty
  for (let i = workingInventory.value.length; i < workingMaxCapacity; i++) {
    dots.push({
      filled: false,
      rarityClass: 'empty'
    });
  }
  
  return dots;
});

// Computed property for tools inventory capacity dots
const toolsCapacityDots = computed(() => {
  const dots = [];
  
  // Fill dots with items that exist in inventory
  for (let i = 0; i < Math.min(toolsInventory.value.length, toolsMaxCapacity); i++) {
    const item = toolsInventory.value[i];
    if (!item) {
      continue;
    }
    const rarityClass = getRarityClass(item.value);
    dots.push({
      filled: true,
      rarityClass
    });
  }
  
  // Fill remaining dots as empty
  for (let i = toolsInventory.value.length; i < toolsMaxCapacity; i++) {
    dots.push({
      filled: false,
      rarityClass: 'empty'
    });
  }
  
  return dots;
});

function handlePlayerInteraction() {
  if (!props.playerIsNear) {
    return;
  }

  if (!gameStore.heldItemId) {
    showFullscreen.value = true;
    gameStore.emitEvent('clean-workbench-results');
    return;
  }
  
  // Check if player is holding an item
  if (gameStore.heldItemId) {
    // Check if the working inventory is full before adding the item
    if (workingUsedCapacity.value >= workingMaxCapacity) {
      // Working inventory is full, emit drop-item event and open workbench without adding item
      gameStore.emitEvent('drop-item', { itemId: gameStore.heldItemId });
      showFullscreen.value = true;
      return;
    }
    
    // Working inventory has space, move the held item to the working inventory using the inventory system
    gameStore.moveItemToInventory(gameStore.heldItemId, workingInventoryName);
    
    // Remove the held item
    gameStore.heldItemId = null;
    showFullscreen.value = true;
    gameStore.emitEvent('clean-workbench-results');
  }
}

// Define constants for overflow item physics
const OVERFLOW_IMPULSE = 5; // Lower impulse than throwing

/**
 * Handle workbench overflow item event
 * Spawns an item below the workbench when triggered
 */
function handleWorkbenchOverflowItem(data: { itemId: string }) {
  if (!data.itemId) return;
  
  const item = gameStore.useItem(data.itemId).value;
  if (!item) return;

  // Add the item back to the game world at a position below the workbench
  // with appropriate physics settings
  gameStore.addObject({
    id: data.itemId,
    type: GameItem,
    row: props.row + props.depth, // Position below the workbench
    col: props.col + props.width / 2, // Center horizontally
    width: 1,
    depth: 1,
    props: {
      itemId: data.itemId,
      pickedUp: true
    },
    physics: {
      active: true,
      angle: 90, // Drop downward
      velocity: OVERFLOW_IMPULSE,
      friction: 2,
      height: 2, // Start a bit above ground
      verticalVelocity: 0,
      bounceStrength: 0.3,
      mass: 1.0
    }
  });
}

let interactionListenerId: string;
let overflowItemListenerId: string;

onMounted(() => {
  interactionListenerId = gameStore.addEventListener('player-interaction', handlePlayerInteraction);
  overflowItemListenerId = gameStore.addEventListener('workbench-overflow-item', handleWorkbenchOverflowItem);
});

onUnmounted(() => {
  gameStore.removeEventListener('player-interaction', interactionListenerId);
  gameStore.removeEventListener('workbench-overflow-item', overflowItemListenerId);
});

const closeFullscreen = () => {
  showFullscreen.value = false;
};
</script>

<template>
  <div>
    <!-- Regular workbench view -->
    <div :style="{
      position: 'absolute',
      top: `${row * tileSize}px`,
      left: `${col * tileSize}px`,
      width: `${width * tileSize}px`,
      height: `${depth * tileSize}px`,
      border: gameStore.debug ? '1px solid red': 'none'
    }">
      <div v-if="playerIsNear" class="interact-prompt">E</div>
      <img 
        :src="workbenchImage" 
        :width="width * tileSize" 
        :height="depth * tileSize"
        :class="['workbench', { 'workbench-active': playerIsNear }]"
        alt="Workbench"
      />
      
      <!-- Capacity display as grid of dots for working inventory -->
      <div v-if="playerIsNear" class="capacity-grid working-grid">
        <div 
          v-for="(dot, index) in workingCapacityDots" 
          :key="'working-'+index" 
          class="capacity-dot"
          :class="[dot.rarityClass]"
        ></div>
      </div>
      
      <!-- Capacity display as grid of dots for tools inventory -->
      <div v-if="playerIsNear" class="capacity-grid tools-grid">
        <div 
          v-for="(dot, index) in toolsCapacityDots" 
          :key="'tools-'+index" 
          class="capacity-dot"
          :class="[dot.rarityClass]"
        ></div>
      </div>
      
      <!-- Height visualization line (only visible in debug mode) -->
      <div v-if="gameStore.debug" class="height-line" :style="{
        position: 'absolute',
        left: '0',
        bottom: '0',
        width: '2px',
        height: `${height * tileSize}px`,
        backgroundColor: 'blue',
        zIndex: 1000
      }" />
    </div>

    <WorkbenchFullscreen
      :show="showFullscreen"
      :workbench-image="workbenchZoomImage"
      :tools-items="toolsInventory"
      :working-items="workingInventory"
      @close="closeFullscreen"
    />
  </div>
</template>

<style scoped>
.workbench {
  filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.5));
  object-fit: contain;
  transition: filter 0.3s ease;
}

.workbench-active {
  filter: drop-shadow(0 0 15px white);
}

.interact-prompt {
  position: absolute;
  top: calc(-1.1 * v-bind(tileSize) * 1px);
  left: 50%;
  transform: translateX(-50%);
  font-size: calc(0.5 * v-bind(tileSize) * 1px);
  font-weight: bold;
  color: white;
  text-shadow: 0 0 5px white;
  animation: pulse 1s infinite;
  background-color: black;
  padding: calc(0.1 * v-bind(tileSize) * 1px) calc(0.1 * v-bind(tileSize) * 1px);
  border-radius: calc(0.08 * v-bind(tileSize) * 1px);
  z-index: 1;
  line-height: 1;
}

.capacity-grid {
  position: absolute;
  display: grid;
  gap: calc(0.05 * v-bind(tileSize) * 1px);
}

.working-grid {
  top: 60%;
  left: 50%;
  transform: translateX(-50%);
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: 1fr;
  width: calc(1.5 * v-bind(tileSize) * 1px);
}

.tools-grid {
  top: 8%;
  left: 14%;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(4, 1fr);
  width: calc(1.9 * v-bind(tileSize) * 1px);
  row-gap: calc(.2 * v-bind(tileSize) * 1px);
}

.capacity-dot {
  width: calc(0.08 * v-bind(tileSize) * 1px);
  height: calc(0.08 * v-bind(tileSize) * 1px);
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

.working-grid .capacity-dot {
  width: calc(0.13 * v-bind(tileSize) * 1px);
  height: calc(0.13 * v-bind(tileSize) * 1px);
}

/* Dot colors based on item rarity */
.capacity-dot.empty {
  background-color: rgba(255, 255, 255, 0.3);
}

.capacity-dot.item-common {
  background-color: #ffffff;
}

.capacity-dot.item-uncommon {
  background-color: #4caf50;
}

.capacity-dot.item-rare {
  background-color: #2196f3;
}

.capacity-dot.item-epic {
  background-color: #9c27b0;
}

.capacity-dot.item-legendary {
  background-color: #ff9800;
  box-shadow: 0 0 4px rgba(255, 152, 0, 0.8);
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
</style>