<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';
import ItemPreview from './ItemPreview.vue';
import { getRarityClass } from '../utils/items';

const store = useGameStore();

// State
const visible = ref(false);
const isLoading = ref(true);
const sellData = ref<any>(null);
const result = ref<any>(null);

// State to track which item is being hovered
const hoveredItemId = ref<string | null>(null);
const hoveredItemElement = ref<HTMLElement | null>(null);
const hoveredItemPosition = ref({ x: 0, y: 0 });

// Get the currently hovered item object
const hoveredItem = computed(() => {
  if (!hoveredItemId.value) return null;
  return store.itemsById.get(hoveredItemId.value) || null;
});

// Handle mouse enter event for items
function handleItemMouseEnter(itemId: string, event: MouseEvent) {
  hoveredItemId.value = itemId;
  hoveredItemElement.value = event.currentTarget as HTMLElement;
  
  // Capture the position of the hovered item
  const target = event.currentTarget as HTMLElement;
  if (target) {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 300; // Approximate width of tooltip

    hoveredItemPosition.value = {
      x: rect.right + 10, // Position to the right of the item
      y: rect.top // Align with the top of the item
    };
    
    // Check if tooltip would go off-screen to the right
    if (hoveredItemPosition.value.x + tooltipWidth > window.innerWidth) {
      hoveredItemPosition.value.x = rect.left - tooltipWidth - 10; // Position to the left of the item
    }

    // Check if tooltip would go off-screen to the left
    if (hoveredItemPosition.value.x < 0) {
      hoveredItemPosition.value.x = 10;
    }
    
    // Check if tooltip would go off-screen at the bottom
    const tooltipHeight = 400; // Approximate height of tooltip
    if (hoveredItemPosition.value.y + tooltipHeight > window.innerHeight) {
      // Adjust y position to keep tooltip on screen
      hoveredItemPosition.value.y = window.innerHeight - tooltipHeight - 10;
    }
  }
}

// Handle mouse leave event for items
function handleItemMouseLeave() {
  hoveredItemId.value = null;
  hoveredItemElement.value = null;
}

function closeDialog() {
  if (isLoading.value) return;
  // Clear any hovered item preview when closing
  hoveredItemId.value = null;
  visible.value = false;
  store.interactionLocked = false;
}

// Handle keydown events
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value && !isLoading.value) {
    closeDialog();
  }
}

// Listen for events
let sellItemListenerId: string;
let itemSoldListenerId: string;

onMounted(() => {
  sellItemListenerId = store.addEventListener('sell-item', (data) => {
    if (data && data.id) {
      // Get the item data directly from the store using the ID
      const itemData = store.itemsById.get(data.id);
      if (itemData) {
        sellData.value = itemData;
        visible.value = true;
        isLoading.value = true;
        store.interactionLocked = true;
        
        // Remove the game object from the world
        store.removeObject(data.id);
        
        // Send sell-item request to server
        store.sellItem(data.id);
      }
    }
  });
  
  itemSoldListenerId = store.addEventListener('item-sold', (data) => {
    result.value = data;
    isLoading.value = false;
    // Clear any hovered item preview when the result comes back
    hoveredItemId.value = null;
  });
  
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  store.removeEventListener('sell-item', sellItemListenerId);
  store.removeEventListener('item-sold', itemSoldListenerId);
  window.removeEventListener('keydown', handleKeyDown);
  if (visible.value) {
    store.interactionLocked = false;
  }
});
</script>

<template>
  <div v-if="visible" class="sell-dialog-overlay">
    <div class="sell-dialog">
      <div class="dialog-header">
        <h2>Sell Item</h2>
        <button class="close-button" :disabled="isLoading" @click="closeDialog">×</button>
      </div>
      
      <!-- Loading state -->
      <div v-if="isLoading" class="dialog-content loading-content">
        <div class="item-container" v-if="sellData">
          <div class="item-wrapper" 
               :class="getRarityClass(sellData.value)"
               @mouseenter="(event) => handleItemMouseEnter(sellData.id, event)"
               @mouseleave="handleItemMouseLeave">
            <img :src="sellData.imageUrl" class="item-image" :alt="sellData.name" />
          </div>
        </div>
        <p class="processing-text">I'm appraising your item...</p>
        <div class="loading-spinner"></div>
      </div>
      
      <!-- Result state -->
      <div v-else class="dialog-content result-content">
        <div class="appraisal-container">
          <div class="item-display" v-if="sellData"
               @mouseenter="(event) => handleItemMouseEnter(sellData.id, event)"
               @mouseleave="handleItemMouseLeave">
            <div class="item-wrapper" :class="getRarityClass(sellData.value)">
              <img :src="sellData.imageUrl" class="item-image" :alt="sellData.name" />
            </div>
          </div>
          <div class="appraisal-details">
            <h3>Appraisal Results</h3>
            <div class="appraisal-info">
              <div class="appraisal-row">
                <span class="label">Base Value:</span>
                <span class="value">{{ result?.appraisal?.appraisal?.baseValue || 0 }} coins</span>
              </div>
              <div class="appraisal-row">
                <span class="label">Market Value:</span>
                <span class="value">{{ result?.appraisal?.appraisal?.marketValue || 0 }} coins</span>
              </div>
              <div class="appraisal-row">
                <span class="label">Condition:</span>
                <span class="value">{{ result?.appraisal?.appraisal?.condition || 'Unknown' }}</span>
              </div>
              <div class="appraisal-row explanation">
                <span class="label">Explanation:</span>
                <p>{{ result?.appraisal?.appraisal?.explanation || 'No explanation provided.' }}</p>
              </div>
              <div class="appraisal-row" v-if="result?.appraisal?.appraisal?.specialNotes">
                <span class="label">Special Notes:</span>
                <p>{{ result?.appraisal?.appraisal?.specialNotes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Item Preview Component -->
      <ItemPreview 
        v-if="hoveredItem && hoveredItemElement"
        :item="hoveredItem"
        :style="{
          position: 'fixed',
          left: `${hoveredItemPosition.x}px`,
          top: `${hoveredItemPosition.y}px`,
          maxHeight: '80vh',
          overflowY: 'auto'
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.sell-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.sell-dialog {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 2px solid #333;
  position: relative;
  overflow: visible; /* Allow the preview to stick out */
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #333;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: white;
}

.close-button {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-button:hover {
  color: white;
}

.close-button:disabled {
  color: #555;
  cursor: not-allowed;
}

.dialog-content {
  padding: 20px;
  color: #ddd;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.item-container {
  margin-bottom: 20px;
  cursor: pointer;
  transition: transform 0.2s;
}

.item-container:hover {
  transform: scale(1.05);
}

.item-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5px;
  transition: all 0.2s;
}

.item-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.processing-text {
  margin: 20px 0;
  color: #ddd;
  font-size: 1.1rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: #2196f3;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result-content {
  padding: 20px;
}

.appraisal-container {
  display: flex;
  gap: 20px;
}

.item-display {
  flex-shrink: 0;
}

.appraisal-details {
  flex-grow: 1;
}

.appraisal-details h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #fff;
  font-size: 1.3rem;
}

.appraisal-info {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 8px;
}

.appraisal-row {
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
}

.appraisal-row.explanation {
  flex-direction: column;
}

.appraisal-row .label {
  font-weight: bold;
  color: #aaa;
  width: 120px;
  flex-shrink: 0;
}

.appraisal-row .value {
  color: #ddd;
}

.appraisal-row p {
  margin: 5px 0 0;
  color: #ddd;
  line-height: 1.5;
}

</style>