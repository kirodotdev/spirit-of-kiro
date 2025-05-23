<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';
import ItemPreview from './ItemPreview.vue';
import { getRarityClass } from '../utils/items';
import sellTableImage from '../assets/sell-table.png';
import appraisingImage from '../assets/appraising.png';

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
let itemSoldListenerId: string | null = null;

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
  
  /*itemSoldListenerId = store.addEventListener('item-sold', (data) => {
    result.value = data;
    isLoading.value = false;
    // Clear any hovered item preview when the result comes back
    hoveredItemId.value = null;
  });*/
  
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  store.removeEventListener('sell-item', sellItemListenerId);
  if (itemSoldListenerId) {
    store.removeEventListener('item-sold', itemSoldListenerId);
  }
  window.removeEventListener('keydown', handleKeyDown);
  if (visible.value) {
    store.interactionLocked = false;
  }
});
</script>

<template>
  <div v-if="visible" class="sell-dialog-overlay">
    <div class="sell-dialog">
      <!-- Loading state -->
      <div v-if="isLoading" class="dialog-content loading-content">
        <div class="appraising-container">
          <div class="chat-bubble">Hmm... let's see</div>
          <img :src="appraisingImage" class="appraising-image" alt="Appraising" />
        </div>
        <div class="table-container">
          <img :src="sellTableImage" class="table-image" alt="Sell Table" />
        </div>
        <div class="preview-grid" v-if="sellData">
          <div class="item-wrapper" 
               :class="getRarityClass(sellData.value)"
               @mouseenter="(event) => handleItemMouseEnter(sellData.id, event)"
               @mouseleave="handleItemMouseLeave">
            <img :src="sellData.imageUrl" class="item-image" :alt="sellData.name" />
          </div>
        </div>
      </div>
      
      <!-- Result state -->
      <div v-else class="dialog-content result-content">
        <div class="appraisal-container">
          <div class="preview-grid" v-if="sellData">
            <div class="item-wrapper" 
                 :class="getRarityClass(sellData.value)"
                 @mouseenter="(event) => handleItemMouseEnter(sellData.id, event)"
                 @mouseleave="handleItemMouseLeave">
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
        <div class="table-container">
          <img :src="sellTableImage" class="table-image" alt="Sell Table" />
        </div>
      </div>
      
      <!-- Item Preview Component -->
      <ItemPreview 
        v-if="hoveredItem && hoveredItemElement"
        :item="hoveredItem"
        :style="{
          position: 'absolute',
          left: '50%',
          top: '10%',
          transform: 'translateX(-50%)',
          maxHeight: '40vh',
          overflowY: 'auto',
          zIndex: 4
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
  position: relative;
  width: min(90vh, 90vw);
  height: min(90vh, 90vw);
  max-width: min(90vh, 1200px);
  max-height: min(90vh, 1200px);
  margin: auto;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
}

.table-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.table-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.dialog-content {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 2;
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

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.preview-grid {
  position: absolute;
  width: 15%;
  height: 15%;
  top: 55%;
  left: 59%;
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  grid-template-rows: repeat(1, 1fr);
  gap: 10px;
  justify-items: center;
  align-items: center;
  z-index: 3;
  transform: perspective(400px) rotateX(25deg) rotateZ(-2deg);
  transform-origin: bottom center;
  filter: drop-shadow(0 10px 8px rgba(0, 0, 0, 0.3));
}

.preview-slot {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 3px dashed rgb(113, 67, 31);
  border-radius: 6px;
  transition: border-color 0.3s, background-color 0.3s;
}

.preview-slot:hover {
  border-color: rgb(173, 127, 91);
  background-color: rgba(113, 67, 31, 0.2);
}

.item-wrapper {
  width: 80%;
  height: 80%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5px;
  transition: all 0.2s;
  transform: perspective(2000px) rotateX(-25deg) rotateZ(2deg);
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.item-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transform: translateZ(20px);
  filter: drop-shadow(0 5px 3px rgba(0, 0, 0, 0.2));
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
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.appraisal-details {
  position: absolute;
  width: 58%;
  height: 24%;
  top: 47%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

.appraising-container {
  position: absolute;
  width: 40%;
  height: 40%;
  top: 23%;
  left: 42%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: float 2s ease-in-out infinite;
}

.chat-bubble {
  position: absolute;
  top: -40px;
  background-color: white;
  color: #333;
  padding: 10px 15px;
  border-radius: 15px;
  font-size: 1.2em;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  animation: fadeIn 0.5s ease-in;
}

.chat-bubble:after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid white;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.appraising-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-4%); }
  100% { transform: translateY(0); }
}

</style>