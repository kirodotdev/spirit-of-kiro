<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useGameStore } from '../stores/game';
import { useFocusManagement } from '../composables/useFocusManagement';
import ItemPreview from './ItemPreview.vue';
import { getRarityClass } from '../utils/items';
import sellTableImage from '../assets/sell-table.png';
import appraisingImage from '../assets/appraising.png';
import happyImage from '../assets/happy.png';
import unhappyImage from '../assets/unhappy.png';
import neutralImage from '../assets/neutral.png';
import type { Item } from '../systems/item-system';
import { useEscapeKeyHandler } from '../composables/useEscapeKeyHandler';

const store = useGameStore();

// State
const visible = ref(false);
const isLoading = ref(true);
const sellData = ref<Item | null>(null);
const result = ref<any>(null);

// State to track which item is being hovered
const hoveredItemId = ref<string | null>(null);
const hoveredItemElement = ref<HTMLElement | null>(null);
const hoveredItemPosition = ref({ x: 0, y: 0 });

// Get the currently hovered item object
const hoveredItem = computed(() => {
  if (!hoveredItemId.value) return null;
  return store.useItem(hoveredItemId.value).value;
});

// Handle mouse enter event for items
function handleItemMouseEnter(itemId: string | undefined, event: MouseEvent) {
  if (!itemId) return;
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
  // Emit gold update event with the sale amount
  if (result.value?.gold) {
    store.emitEvent('gold-update', { gold: result.value.gold });
  }
}

// Use the focus management composable
const { handleKeyDown } = useEscapeKeyHandler('sell-dialog', (event) => {
  if (event.key === 'Escape' && visible.value && !isLoading.value) {
    closeDialog();
    return true;
  }
  return false;
});

// Listen for events
let sellItemListenerId: string;
let itemSoldListenerId: string | null = null;

