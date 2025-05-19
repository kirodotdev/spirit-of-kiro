<script setup lang="ts">
import workbenchImage from '../assets/workbench.png';
import workbenchZoomImage from '../assets/workbench-zoom.png';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';
import WorkbenchFullscreen from './WorkbenchFullscreen.vue';
import { getRarityClass } from '../utils/items';

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

// Add refs for both inventories
const workingInventory = ref<any[]>([]);
const toolsInventory = ref<any[]>([]);

// Add maxCapacity constants for both inventories
const workingMaxCapacity = 5;
const toolsMaxCapacity = 32;

// Create computed properties for capacity
const workingUsedCapacity = computed(() => {
  return workingInventory.value.length;
});

const toolsUsedCapacity = computed(() => {
  return toolsInventory.value.length;
});

// Computed property for working inventory capacity dots
const workingCapacityDots = computed(() => {
  const dots = [];
  
  // Fill dots with items that exist in inventory
  for (let i = 0; i < Math.min(workingInventory.value.length, workingMaxCapacity); i++) {
    const item = workingInventory.value[i];
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

// Define inventory names
const workingInventoryName = "workbench-working";
const toolsInventoryName = "workbench-tools";

// Create computed properties for linked inventories
const linkedWorkingInventory = computed(() => {
  return `${gameStore.userId}:${workingInventoryName}`;
});

const linkedToolsInventory = computed(() => {
  return `${gameStore.userId}:${toolsInventoryName}`;
});

function handlePlayerInteraction() {
  if (!props.playerIsNear) {
    return;
  }

  if (!gameStore.heldItemId) {
    showFullscreen.value = true;
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
    
    // Working inventory has space, move the held item to the working inventory
    gameStore.moveItem(
      gameStore.heldItemId,
      linkedWorkingInventory.value
    );
    
    // Remove the held item
    gameStore.heldItemId = null;
  }
}

// Handle inventory list response from server for working inventory
function handleWorkingInventoryList(data: any) {
  if (data && Array.isArray(data)) {
    workingInventory.value = data;
  }
}

// Handle inventory list response from server for tools inventory
function handleToolsInventoryList(data: any) {
  if (data && Array.isArray(data)) {
    toolsInventory.value = data;
  }
}

// Handle item-moved event
function handleItemMoved(data: any) {
  if (!data) {
    return;
  }
   
  if (data.targetInventoryId === linkedWorkingInventory.value) {
    // Refresh the inventory when an item is moved to the working inventory
    gameStore.listInventory(linkedWorkingInventory.value);

    // Open the workbench
    showFullscreen.value = true;
    return;
  }

  if (data.targetInventoryId === linkedToolsInventory.value) {
    // Refresh the inventory when an item is moved to the tools inventory
    gameStore.listInventory(linkedToolsInventory.value);
    return;
  }

  if (data.itemId) {
    // Check if the itemId exists in either local inventory
    const itemExistsInWorking = workingInventory.value.some(item => item.id === data.itemId);
    const itemExistsInTools = toolsInventory.value.some(item => item.id === data.itemId);
    
    if (itemExistsInWorking) {
      // Refresh the working inventory when the item is found in it
      gameStore.listInventory(linkedWorkingInventory.value);
    }
    
    if (itemExistsInTools) {
      // Refresh the tools inventory when the item is found in it
      gameStore.listInventory(linkedToolsInventory.value);
    }
  }
}

let interactionListenerId: string;
let workingInventoryListenerId: string;
let toolsInventoryListenerId: string;
let itemMovedListenerId: string;

onMounted(() => {
  interactionListenerId = gameStore.addEventListener('player-interaction', handlePlayerInteraction);
  workingInventoryListenerId = gameStore.addEventListener(`inventory-items:${workingInventoryName}`, handleWorkingInventoryList);
  toolsInventoryListenerId = gameStore.addEventListener(`inventory-items:${toolsInventoryName}`, handleToolsInventoryList);
  itemMovedListenerId = gameStore.addEventListener('item-moved', handleItemMoved);
  
  // Fetch both inventories when component mounts
  gameStore.listInventory(linkedWorkingInventory.value);
  gameStore.listInventory(linkedToolsInventory.value);
});

onUnmounted(() => {
  gameStore.removeEventListener('player-interaction', interactionListenerId);
  gameStore.removeEventListener(`inventory-items:${workingInventoryName}`, workingInventoryListenerId);
  gameStore.removeEventListener(`inventory-items:${toolsInventoryName}`, toolsInventoryListenerId);
  gameStore.removeEventListener('item-moved', itemMovedListenerId);
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
  top: 0;
  left: 30%;
  transform: translateX(-50%);
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: 1fr;
  width: calc(0.5 * v-bind(tileSize) * 1px);
}

.tools-grid {
  top: 0;
  right: 10%;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(4, 1fr);
  width: calc(0.8 * v-bind(tileSize) * 1px);
}

.capacity-dot {
  width: calc(0.08 * v-bind(tileSize) * 1px);
  height: calc(0.08 * v-bind(tileSize) * 1px);
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
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