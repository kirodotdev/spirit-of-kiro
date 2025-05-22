<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';
import ItemPreview from './ItemPreview.vue';
import { getRarityClass } from '../utils/items';

const store = useGameStore();

// State
const visible = ref(false);
const isLoading = ref(true);
const sellData = ref<any>(null);
const result = ref<any>(null);

function closeDialog() {
  if (isLoading.value) return;
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
    sellData.value = data;
    visible.value = true;
    isLoading.value = true;
    store.interactionLocked = true;
    
    // Remove the game object from the world
    if (data.id) {
      store.removeObject(data.id);
    }
    
    // Send sell-item request to server
    store.sellItem(data.id);
  });
  
  itemSoldListenerId = store.addEventListener('item-sold', (data) => {
    result.value = data;
    isLoading.value = false;
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
        <div class="item-preview" v-if="sellData">
          <div class="item-wrapper" :class="getRarityClass(sellData.value)">
            <img :src="sellData.imageUrl" class="item-image" :alt="sellData.name" />
          </div>
        </div>
        <p class="processing-text">I'm appraising your item...</p>
        <div class="loading-spinner"></div>
      </div>
      
      <!-- Result state -->
      <div v-else class="dialog-content result-content">
        <pre>{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
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

.item-preview {
  margin-bottom: 20px;
}

.item-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.3);
  border: 2px solid #333;
  padding: 5px;
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

pre {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 15px;
  border-radius: 8px;
  overflow-x: auto;
  color: #bbb;
  white-space: pre-wrap;
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
</style>