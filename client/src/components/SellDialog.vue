<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';

const store = useGameStore();

// State to track dialog visibility and current item
const visible = ref(false);
const sellData = ref<any>(null);

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

// Listen for sell-item events
let sellItemListenerId: string;

onMounted(() => {
  sellItemListenerId = store.addEventListener('sell-item', (data) => {
    console.log('sell-item data', data);
    sellData.value = data;
    visible.value = true;
    store.interactionLocked = true;
  });
  
  // Add event listener for keydown to handle Escape key
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  store.removeEventListener('sell-item', sellItemListenerId);
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
        <button class="close-button" @click="closeDialog">×</button>
      </div>
      <div class="dialog-content">
        <p>Hmm, let's take a look at this...</p>
        <pre>{{ JSON.stringify(sellData, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Dialog Styles */
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

.dialog-content {
  padding: 20px;
  color: #ddd;
}

pre {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  color: #bbb;
}
</style>