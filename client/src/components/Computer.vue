<script setup lang="ts">
import computerImage from '../assets/computer.png';
import computerZoomImage from '../assets/computer-zoom.png';
import { useGameStore } from '../stores/game';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import ComputerFullscreen from './ComputerFullscreen.vue';
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

const inventoryName = "computer";
const inventory = gameStore.useInventory(inventoryName);

// Add maxCapacity constant
const maxCapacity = 21;

// Computed property to determine the color of each dot based on item rarity
const capacityDots = computed(() => {
  const dots = [];
  const items = inventory.value.map(id => gameStore.useItem(id).value);
  
  // Fill dots with items that exist in inventory
  for (let i = 0; i < Math.min(items.length, maxCapacity); i++) {
    const item = items[i];
    if (item) {
      const rarityClass = getRarityClass(item.value);
      dots.push({
        filled: true,
        rarityClass
      });
    }
  }
  
  // Fill remaining dots as empty
  for (let i = items.length; i < maxCapacity; i++) {
    dots.push({
      filled: false,
      rarityClass: 'empty'
    });
  }
  
  return dots;
});

const linkedInventory = computed(() => {
  return `${gameStore.userId}:${inventoryName}`
});

// Function to handle player interaction with the computer
const handlePlayerInteraction = () => {
  if (!props.playerIsNear) {
    return;
  }

  if (!gameStore.heldItemId) {
    showFullscreen.value = true;
    return;
  }
  
  // Check if player is holding an item
  if (gameStore.heldItemId) {
    // Drop the held item and open computer
    gameStore.emitEvent('drop-item', { itemId: gameStore.heldItemId });
    showFullscreen.value = true;
  }
};

function handleItemMoved(data: any) {
  if (!data) {
    return;
  }
   
  if (data.targetInventoryId === linkedInventory.value) {
    // Open the computer when an item is moved to it
    showFullscreen.value = true;
  }
}

let interactionListenerId: string;
let itemMovedListenerId: string;

onMounted(() => {
  interactionListenerId = gameStore.addEventListener('player-interaction', handlePlayerInteraction);
  itemMovedListenerId = gameStore.addEventListener('item-moved', handleItemMoved);
  // Pre-fetch discarded items when computer is mounted
  gameStore.peekDiscarded(21);
});

onUnmounted(() => {
  gameStore.removeEventListener('player-interaction', interactionListenerId);
  gameStore.removeEventListener('item-moved', itemMovedListenerId);
});

const closeFullscreen = () => {
  showFullscreen.value = false;
};
</script>

<template>
  <div>
    <!-- Regular computer view -->
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
        :src="computerImage" 
        :width="width * tileSize" 
        :style="{
          position: 'absolute',
          top: `-${tileSize * 1}px`
        }"
        :class="['computer', { 'computer-active': playerIsNear }]"
        alt="Computer"
      />

      <!-- Capacity display as grid of dots -->
      <div v-if="playerIsNear" class="capacity-grid">
        <div 
          v-for="(dot, index) in capacityDots" 
          :key="index" 
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

    <ComputerFullscreen
      :show="showFullscreen"
      :computer-image="computerZoomImage"
      :items="inventory"
      @close="closeFullscreen"
    />
  </div>
</template>

<style scoped>
.computer {
  filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.5));
  object-fit: contain;
  transition: filter 0.3s ease;
}

.computer-active {
  filter: drop-shadow(0 0 15px white);
}

.interact-prompt {
  position: absolute;
  top: calc(-.3 * v-bind(tileSize) * 1px);
  left: calc(2 * v-bind(tileSize) * 1px);
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
  top: -21.5%;
  left: 46.5%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: calc(0.05 * v-bind(tileSize) * 1px);
  width: calc(0.7 * v-bind(tileSize) * 1px);
}

.capacity-dot {
  width: calc(0.08 * v-bind(tileSize) * 1px);
  height: calc(0.08 * v-bind(tileSize) * 1px);
  border-radius: 50%;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.5);
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
</style> 