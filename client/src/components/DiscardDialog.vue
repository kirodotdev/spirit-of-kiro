<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';

const store = useGameStore();

// State to track dialog visibility and current item
const visible = ref(false);
const currentItem = ref<any>(null);

// Computed properties for the dialog
const imageUrl = computed(() => currentItem.value?.imageUrl || '/src/assets/generic.png');

function closeDialog() {
  visible.value = false;
  store.interactionLocked = false;
  currentItem.value = null;
}

function discardItem() {
  if (currentItem.value && currentItem.value.id) {
    // Call the discardItem method in the store
    store.discardItem(currentItem.value.id);
  }
  closeDialog();
}

// Function to handle keydown events
function handleKeyDown(event: KeyboardEvent) {
  // Check if the pressed key is Escape and the dialog is visible
  if (event.key === 'Escape' && visible.value) {
    closeDialog();
  }
}

// Listen for intent-to-discard-item events
let discardItemListenerId: string;

onMounted(() => {
  discardItemListenerId = store.addEventListener('intent-to-discard-item', (data) => {
    if (data && data.id) {
      // Get the item data directly from the store using the ID
      const itemData = store.itemsById.get(data.id);
      if (itemData) {
        currentItem.value = itemData;
        visible.value = true;
        store.interactionLocked = true;
      }
    }
  });
  
  // Add event listener for keydown to handle Escape key
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  store.removeEventListener('intent-to-discard-item', discardItemListenerId);
  // Remove the keydown event listener
  window.removeEventListener('keydown', handleKeyDown);
  // Make sure to unlock interactions if component is unmounted while dialog is open
  if (visible.value) {
    store.interactionLocked = false;
  }
})
</script>

<template>
  <div v-if="visible" class="discard-dialog-overlay">
    <div class="discard-dialog">
      <div class="dialog-header">
        <h2>You consider whether to discard this item:</h2>
        <button class="close-button" @click="closeDialog">×</button>
      </div>
      <div class="dialog-content">
        <div class="dialog-image-container">
          <img :src="imageUrl" alt="Item" class="dialog-image" />
        </div>
        <div class="dialog-details">
          <h3>{{ currentItem?.name || 'Unknown Item' }}</h3>
          <p class="item-description">{{ currentItem?.description || 'No description available.' }}</p>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="cancel-button" @click="closeDialog">Cancel</button>
        <button class="discard-button" @click="discardItem">Discard</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Dialog Styles */
.discard-dialog-overlay {
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

.discard-dialog {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
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
  font-size: 1.3rem;
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
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
}

.dialog-image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 30%;
  min-width: 120px;
  max-width: 200px;
}

.dialog-image {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.dialog-details {
  color: #ddd;
  width: 70%;
  flex-grow: 1;
}

.dialog-details h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: white;
}

.item-description {
  margin-bottom: 15px;
  line-height: 1.5;
}

.dialog-footer {
  padding: 15px 20px;
  border-top: 1px solid #333;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-button, .discard-button {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-button {
  background-color: #424242;
  color: white;
  border: none;
}

.cancel-button:hover {
  background-color: #616161;
}

.discard-button {
  background-color: #f44336;
  color: white;
  border: none;
}

.discard-button:hover {
  background-color: #d32f2f;
}
</style>