<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';

const store = useGameStore();

// State to track dialog visibility and current item
const visible = ref(false);
const currentItem = ref<any>(null);

// Computed properties for the dialog
const imageUrl = computed(() => currentItem.value?.imageUrl || '/src/assets/generic.png');

// Determine CSS class based on item value
const rarityClass = computed(() => {
  if (!currentItem.value || currentItem.value.value === undefined) return 'item-common';
  
  const value = currentItem.value.value;
  if (value > 1000) return 'item-legendary';
  if (value > 500) return 'item-epic';
  if (value > 250) return 'item-rare';
  if (value > 100) return 'item-uncommon';
  return 'item-common';
});

function closeDialog() {
  visible.value = false;
  store.interactionLocked = false;
}

// Function to handle keydown events
function handleKeyDown(event: KeyboardEvent) {
  // Check if the pressed key is Escape and the dialog is visible
  if (event.key === 'Escape' && visible.value) {
    closeDialog();
  }
}

// Listen for inspect-item events
let inspectItemListenerId: string;

onMounted(() => {
  inspectItemListenerId = store.addEventListener('inspect-item', (data) => {
    console.log('inspect-item data', data)
    if (data && data.id) {
      // Get the item data directly from the store using the ID
      const itemData = store.itemsById.get(data.id);
      if (itemData) {
        currentItem.value = itemData;
        // Store the game object ID for later removal
        currentItem.value.gameObjectId = data.id;
        visible.value = true;
        store.interactionLocked = true;
      }
    }
  });
  
  // Add event listener for keydown to handle Escape key
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  store.removeEventListener('inspect-item', inspectItemListenerId);
  // Remove the keydown event listener
  window.removeEventListener('keydown', handleKeyDown);
  // Make sure to unlock interactions if component is unmounted while dialog is open
  if (visible.value) {
    store.interactionLocked = false;
  }
})
</script>

<template>
  <div v-if="visible" class="item-dialog-overlay">
    <div class="item-dialog" :class="rarityClass">
      <div class="dialog-header">
        <h2>{{ currentItem?.name || 'Unknown Item' }}</h2>
        <button class="close-button" @click="closeDialog">×</button>
      </div>
      <div class="dialog-content">
        <div class="dialog-image-container">
          <img :src="imageUrl" alt="Item" class="dialog-image" />
          <div class="tags-container">
            <span class="tag item-rarity" :class="rarityClass">
              {{ rarityClass.replace('item-', '').charAt(0).toUpperCase() + rarityClass.replace('item-', '').slice(1) }}
            </span>
            <span v-for="(material, index) in currentItem?.materials" :key="index" class="tag material-tag">{{ material }}</span>
          </div>
        </div>
        <div class="dialog-details">
          <p class="item-description">{{ currentItem?.description || 'No description available.' }}</p>
          
          <div class="item-stats">
            <div class="stat-row" v-if="currentItem?.value !== undefined">
              <span class="stat-label">Value:</span>
              <span class="stat-value">{{ currentItem.value }}</span>
            </div>
            <div class="stat-row" v-if="currentItem?.weight">
              <span class="stat-label">Weight:</span>
              <span class="stat-value">{{ currentItem.weight }}</span>
            </div>
            <div class="stat-row" v-if="currentItem?.damage">
              <span class="stat-label">Damage:</span>
              <span class="stat-value">{{ currentItem.damage }}</span>
            </div>
          </div>
          
          <div class="item-skills" v-if="currentItem?.skills && currentItem.skills.length > 0">
            <h3>Quirks:</h3>
            <div v-for="(skill, index) in currentItem.skills" :key="index" class="skill-item">
              <div class="skill-header">
                <div class="skill-name">{{ skill.name }}</div>
                <div class="skill-targets" v-if="skill.targets !== undefined">
                  <span class="target-tag">
                    {{ skill.targets === 0 ? 'Self' : skill.targets === 1 ? '1 Target' : '2 Targets' }}
                  </span>
                </div>
              </div>
              <div class="skill-description">{{ skill.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Dialog Styles */
.item-dialog-overlay {
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

.item-dialog {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 2px solid #333;
}

.item-dialog.item-uncommon {
  border-color: #4caf50;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}

.item-dialog.item-rare {
  border-color: #2196f3;
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
}

.item-dialog.item-epic {
  border-color: #9c27b0;
  box-shadow: 0 0 20px rgba(156, 39, 176, 0.3);
}

.item-dialog.item-legendary {
  border-color: #ff9800;
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.5);
  animation: dialog-pulse 2s infinite;
}

@keyframes dialog-pulse {
  0% { box-shadow: 0 0 20px rgba(255, 152, 0, 0.3); }
  50% { box-shadow: 0 0 30px rgba(255, 152, 0, 0.6); }
  100% { box-shadow: 0 0 20px rgba(255, 152, 0, 0.3); }
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
  padding-right: 10px;
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

.item-description {
  margin-bottom: 15px;
  line-height: 1.5;
}

.tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: bold;
  background-color: rgba(255, 255, 255, 0.15);
  font-size: 0.9rem;
}

.item-rarity {
  text-align: left;
}

.material-tag {
  /* Extends the .tag class */
  background-color: rgba(255, 255, 255, 0.25);
  color: #ddd;
  font-weight: normal;
}

.item-rarity.item-common {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.2);
}

.item-rarity.item-uncommon {
  color: #4caf50;
  background-color: rgba(76, 175, 80, 0.25);
}

.item-rarity.item-rare {
  color: #2196f3;
  background-color: rgba(33, 150, 243, 0.25);
}

.item-rarity.item-epic {
  color: #9c27b0;
  background-color: rgba(156, 39, 176, 0.25);
}

.item-rarity.item-legendary {
  color: #ff9800;
  background-color: rgba(255, 152, 0, 0.25);
  text-shadow: 0 0 3px rgba(255, 152, 0, 0.5);
}

.dialog-footer {
  padding: 15px 20px;
  border-top: 1px solid #333;
  display: flex;
  justify-content: flex-end;
}

/* Additional styles for item details */
.item-stats {
  margin: 15px 0;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.stat-label {
  font-weight: bold;
  color: #aaa;
}

.stat-value {
  color: white;
}

.item-materials, .item-skills {
  margin: 10px 0;
}

.item-skills h3 {
  font-size: 1rem;
  margin-bottom: 5px;
  color: #aaa;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: flex-start;
  justify-content: flex-start;
  margin-top: 10px;
  width: 100%;
}

.skill-item {
  margin-bottom: 10px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.skill-name {
  font-weight: bold;
  color: #ddd;
}

.skill-description {
  font-size: 0.9rem;
  color: #bbb;
  margin-top: 5px;
}

/* Add styles for the target tag */
.target-tag {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
  background-color: #607d8b;
  color: white;
  white-space: nowrap;
}
</style>