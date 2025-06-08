<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useGameStore } from '../stores/game';
import ItemPreview from './ItemPreview.vue';
import { getRarityClass } from '../utils/items';

const store = useGameStore();

// State to track dialog visibility, loading state, story state, and result data
const visible = ref(false);
const isLoading = ref(true);
const storyText = ref<string>('');
const isComplete = ref(false);
const displayedStoryText = ref<string>('');
const resultData = ref<{
  tool: any;
  removedItemIds: string[];
  story: string;
}>({
  tool: null,
  removedItemIds: [],
  story: ''
});

// State to track skill invocation details for the loading animation
const skillInvocationData = ref<{
  skill: any;
  tool: any;
  targets: any[];
} | null>(null);

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
  
  return resultData.value.removedItemIds
    .map((itemId: string) => store.itemsById.get(itemId))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);
});

// Get the actual item objects from the workbench-results inventory IDs
const workbenchResultItems = computed(() => {
  return workbenchResultsIds.value
    .map(itemId => store.itemsById.get(itemId))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);
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
  if (isLoading.value || !isComplete.value) {
    return;
  }
  store.emitEvent('clean-workbench-results');
  visible.value = false;
}

// Function to handle keydown events
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value && !isLoading.value && isComplete.value && store.hasFocus('skill-use')) {
    event.stopPropagation();
    closeDialog();
  }
}

// Listen for skill events
let skillInvokedListenerId: string;
let skillStoryListenerId: string;
let skillToolUpdateListenerId: string;
let skillNewItemListenerId: string;
let skillUpdatedItemListenerId: string;
let skillRemovedItemListenerId: string;
let useSkillDoneListenerId: string;

// Add typing animation logic
const startTypingAnimation = (text: string) => {
  const words = text.split(' ');
  let currentIndex = 0;
  displayedStoryText.value = '';
  
  const typeNextWord = () => {
    if (currentIndex < words.length) {
      displayedStoryText.value += (currentIndex > 0 ? ' ' : '') + words[currentIndex];
      currentIndex++;
      setTimeout(typeNextWord, 50); // 20 words per second = 50ms per word
    }
  };
  
  typeNextWord();
};

onMounted(() => {
  skillInvokedListenerId = store.addEventListener('skill-invoked', (data) => {
    visible.value = true;
    isLoading.value = true;
    isComplete.value = false;
    storyText.value = '';
    displayedStoryText.value = '';
    resultData.value = {
      tool: null,
      removedItemIds: [],
      story: ''
    };
    skillInvocationData.value = data;
  });
  
  skillStoryListenerId = store.addEventListener('skill-use-story', (data) => {
    storyText.value = data.story;
    resultData.value.story = data.story;
    isLoading.value = false;
    startTypingAnimation(data.story);
  });
  
  skillToolUpdateListenerId = store.addEventListener('skill-use-tool-update', (data) => {
    resultData.value.tool = data.tool;
    isLoading.value = false;
  });
  
  skillNewItemListenerId = store.addEventListener('skill-use-new-item', (data) => {
    isLoading.value = false;
  });
  
  skillUpdatedItemListenerId = store.addEventListener('skill-use-updated-item', (data) => {
    isLoading.value = false;
  });
  
  skillRemovedItemListenerId = store.addEventListener('skill-use-removed-item', (data) => {
    resultData.value.removedItemIds.push(data.itemId);
    isLoading.value = false;
  });
  
  useSkillDoneListenerId = store.addEventListener('skill-use-done', () => {
    isComplete.value = true;
  });
  
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  store.removeEventListener('skill-invoked', skillInvokedListenerId);
  store.removeEventListener('skill-use-story', skillStoryListenerId);
  store.removeEventListener('skill-use-tool-update', skillToolUpdateListenerId);
  store.removeEventListener('skill-use-new-item', skillNewItemListenerId);
  store.removeEventListener('skill-use-updated-item', skillUpdatedItemListenerId);
  store.removeEventListener('skill-use-removed-item', skillRemovedItemListenerId);
  store.removeEventListener('use-skill-done', useSkillDoneListenerId);
  window.removeEventListener('keydown', handleKeyDown);
});

