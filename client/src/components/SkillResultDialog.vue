<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';
import ItemPreview from './ItemPreview.vue';
import { getRarityClass } from '../utils/items';

const store = useGameStore();

// State to track dialog visibility, loading state, and result data
const visible = ref(false);
const isLoading = ref(true);
const resultData = ref<any>(null);

// State to track which item is being hovered
const hoveredItemId = ref<string | null>(null);
// State to track if the tool is being hovered
const isToolHovered = ref(false);

// Get the workbench-results inventory using the useInventory composable
const workbenchResultsIds = store.useInventory('workbench-results');

// Computed properties for removed and output items
const removedItems = computed(() => {
  if (!resultData.value?.removedItemIds || !resultData.value.removedItemIds.length) {
    return [];
  }
  
  return resultData.value.removedItemIds.map((itemId: string) => {
    return store.itemsById.get(itemId);
  }).filter(Boolean); // Filter out any undefined items
});

// Get the actual item objects from the workbench-results inventory IDs
const workbenchResultItems = computed(() => {
  return workbenchResultsIds.value.map(itemId => store.itemsById.get(itemId)).filter(Boolean);
});

// Get the currently hovered item object
const hoveredItem = computed(() => {
  if (isToolHovered.value && resultData.value?.tool) {
    return resultData.value.tool;
  }
  if (!hoveredItemId.value) return null;
  return store.itemsById.get(hoveredItemId.value) || null;
});

// Handle mouse enter event for items
function handleItemMouseEnter(itemId: string) {
  hoveredItemId.value = itemId;
  isToolHovered.value = false;
}

// Handle mouse leave event for items
function handleItemMouseLeave() {
  hoveredItemId.value = null;
}

// Handle mouse enter event for tool
function handleToolMouseEnter() {
  isToolHovered.value = true;
}

// Handle mouse leave event for tool
function handleToolMouseLeave() {
  isToolHovered.value = false;
}

function closeDialog() {
  // Prevent closing the dialog while loading
  if (isLoading.value) {
    return;
  }
  // Emit clean-workbench-results event before closing
  store.emitEvent('clean-workbench-results');
  visible.value = false;
  store.interactionLocked = false;
}

// Function to handle keydown events
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value && !isLoading.value) {
    closeDialog();
  }
}

// Listen for skill events
let skillInvokedListenerId: string;
let skillResultListenerId: string;

onMounted(() => {
  // Listen for skill-invoked event to show loading state
  skillInvokedListenerId = store.addEventListener('skill-invoked', () => {
    visible.value = true;
    isLoading.value = true;
    store.interactionLocked = true;
  });
  
  // Listen for skill-result event to show result state
  skillResultListenerId = store.addEventListener('skill-results', (data) => {
    console.log('skill-result data', data);
    resultData.value = data;
    isLoading.value = false;
  });
  
  // Add event listener for keydown to handle Escape key
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  store.removeEventListener('skill-invoked', skillInvokedListenerId);
  store.removeEventListener('skill-results', skillResultListenerId);
  window.removeEventListener('keydown', handleKeyDown);
  if (visible.value) {
    store.interactionLocked = false;
  }
});
</script>

