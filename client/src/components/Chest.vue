<script setup lang="ts">
import chestImage from '../assets/chest.png';
import chestOpenImage from '../assets/chest-open.png';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';
import ChestFullscreen from './ChestFullscreen.vue';

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
const localInventory = ref<any[]>([]);

const inventoryName = "chest1";
const linkedInventory = computed(() => {
  return `${gameStore.userId}:${inventoryName}`
})

function handlePlayerInteraction() {
  if (!props.playerIsNear) {
    return;
  }
  
  // Check if player is holding an item
  if (gameStore.heldItemId) {
    // Move the held item to the chest inventory
    gameStore.moveItem(
      gameStore.heldItemId,
      linkedInventory.value
    );
    
    // Reset the held item
    gameStore.heldItemId = null;
  }
  
  showFullscreen.value = true;
  
  // Refresh chest inventory when opened
  gameStore.listInventory(linkedInventory.value);
}

// Handle inventory list response from server
function handleInventoryList(data: any) {
  if (data && Array.isArray(data)) {
    localInventory.value = data;
  }
}

let interactionListenerId: string;
let inventoryListenerId: string;

onMounted(() => {
  interactionListenerId = gameStore.addEventListener('player-interaction', handlePlayerInteraction);
  inventoryListenerId = gameStore.addEventListener(`inventory-items:${inventoryName}`, handleInventoryList);
  
  // Fetch chest inventory when component mounts
  gameStore.listInventory(linkedInventory.value);
});

onUnmounted(() => {
  gameStore.removeEventListener('player-interaction', interactionListenerId);
  gameStore.removeEventListener(`inventory-items:${inventoryName}`, inventoryListenerId);
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
      :items="localInventory"
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

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
</style>