watch(visible, (newValue) => {
  if (newValue) {
    store.pushFocus('skill-use');
  } else {
    store.popFocus();
  }
}, { immediate: true });
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
    
    <!-- Result state - full dialog -->
    <div v-else class="skill-result-dialog" :class="{ 'processing': !isComplete }">
      <button v-if="isComplete" class="close-button" @click="closeDialog">×</button>
      
      <div class="dialog-content">
        <!-- Story section -->
        <div class="story-section">
          <p class="story-text">{{ displayedStoryText }}</p>
        </div>

        <div class="results-container">
          <!-- Tool used section -->
          <div v-if="resultData?.tool" class="result-item">
            <div class="item-label changed">Used</div>
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
          
          <!-- Lost items -->
          <div v-for="item in removedItems" :key="item.id" class="result-item">
            <div class="item-label lost">Lost</div>
            <div 
              class="item-container animate-in"
              @mouseenter="handleItemMouseEnter(item.id)"
              @mouseleave="handleItemMouseLeave"
            >
              <div class="item-wrapper" :class="getRarityClass(item.value)">
                <img :src="item.imageUrl" class="item-image" :alt="item.name" />
              </div>
            </div>
          </div>
          
          <!-- New items -->
          <div v-for="item in workbenchResultItems" :key="item.id" class="result-item">
            <div class="item-label new">Gained</div>
            <div 
              class="item-container animate-in"
              @mouseenter="handleItemMouseEnter(item.id)"
              @mouseleave="handleItemMouseLeave"
            >
              <div class="item-wrapper" :class="getRarityClass(item.value)">
                <img :src="item.imageUrl" class="item-image" :alt="item.name" />
              </div>
            </div>
          </div>

          <!-- Placeholder item for incomplete results -->
          <div v-if="!isComplete" class="result-item">
            <div class="item-label">Processing</div>
            <div class="item-container">
              <div class="item-wrapper placeholder">
                <div class="loading-dot"></div>
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
  display: none;
}

.story-dialog {
  display: none;
}

/* Result dialog styles */
.skill-result-dialog {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 800px;
  min-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 2px solid #333;
  position: relative;
  display: flex;
  flex-direction: column;
}

.skill-result-dialog.processing {
  border: 2px solid #ffd700;
  box-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
  animation: legendary-glow 2s ease-in-out infinite;
  position: relative;
}

.skill-result-dialog.processing::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 12px;
  background: linear-gradient(45deg, #ffd700, #ff8c00, #ffd700);
  z-index: -1;
  animation: legendary-border 3s linear infinite;
  opacity: 0.7;
}

.dialog-content {
  padding: 20px;
  padding-top: 40px;
  color: #ddd;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  height: 100%;
  overflow-y: auto;
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
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background-color: rgba(33, 150, 243, 0.4);
  border: 3px solid #2196f3;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
  z-index: 3;
  animation: skill-rotate 3s linear infinite;
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.5);
}

.skill-name {
  font-size: 1rem;
  text-shadow: 0 0 8px rgba(33, 150, 243, 0.7);
  color: white;
  text-align: center;
  padding: 0 10px;
  transform: rotate(-360deg);
  animation: counter-rotate 3s linear infinite;
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

@keyframes skill-rotate {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes counter-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(-360deg);
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

.results-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
  padding: 16px;
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.item-label {
  font-size: 0.8rem;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.item-label.changed {
  background-color: rgba(33, 150, 243, 0.2);
  color: #2196f3;
}

.item-label.lost {
  background-color: rgba(255, 82, 82, 0.2);
  color: #ff5252;
}

.item-label.new {
  background-color: rgba(76, 175, 80, 0.2);
  color: #4caf50;
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
  padding: 8px;
  transition: all 0.2s;
  background-color: rgba(0, 0, 0, 0.2);
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

/* Animation styles */
@keyframes pop-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  70% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-in {
  animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}



/* Add animation delay based on item index */
.items-grid .item-container:nth-child(1) { animation-delay: 0.1s; }
.items-grid .item-container:nth-child(2) { animation-delay: 0.2s; }
.items-grid .item-container:nth-child(3) { animation-delay: 0.3s; }
.items-grid .item-container:nth-child(4) { animation-delay: 0.4s; }
.items-grid .item-container:nth-child(5) { animation-delay: 0.5s; }
.items-grid .item-container:nth-child(6) { animation-delay: 0.6s; }
.items-grid .item-container:nth-child(7) { animation-delay: 0.7s; }
.items-grid .item-container:nth-child(8) { animation-delay: 0.8s; }
.items-grid .item-container:nth-child(9) { animation-delay: 0.9s; }
.items-grid .item-container:nth-child(10) { animation-delay: 1.0s; }

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
  }
}

/* Remove old done button styles */
.done-button-container,
.done-button {
  display: none;
}

/* Add new close button styles */
.close-button {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  color: #ddd;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 2;
  padding: 0;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.close-button:active {
  transform: scale(0.95);
}

@keyframes legendary-glow {
  0%, 100% {
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 60px rgba(255, 215, 0, 0.8);
  }
}

@keyframes legendary-border {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
  }
}

.animate-in {
  animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  70% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Add loading indicator styles */
.results-grid::after {
  content: '...';
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  color: #ffd700;
  animation: loading-dots 1.5s infinite;
  opacity: 0;
}

.skill-result-dialog.processing .results-grid::after {
  opacity: 1;
}

@keyframes loading-dots {
  0%, 20% {
    content: '.';
  }
  40% {
    content: '..';
  }
  60%, 100% {
    content: '...';
  }
}

.story-text {
  line-height: 1.6;
  font-size: 1.1rem;
  color: #fff;
  white-space: pre-line;
  margin: 0;
}

.item-wrapper.placeholder {
  background-color: rgba(0, 0, 0, 0.2);
  border: 2px dashed #666;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-dot {
  width: 12px;
  height: 12px;
  background-color: #666;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}
</style>