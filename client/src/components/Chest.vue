<script setup lang="ts">
import chestImage from '../assets/chest.png';
import chestOpenImage from '../assets/chest-open.png';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';
import ChestFullscreen from './ChestFullscreen.vue';
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

const inventoryName = "chest1";
const inventory = gameStore.useInventory(inventoryName);

// Add maxCapacity constant
const maxCapacity = 21;

// Create computed property for usedCapacity
const usedCapacity = computed(() => {
  return inventory.value.length;
});

// Computed property to determine the color of each dot based on item rarity
const capacityDots = computed(() => {
  const dots = [];
  const items = inventory.value.map(id => gameStore.useItem(id).value).filter(Boolean);
  
  // Fill dots with items that exist in inventory
  for (let i = 0; i < Math.min(items.length, maxCapacity); i++) {
    const item = items[i];
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
    // Check if the chest is full before adding the item
    if (usedCapacity.value >= maxCapacity) {
      // Chest is full, emit drop-item event and open chest without adding item
      gameStore.emitEvent('drop-item', { itemId: gameStore.heldItemId });
      showFullscreen.value = true;
      return;
    }
    
    // Chest has space, move the held item to the chest inventory
    gameStore.moveItem(
      gameStore.heldItemId,
      linkedInventory.value
    );
    
    // Remove the held item
    gameStore.heldItemId = null;
  }
}

function handleItemMoved(data: any) {
  if (!data) {
    return;
  }
   
  if (data.targetInventoryId === linkedInventory.value) {
    // Open the chest when an item is moved to it
    showFullscreen.value = true;
  }
}

let interactionListenerId: string;
let itemMovedListenerId: string;

onMounted(() => {
  interactionListenerId = gameStore.addEventListener('player-interaction', handlePlayerInteraction);
  itemMovedListenerId = gameStore.addEventListener('item-moved', handleItemMoved);
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
    <!-- Regular chest view -->
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
        :src="chestImage" 
        :width="width * tileSize" 
        :style="{
          position: 'absolute',
          top: `-${tileSize * .5}px`
        }"
        :class="['chest', { 'chest-active': playerIsNear }]"
        alt="Chest"
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

    <ChestFullscreen
      :show="showFullscreen"
      :chest-image="chestOpenImage"
      :items="inventory"
      @close="closeFullscreen"
    />
  </div>
</template>

<style scoped>
.chest {
  filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.5));
  object-fit: contain;
  transition: filter 0.3s ease;
}

.chest-active {
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
  top: 0;
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