onMounted(() => {
  sellItemListenerId = store.addEventListener('sell-item', (data) => {
    if (data && data.id) {
      // Get the item data directly from the store using the ID
      const itemData = store.useItem(data.id);
      if (itemData) {
        sellData.value = itemData.value;
        visible.value = true;
        isLoading.value = true;
        
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
});

onUnmounted(() => {
  store.removeEventListener('sell-item', sellItemListenerId);
  if (itemSoldListenerId) {
    store.removeEventListener('item-sold', itemSoldListenerId);
  }
});

// Watch for changes to visible prop to manage focus
watch(() => visible.value, (newValue) => {
  if (newValue) {
    store.pushFocus('sell-dialog');
  } else {
    store.popFocus();
  }
});

function getHappinessText(happiness: number): string {
  if (happiness > 50) return 'Absolutely Thrilled!';
  if (happiness > 0) return 'Quite Pleased';
  if (happiness === 0) return 'Neutral';
  if (happiness > -50) return 'Disappointed';
  return 'Absolutely Disgusted';
}

function getAppraiserImage(happiness: number): string {
  if (happiness > 50) return happyImage;
  if (happiness < -20) return unhappyImage;
  return neutralImage;
}

function getAppraiserComment(happiness: number): string {
  if (happiness > 50) return "What an exceptional find!";
  if (happiness > 0) return "Not bad at all!";
  if (happiness === 0) return "Hmm, interesting...";
  if (happiness > -50) return "Well, it's something...";
  return "Oh my...";
}
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
               :class="getRarityClass(sellData?.value)"
               @mouseenter="(event) => handleItemMouseEnter(sellData?.id, event)"
               @mouseleave="handleItemMouseLeave">
            <img :src="sellData?.imageUrl" class="item-image" :alt="sellData?.name" />
          </div>
        </div>
      </div>
      
      <!-- Result state -->
      <div v-else class="dialog-content result-content">
        <div class="appraisal-container">
          <div class="appraising-container">
            <div class="chat-bubble">{{ getAppraiserComment(result?.appraisal?.appraisal?.happiness) }}</div>
            <img :src="getAppraiserImage(result?.appraisal?.appraisal?.happiness)" class="appraising-image" alt="Appraiser" />
          </div>
        </div>
        <div class="table-container">
          <img :src="sellTableImage" class="table-image" alt="Sell Table" />
        </div>
        <div class="preview-grid" v-if="sellData">
          <div class="item-wrapper" 
                :class="getRarityClass(sellData?.value)"
                @mouseenter="(event) => handleItemMouseEnter(sellData?.id, event)"
                @mouseleave="handleItemMouseLeave">
            <img :src="sellData?.imageUrl" class="item-image" :alt="sellData?.name" />
          </div>
        </div>
        <div class="appraisal-details">
          <div class="appraisal-row">
            <p class="value">{{ result?.appraisal?.appraisal?.analysis || 'No analysis provided.' }}</p>
          </div>
          <div class="appraisal-tags">
            <div class="tags-container">
              <div class="gold-tag">
                <div class="gold-icon"></div>
                <span class="gold-amount">{{ result?.appraisal?.appraisal?.saleAmount || 0 }}</span>
              </div>
              <div class="happiness-tag" :class="{
                'very-happy': result?.appraisal?.appraisal?.happiness > 50,
                'happy': result?.appraisal?.appraisal?.happiness > 0 && result?.appraisal?.appraisal?.happiness <= 50,
                'neutral': result?.appraisal?.appraisal?.happiness === 0,
                'unhappy': result?.appraisal?.appraisal?.happiness < 0 && result?.appraisal?.appraisal?.happiness >= -50,
                'very-unhappy': result?.appraisal?.appraisal?.happiness < -50
              }">
                {{ getHappinessText(result?.appraisal?.appraisal?.happiness) }}
              </div>
            </div>
            <button class="done-button" @click="closeDialog">Done</button>
          </div>
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
  z-index: 2;
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

/* Add animation for loading state */
.loading-content .item-wrapper {
  animation: itemFloat 3s ease-in-out infinite;
}

@keyframes itemFloat {
  0% {
    transform: perspective(2000px) rotateX(-25deg) rotateZ(2deg);
  }
  25% {
    transform: perspective(2000px) rotateX(25deg) rotateZ(-2deg);
  }
  50% {
    transform: perspective(2000px) rotateX(-25deg) rotateZ(2deg) rotateY(180deg);
  }
  75% {
    transform: perspective(2000px) rotateX(25deg) rotateZ(-2deg) rotateY(180deg);
  }
  100% {
    transform: perspective(2000px) rotateX(-25deg) rotateZ(2deg);
  }
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
  background-color: rgba(121, 75, 35);
  border-radius: 8px;
  left: 2.5%;
  width: 95.5%;
  top: 77%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  z-index: 3;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: .7vw solid rgba(50, 36, 20);
  padding: 15px;
  overflow: hidden;
}

.appraisal-row {
  width: 100%;
  margin-bottom: 12px;
}

.appraisal-row .value {
  color: #ddd;
  line-height: 1.4;
  font-size: 0.9rem;
  margin: 0;
  padding: 0;
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
}

.appraisal-tags {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.tags-container {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.gold-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.happiness-tag {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 500;
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.happiness-tag.very-happy {
  color: #4CAF50;
  border-color: rgba(76, 175, 80, 0.3);
}

.happiness-tag.happy {
  color: #8BC34A;
  border-color: rgba(139, 195, 74, 0.3);
}

.happiness-tag.neutral {
  color: #FFC107;
  border-color: rgba(255, 193, 7, 0.3);
}

.happiness-tag.unhappy {
  color: #FF9800;
  border-color: rgba(255, 152, 0, 0.3);
}

.happiness-tag.very-unhappy {
  color: #F44336;
  border-color: rgba(244, 67, 54, 0.3);
}

.gold-amount {
  font-size: 0.9rem;
  color: #ffd700;
  font-weight: 500;
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
  z-index: 1;
}

.chat-bubble {
  position: absolute;
  top: -40px;
  background-color: rgba(0, 0, 0, 0.7);
  color: #ddd;
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
  border-top: 10px solid rgba(0, 0, 0, 0.7);
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

.appraisal-header {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-appraisal-button {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;
  line-height: 1;
  transition: color 0.2s;
}

.close-appraisal-button:hover {
  color: white;
}

.done-button {
  padding: 8px 24px;
  background-color: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.4);
  border-radius: 20px;
  color: #4CAF50;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.done-button:hover {
  background-color: rgba(76, 175, 80, 0.3);
  border-color: rgba(76, 175, 80, 0.6);
  transform: translateY(-1px);
}

.done-button:active {
  transform: translateY(0);
}
</style>