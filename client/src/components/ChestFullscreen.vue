<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';
import ItemPreview from './ItemPreview.vue';

const gameStore = useGameStore();
const props = defineProps<{
  show: boolean;
  chestImage: string;
  items: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'action', action: string, itemId?: string): void;
}>();

// State to track which item is being hovered
const hoveredItemId = ref<string | null>(null);

// Map the item IDs to actual item objects using useItem
const mappedItems = computed(() => {
  return props.items.map(id => gameStore.useItem(id).value);
});

// Get the currently hovered item object
const hoveredItem = computed(() => {
  if (!hoveredItemId.value) return null;
  return gameStore.useItem(hoveredItemId.value).value;
});

const handleItemClick = (itemId: string) => {
  const targetInventory = `${gameStore.userId}:main`;

  // Clear the hovered item preview immediately when an item is clicked
  hoveredItemId.value = null;

  // Set up a one-time listener for the 'item-moved' event
  const listenerId = gameStore.addEventListener('item-moved', (data) => {
    // Check if this is the item we just moved
    if (data && data.itemId === itemId && data.targetInventoryId === targetInventory) {
      // Remove the listener since we only need it once
      gameStore.removeEventListener('item-moved', listenerId);
      
      // Close the chest fullscreen view
      emit('close');
      
      // Put the item in the player's hands
      gameStore.emitEvent('item-pickup', {
        id: data.itemId
      })
    }
  });

  // Move the item from chest to main inventory
  gameStore.moveItem(itemId, targetInventory);
};

const handleItemMouseEnter = (itemId: string) => {
  hoveredItemId.value = itemId;
};

const handleItemMouseLeave = () => {
  hoveredItemId.value = null;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || !props.show || !gameStore.hasFocus('chest-fullscreen')) {
    return;
  }
  emit('close');
};

let gainedFocusListenerId: string;
let lostFocusListenerId: string;

function handleGainedFocus() {
  window.addEventListener('keydown', handleKeydown);
}

function handleLostFocus() {
  window.removeEventListener('keydown', handleKeydown);
}

onMounted(() => {
  gainedFocusListenerId = gameStore.addEventListener('gained-focus:chest-fullscreen', handleGainedFocus);
  lostFocusListenerId = gameStore.addEventListener('lost-focus:chest-fullscreen', handleLostFocus);
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  gameStore.removeEventListener('gained-focus:chest-fullscreen', gainedFocusListenerId);
  gameStore.removeEventListener('lost-focus:chest-fullscreen', lostFocusListenerId);
  window.removeEventListener('keydown', handleKeydown);
});

// Watch for show prop changes to manage focus
watch(() => props.show, (newValue) => {
  if (newValue) {
    gameStore.pushFocus('chest-fullscreen');
  } else {
    gameStore.popFocus();
  }
});
</script>

<template>
  <div v-if="show" class="fullscreen-overlay">
    <div class="chest-container" :style="{ backgroundImage: `url(${chestImage})` }">
      <button class="close-button" @click="$emit('close')">Back</button>
      
      <!-- Item Preview Component -->
      <ItemPreview 
        :item="hoveredItem"
        position="absolute"
        bottom="55%"
        left="50%"
        transform="translateX(-50%)"
      />
      
      <div class="inventory-area">
        <div class="inventory-grid">
          <div 
            class="inventory-slot" 
            :class="{ 'has-item': item }" 
            v-for="item in mappedItems" 
            :key="item.id"
            @click="item && handleItemClick(item.id)"
            @mouseenter="item && handleItemMouseEnter(item.id)"
            @mouseleave="handleItemMouseLeave"
          >
            <div v-if="item" class="item-container" :class="getRarityClass(item.value)">
              <img :src="item.imageUrl" class="item-image" :alt="item.name" />
            </div>
          </div>
          <!-- Add empty slots to fill the grid if needed -->
          <div 
            class="inventory-slot" 
            v-for="n in Math.max(0, 21 - mappedItems.length)" 
            :key='n'
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.chest-container {
  position: relative;
  width: min(90vh, 90vw); /* Use the smaller of viewport width or height */
  height: min(90vh, 90vw); /* Match width to maintain square ratio */
  max-width: min(90vh, 1200px);
  max-height: min(90vh, 1200px);
  margin: auto;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
}

.close-button {
  position: absolute;
  top: 5%;
  left: 0px;
  margin-right: 5%;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10%;
  transition: background-color 0.3s;
  padding: 1%;
  z-index: 20;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.inventory-area {
  position: absolute;
  width: 58%;
  height: 24%;
  top: 47%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
  height: 100%;
}

.inventory-slot {
  background: transparent;
  border: 3px dashed rgb(113, 67, 31);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9em;
  transition: border-color 0.3s, background-color 0.3s;
  position: relative;
}

.inventory-slot.has-item {
  border: none;
}

.inventory-slot.has-item:hover .item-container {
  transform: scale(1.05);
  cursor: pointer;
}

.inventory-slot:hover {
  border-color: rgb(173, 127, 91);
  background-color: rgba(113, 67, 31, 0.2);
}

/* Item styles moved to main.css */

.item-name {
  font-size: 0.7em;
  color: white;
  text-align: center;
  margin-top: 4px;
  text-shadow: 1px 1px 2px black;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 90%;
}
</style>