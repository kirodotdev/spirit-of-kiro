<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';
import BuyPreview from './BuyPreview.vue';

const gameStore = useGameStore();
const props = defineProps<{
  show: boolean;
  computerImage: string;
  items: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'action', action: string, itemId?: string): void;
}>();

// State to track which item is being hovered
const hoveredItemId = ref<string | null>(null);
const hoveredItemPosition = ref({ x: 0, y: 0 });

// Map the item IDs to actual item objects using gameStore.itemsById
const mappedItems = computed(() => {
  return props.items
    .map(id => gameStore.itemsById.get(id))
    .filter(item => item !== undefined);
});

// Get the currently hovered item object
const hoveredItem = computed(() => {
  if (!hoveredItemId.value) return null;
  return gameStore.itemsById.get(hoveredItemId.value) || null;
});

const handleItemClick = (itemId: string) => {
  // Clear the hovered item preview immediately when an item is clicked
  hoveredItemId.value = null;

  // Buy the item from the discarded inventory
  gameStore.buyDiscarded(itemId);
};

const handleBuyResults = (data: any) => {
  if (!data || !data.itemId) return;
  
  // Close the computer fullscreen view
  emit('close');
  
  // Put the item in the player's hands
  gameStore.emitEvent('item-pickup', {
    id: data.itemId
  });
};

let buyResultsListenerId: string;

const handleItemMouseEnter = (itemId: string, event: MouseEvent) => {
  hoveredItemId.value = itemId;
  const target = event.currentTarget as HTMLElement;
  if (target) {
    const rect = target.getBoundingClientRect();
    hoveredItemPosition.value = {
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    };
  }
};

const handleItemMouseLeave = () => {
  hoveredItemId.value = null;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || !props.show || !gameStore.hasFocus('computer-fullscreen')) {
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
  gainedFocusListenerId = gameStore.addEventListener('gained-focus:computer-fullscreen', handleGainedFocus);
  lostFocusListenerId = gameStore.addEventListener('lost-focus:computer-fullscreen', handleLostFocus);
  window.addEventListener('keydown', handleKeydown);
  buyResultsListenerId = gameStore.addEventListener('buy-results', handleBuyResults);
});

onUnmounted(() => {
  gameStore.removeEventListener('gained-focus:computer-fullscreen', gainedFocusListenerId);
  gameStore.removeEventListener('lost-focus:computer-fullscreen', lostFocusListenerId);
  window.removeEventListener('keydown', handleKeydown);
  gameStore.removeEventListener('buy-results', buyResultsListenerId);
});

// Watch for show prop changes to manage focus
watch(() => props.show, (newValue) => {
  if (newValue) {
    gameStore.pushFocus('computer-fullscreen');
  } else {
    gameStore.popFocus();
  }
});

const handleReset = () => {
  // Emit peek-discarded event to fetch 21 items
  gameStore.peekDiscarded(21);
};
</script>

<template>
  <div v-if="show" class="fullscreen-overlay">
    <div class="computer-container" :style="{ backgroundImage: `url(${computerImage})` }">
      <button class="close-button" @click="$emit('close')">Back</button>
      
      <!-- Item Preview Component -->
      <BuyPreview 
        :item="hoveredItem"
        position="fixed"
        :style="{
          left: hoveredItemPosition.x + 'px',
          top: hoveredItemPosition.y + 'px',
          transform: 'translateX(-50%)'
        }"
      />
      <div v-if="hoveredItem" 
        class="item-tooltip"
        :class="getRarityClass(hoveredItem.value)"
        :style="{
          left: hoveredItemPosition.x + 'px',
          top: (hoveredItemPosition.y - 30) + 'px',
          transform: 'translateX(-50%)'
        }"
      >
        {{ hoveredItem.name }}
      </div>
      
      <div class="inventory-area">
        <div class="crt-wrapper">
          <div class="inventory-grid">
            <div 
              class="inventory-slot" 
              :class="{ 'has-item': item }" 
              v-for="item in mappedItems" 
              :key="item.id"
              @click="item && handleItemClick(item.id)"
              @mouseenter="(event) => item && handleItemMouseEnter(item.id, event)"
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
      <button class="reset-button" @click="handleReset">RESET</button>
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

.computer-container {
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
  width: 62.5%;
  height: 31%;
  top: 26.25%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.crt-wrapper {
  width: 100%;
  height: 100%;
  padding: 6% 5%;
  border-radius: 7%;
  position: relative;
  overflow: hidden;
}

.crt-wrapper::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(0, 0, 0, 0.1) 50%
  );
  background-size: 100% 4px;
  pointer-events: none;
  z-index: 11;
}

.crt-wrapper::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.1) 0%,
    transparent 50%,
    rgba(0, 0, 0, 0.1) 100%
  );
  background-size: 4px 100%;
  pointer-events: none;
  z-index: 11;
}

.crt-wrapper::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at center,
    transparent 0%,
    rgba(0, 0, 0, 0.2) 100%
  );
  pointer-events: none;
  z-index: 12;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
  height: 100%;
  filter: grayscale(100%);
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
  filter: grayscale(100%);
}

.inventory-slot:hover {
  border-color: rgb(173, 127, 91);
  background-color: rgba(113, 67, 31, 0.2);
}

.item-container {
  filter: grayscale(100%);
}

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

.reset-button {
  position: absolute;
  bottom: 16.5%;
  left: 26%;
  transform: translateX(-50%);
  background: #ff3333;
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 1.2em;
  font-weight: bold;
  text-transform: uppercase;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 
    0 6px 0 #cc0000,
    0 8px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.1s ease;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;
}

.reset-button:hover {
  transform: translateX(-50%) translateY(2px);
  box-shadow: 
    0 4px 0 #cc0000,
    0 6px 8px rgba(0, 0, 0, 0.3);
}

.reset-button:active {
  transform: translateX(-50%) translateY(6px);
  box-shadow: 
    0 0 0 #cc0000,
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.item-tooltip {
  position: fixed;
  background-color: rgba(40, 40, 40, 0.8);
  border-radius: 12px;
  padding: 4px 12px;
  color: white;
  font-size: 0.9em;
  font-weight: bold;
  white-space: nowrap;
  z-index: 30;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.item-tooltip.item-uncommon {
  color: #4caf50;
}

.item-tooltip.item-rare {
  color: #2196f3;
}

.item-tooltip.item-epic {
  color: #9c27b0;
}

.item-tooltip.item-legendary {
  color: #ff9800;
}
</style> 