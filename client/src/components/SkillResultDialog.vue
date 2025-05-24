<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';
import ItemPreview from './ItemPreview.vue';
import { getRarityClass } from '../utils/items';

const store = useGameStore();

// State to track dialog visibility, loading state, story state, and result data
const visible = ref(false);
const isLoading = ref(true);
const hasStory = ref(false);
const storyText = ref<string>('');
const resultData = ref<any>(null);

// State to track skill invocation details for the loading animation
const skillInvocationData = ref<{
  skill: any;
  tool: any;
  targets: any[];
} | null>(null);

// Animation state for the smashing animation - using fixed values now
// (animation speed increase functionality removed)

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
  store.popFocus(); // Remove skill-result-dialog from focus stack
  store.pushFocus('workbench'); // Restore focus to workbench
}

// Function to handle keydown events
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value && !isLoading.value && store.hasFocus('skill-result-dialog')) {
    closeDialog();
  }
}

// Listen for skill events
let skillInvokedListenerId: string;
let skillStoryListenerId: string;
let skillResultListenerId: string;

// Set fixed animation durations
function setAnimationDurations() {
  // Set fixed CSS variables for animation duration
  document.documentElement.style.setProperty('--smash-tool-duration', '3s');
  document.documentElement.style.setProperty('--smash-target-duration', '3s');
  document.documentElement.style.setProperty('--smash-skill-duration', '3s');
  document.documentElement.style.setProperty('--pulse-glow-duration', '2s');
}

onMounted(() => {
  // Listen for skill-invoked event to show loading state
  skillInvokedListenerId = store.addEventListener('skill-invoked', (data) => {
    visible.value = true;
    isLoading.value = true;
    hasStory.value = false;
    storyText.value = '';
    store.interactionLocked = true;
    store.pushFocus('skill-result-dialog');
    
    // Store the skill invocation data for the loading animation
    skillInvocationData.value = data;
    
    // Set fixed animation durations
    setAnimationDurations();
  });
  
  // Listen for skill-use-story event to show story state
  skillStoryListenerId = store.addEventListener('skill-use-story', (data) => {
    console.log('skill-use-story data', data);
    storyText.value = data.story;
    hasStory.value = true;
    isLoading.value = false;
  });
  
  // Listen for skill-results event to show result state
  skillResultListenerId = store.addEventListener('skill-results', (data) => {
    console.log('skill-result data', data);
    resultData.value = data;
    hasStory.value = false;
    isLoading.value = false;
  });
  
  // Add event listener for keydown to handle Escape key
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  store.removeEventListener('skill-invoked', skillInvokedListenerId);
  store.removeEventListener('skill-use-story', skillStoryListenerId);
  store.removeEventListener('skill-results', skillResultListenerId);
  window.removeEventListener('keydown', handleKeyDown);
  
  // Reset CSS variables
  document.documentElement.style.removeProperty('--smash-tool-duration');
  document.documentElement.style.removeProperty('--smash-target-duration');
  document.documentElement.style.removeProperty('--smash-skill-duration');
  document.documentElement.style.removeProperty('--pulse-glow-duration');
  
  // Always ensure focus and interaction lock are reset on unmount
  store.interactionLocked = false;
  store.popFocus(); // Remove skill-result-dialog from focus stack
  store.pushFocus('workbench'); // Restore focus to workbench
});
</script>

<template>
  <div v-if="visible" class="skill-result-overlay">
    <!-- Loading state - just the animation -->
    <div v-if="isLoading" class="loading-phase">
      <div class="skill-fusion-container">
        <!-- Tool item on the left -->
        <div v-if="skillInvocationData?.tool" class="fusion-item tool-item">
          <div class="item-wrapper" :class="getRarityClass(skillInvocationData.tool.value)">
            <img :src="skillInvocationData.tool.imageUrl || '/src/assets/generic.png'" class="item-image" :alt="skillInvocationData.tool.name" />
          </div>
          <div class="fusion-label">{{ skillInvocationData.tool.name }}</div>
        </div>
        
        <!-- Skill name in the center -->
        <div class="fusion-skill">
          <div class="skill-name">{{ skillInvocationData?.skill?.name || 'Skill' }}</div>
          <div class="fusion-label">Skill</div>
        </div>
        
        <!-- Target items on the right -->
        <template v-if="skillInvocationData?.targets">
          <div 
            v-for="(target, index) in skillInvocationData.targets" 
            :key="target.id"
            class="fusion-item target-item"
            :style="{
              '--target-index': index,
              '--total-targets': skillInvocationData.targets.length
            }"
          >
            <div class="item-wrapper" :class="getRarityClass(target.value)">
              <img :src="target.imageUrl || '/src/assets/generic.png'" class="item-image" :alt="target.name" />
            </div>
            <div class="fusion-label">{{ target.name }}</div>
          </div>
        </template>

        <!-- Fusion effect overlay -->
        <div class="fusion-effect"></div>
      </div>
    </div>
    
    <!-- Story state - mini dialog above animation -->
    <div v-else-if="hasStory" class="story-phase">
      <div class="story-dialog">
        <p class="story-text">{{ storyText }}</p>
        <div class="loading-footer">
          <div class="small-spinner"></div>
        </div>
      </div>
    </div>
    
    <!-- Result state - full dialog -->
    <div v-else class="skill-result-dialog">
      <div class="dialog-header">
        <h2>Results</h2>
        <button class="close-button" @click="closeDialog">×</button>
      </div>
      
      <div class="dialog-content">
        <!-- Story section -->
        <p class="story-text">{{ resultData?.story || 'Something unexpected happened...' }}</p>

        <div class="results-grid">
          <!-- Tool used section -->
          <div v-if="resultData?.tool" class="tool-section">
            <h3>Tool</h3>
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
          
          <!-- Lost section -->
          <div v-if="removedItems.length > 0" class="lost-section">
            <h3>Lost</h3>
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
          
          <!-- Results section -->
          <div v-if="workbenchResultItems.length > 0" class="results-section">
            <h3>Gained</h3>
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
        </div>
        
        <!-- Item Preview Component -->
        <ItemPreview 
          :item="hoveredItem"
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          style="z-index: 10000;"
        />
        
        <!-- No items message -->
        <div v-if="!removedItems.length && !workbenchResultItems.length" class="no-items">
          <p>No items were affected by this skill.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