<template>
  <div v-if="visible" class="skill-result-overlay">
    <div class="skill-result-dialog">
      <div class="dialog-header">
        <h2>Skill Result</h2>
        <button class="close-button" :disabled="isLoading" @click="closeDialog">×</button>
      </div>
      
      <!-- Loading state -->
      <div v-if="isLoading" class="dialog-content loading-content">
        <div class="loading-spinner"></div>
        <p>Processing skill...</p>
      </div>
      
      <!-- Result state -->
      <div v-else class="dialog-content result-content">

        <!-- Story section -->
        <p class="story-text">{{ resultData?.story || 'Something unexpected happened...' }}</p>

        <!-- Tool used section -->
        <div v-if="resultData?.tool" class="tool-section">
          <h3>Tool:</h3>
          <div class="items-grid">
            <div 
              class="item-container"
              @mouseenter="handleToolMouseEnter"
              @mouseleave="handleToolMouseLeave"
            >
              <div class="item-wrapper" :class="getRarityClass(resultData.tool.value)">
                <img :src="resultData.tool.imageUrl || '/src/assets/generic.png'" class="item-image" :alt="resultData.tool.name" />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Lost section - showing removed items -->
        <div v-if="removedItems.length > 0" class="lost-section">
          <h3>Lost:</h3>
          <div class="items-grid">
            <div 
              v-for="item in removedItems" 
              :key="item.id" 
              class="item-container"
              @mouseenter="handleItemMouseEnter(item.id)"
              @mouseleave="handleItemMouseLeave"
            >
              <div class="item-wrapper" :class="getRarityClass(item.value)">
                <img :src="item.imageUrl" class="item-image" :alt="item.name" />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Results section - showing workbench results inventory items -->
        <div v-if="workbenchResultItems.length > 0" class="results-section">
          <h3>Gained:</h3>
          <div class="items-grid">
            <div 
              v-for="item in workbenchResultItems" 
              :key="item.id" 
              class="item-container"
              @mouseenter="handleItemMouseEnter(item.id)"
              @mouseleave="handleItemMouseLeave"
            >
              <div class="item-wrapper" :class="getRarityClass(item.value)">
                <img :src="item.imageUrl" class="item-image" :alt="item.name" />
              </div>
            </div>
          </div>
        </div>
        
        <!-- Item Preview Component -->
        <ItemPreview 
          :item="hoveredItem"
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
        />
        
        <!-- No items message -->
        <div v-if="!removedItems.length && !workbenchResultItems.length && !isLoading" class="no-items">
          <p>No items were affected by this skill.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Dialog Styles */
.skill-result-overlay {
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

.skill-result-dialog {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 2px solid #333;
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

/* Loading state styles */
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: #2196f3;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Result state styles */
.result-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.story-section {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 8px;
  border-left: 3px solid #2196f3;
}

.story-section h3 {
  margin-top: 0;
  color: #2196f3;
  font-size: 1.2rem;
}

.story-text {
  line-height: 1.6;
  font-size: 1rem;
  color: #ddd;
  white-space: pre-line; /* Preserves line breaks in the story text */
}

.results-section h3 {
  margin-bottom: 15px;
  color: #4caf50;
  font-size: 1.2rem;
}

.lost-section h3 {
  margin-bottom: 15px;
  color: #ff5252;
  font-size: 1.2rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.item-container {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: transform 0.2s;
}

.item-container:hover {
  transform: scale(1.05);
}

.item-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.3);
  border: 2px solid #333;
  padding: 5px;
  transition: all 0.2s;
}

.item-wrapper.item-common {
  border-color: #ffffff;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
}

.item-wrapper.item-uncommon {
  border-color: #4caf50;
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
}

.item-wrapper.item-rare {
  border-color: #2196f3;
  box-shadow: 0 0 5px rgba(33, 150, 243, 0.3);
}

.item-wrapper.item-epic {
  border-color: #9c27b0;
  box-shadow: 0 0 5px rgba(156, 39, 176, 0.3);
}

.item-wrapper.item-legendary {
  border-color: #ff9800;
  box-shadow: 0 0 5px rgba(255, 152, 0, 0.5);
}

.item-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.tool-section h3 {
  margin-bottom: 15px;
  color: #2196f3;
  font-size: 1.2rem;
}

.tool-used {
  margin-top: 5px;
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: #aaa;
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-icon-container {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.3);
  border: 2px solid #2196f3;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3px;
  box-shadow: 0 0 5px rgba(33, 150, 243, 0.3);
}

.tool-icon {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.tool-info {
  display: flex;
  flex-direction: column;
}

.tool-label {
  color: #2196f3;
  font-weight: bold;
}

.no-items {
  text-align: center;
  padding: 20px;
  color: #aaa;
  font-style: italic;
}
</style>