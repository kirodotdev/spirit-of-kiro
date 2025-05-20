<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';
import ItemPreview from './ItemPreview.vue';

const store = useGameStore();

// State to track dialog visibility, loading state, and result data
const visible = ref(false);
const isLoading = ref(true);
const resultData = ref<any>(null);

function closeDialog() {
  visible.value = false;
  store.interactionLocked = false;
}

// Function to handle keydown events
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && visible.value) {
    closeDialog();
  }
}

// Listen for skill events
let skillInvokedListenerId: string;
let skillResultListenerId: string;

onMounted(() => {
  // Listen for skill-invoked event to show loading state
  skillInvokedListenerId = store.addEventListener('skill-invoked', () => {
    console.log('skill-invoked');
    visible.value = true;
    isLoading.value = true;
    store.interactionLocked = true;
  });
  
  // Listen for skill-result event to show result state
  skillResultListenerId = store.addEventListener('skill-result', (data) => {
    console.log('skill-result data', data);
    resultData.value = data;
    isLoading.value = false;
  });
  
  // Add event listener for keydown to handle Escape key
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  store.removeEventListener('skill-invoked', skillInvokedListenerId);
  store.removeEventListener('skill-result', skillResultListenerId);
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
        <button class="close-button" @click="closeDialog">×</button>
      </div>
      
      <!-- Loading state -->
      <div v-if="isLoading" class="dialog-content loading-content">
        <div class="loading-spinner"></div>
        <p>Processing skill...</p>
      </div>
      
      <!-- Result state -->
      <div v-else class="dialog-content result-content">
        <!-- Story section -->
        <div class="story-section">
          <h3>What happened:</h3>
          <p class="story-text">{{ resultData?.story || 'Something unexpected happened...' }}</p>
        </div>
        
        <!-- Items section -->
        <div v-if="resultData?.items && resultData.items.length > 0" class="items-section">
          <h3>Items Obtained:</h3>
          <div class="items-grid">
            <div v-for="(item, index) in resultData.items" :key="index" class="item-container">
              <ItemPreview :item="item" />
            </div>
          </div>
        </div>
        
        <!-- No items message -->
        <div v-else-if="!isLoading" class="no-items">
          <p>No items were obtained from this skill.</p>
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

.items-section h3 {
  margin-bottom: 15px;
  color: #4caf50;
  font-size: 1.2rem;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.item-container {
  display: flex;
  justify-content: center;
}

.item-container .item-preview {
  position: relative !important;
  width: 100%;
  pointer-events: auto; /* Override the default pointer-events: none from ItemPreview */
}

.no-items {
  text-align: center;
  padding: 20px;
  color: #aaa;
  font-style: italic;
}
</style>