/* Loading phase styles */
.loading-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Story phase styles */
.story-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
}

.story-dialog {
  background-color: rgba(26, 26, 26, 0.9);
  border-radius: 8px;
  padding: 20px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 1px solid #333;
}

/* Result dialog styles */
.skill-result-dialog {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 2px solid #333;
  position: relative;
  top: -20%; /* Move the dialog up by 20% */
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

.dialog-content {
  padding: 20px;
  color: #ddd;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Loading state styles */
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  position: relative;
}

.skill-fusion-container {
  position: relative;
  width: 100%;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 1000px;
}

:root {
  --smash-tool-duration: 3s;
  --smash-target-duration: 3s;
  --smash-skill-duration: 3s;
  --pulse-glow-duration: 2s;
}

.fusion-item {
  position: absolute;
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
  transition: transform 0.5s ease-out;
}

.tool-item {
  left: 25%;
  top: 50%;
  transform: translate(-50%, -50%);
  animation: tool-approach 3s ease-in-out infinite;
}

.target-item {
  right: 25%;
  top: 50%;
  transform: translate(50%, -50%);
  animation: target-approach 3s ease-in-out infinite;
  animation-delay: calc(var(--target-index) * 0.4s);
  top: calc(50% + (var(--target-index) - (var(--total-targets) - 1) / 2) * 60px);
}

.fusion-skill {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(33, 150, 243, 0.4);
  border: 2px solid #2196f3;
  border-radius: 8px;
  padding: 8px 15px;
  color: white;
  font-weight: bold;
  z-index: 3;
  animation: skill-pulse 3s ease-in-out infinite;
}

.fusion-effect {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0) 70%);
  z-index: 1;
  animation: fusion-pulse 3s ease-in-out infinite;
}

@keyframes tool-approach {
  0%, 100% {
    transform: translate(-50%, -50%) translateX(-100px);
    opacity: 1;
  }
  50% {
    transform: translate(-50%, -50%) translateX(0);
    opacity: 0.5;
  }
}

@keyframes target-approach {
  0%, 100% {
    transform: translate(50%, -50%) translateX(100px);
    opacity: 1;
  }
  50% {
    transform: translate(50%, -50%) translateX(0);
    opacity: 0.5;
  }
}

@keyframes skill-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    box-shadow: 0 0 20px rgba(33, 150, 243, 0.5);
    background-color: rgba(33, 150, 243, 0.4);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    box-shadow: 0 0 30px rgba(33, 150, 243, 0.7);
    background-color: rgba(33, 150, 243, 0.9);
  }
}

@keyframes fusion-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0.6;
  }
}

.fusion-label {
  margin-top: 4px;
  font-size: 0.8rem;
  color: #aaa;
  text-align: center;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.skill-name {
  font-size: 1.2rem;
  text-shadow: 0 0 8px rgba(33, 150, 243, 0.7);
  color: white;
}

.processing-text {
  margin-top: 20px;
  color: #ddd;
  font-size: 1.1rem;
  text-align: center;
}

.small-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: #2196f3;
  animation: spin 1s ease-in-out infinite;
  margin-right: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Story state styles */
.story-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 200px;
}

.loading-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  color: #aaa;
  font-size: 0.9rem;
}

/* Result state styles */
.result-content {
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  color: #ddd;
  padding: 20px;
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
  white-space: pre-line;
  margin-bottom: 20px;
}

.results-grid {
  display: flex;
  gap: 20px;
  justify-content: space-between;
}

.tool-section,
.lost-section,
.results-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tool-section h3,
.lost-section h3,
.results-section h3 {
  margin-bottom: 15px;
  font-size: 1.2rem;
  text-align: center;
}

.tool-section h3 {
  color: #2196f3;
}

.lost-section h3 {
  color: #ff5252;
}

.results-section h3 {
  color: #4caf50;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  margin-top: 10px;
  width: fit-content;
  margin-left: auto;
  margin-right: auto;
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
  padding: 0px;
  transition: all 0.2s;
}

.item-wrapper.item-common {
}

.item-wrapper.item-uncommon {
}

.item-wrapper.item-rare {
}

.item-wrapper.item-epic {
}

.item-wrapper.item-legendary {
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

.appraisal-details {
  position: absolute;
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 95%;
  height: 24%;
  top: 77%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 2px solid #333;
  padding: 15px;
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
</style>