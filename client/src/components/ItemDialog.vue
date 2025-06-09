<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';
import type { Item } from '../systems/item-system';

const store = useGameStore();

// State to track dialog visibility and current item ID
const visible = ref(false);
const currentItemId = ref<string>();

// Computed property for the current item
const currentItem = computed(() => {
  if (!currentItemId.value) return undefined;
  return store.useItem(currentItemId.value).value;
});

// Computed properties for the dialog
const imageUrl = computed(() => currentItem.value?.imageUrl || '/src/assets/generic.png');

// Determine CSS class based on item value
const rarityClass = computed(() => {
  if (!currentItem.value || currentItem.value.value === undefined) return 'item-common';
  return getRarityClass(currentItem.value.value);
});

// Format rarity text for display
const rarityText = computed(() => {
  if (!rarityClass.value) return 'Common';
  return rarityClass.value.replace('item-', '').charAt(0).toUpperCase() + rarityClass.value.replace('item-', '').slice(1);
});

function closeDialog() {
  visible.value = false;
}

// Function to handle keydown events
function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !visible.value || !store.hasFocus('item-dialog')) {
    return;
  }
  closeDialog();
}

// Listen for inspect-item events
let inspectItemListenerId: string;

let gainedFocusListenerId: string;
let lostFocusListenerId: string;

function handleGainedFocus() {
  window.addEventListener('keydown', handleKeyDown);
}

function handleLostFocus() {
  window.removeEventListener('keydown', handleKeyDown);
}

onMounted(() => {
  gainedFocusListenerId = store.addEventListener('gained-focus:item-dialog', handleGainedFocus);
  lostFocusListenerId = store.addEventListener('lost-focus:item-dialog', handleLostFocus);
  window.addEventListener('keydown', handleKeyDown);
  inspectItemListenerId = store.addEventListener('inspect-item', (data) => {
    console.log('inspect-item data', data)
    if (data && data.id) {
      currentItemId.value = data.id;
      visible.value = true;
    }
  });
});

onUnmounted(() => {
  store.removeEventListener('gained-focus:item-dialog', gainedFocusListenerId);
  store.removeEventListener('lost-focus:item-dialog', lostFocusListenerId);
  window.removeEventListener('keydown', handleKeyDown);
  store.removeEventListener('inspect-item', inspectItemListenerId);
});

// Watch for changes to visible prop to manage focus
watch(() => visible.value, (newValue) => {
  if (newValue) {
    store.pushFocus('item-dialog');
  } else {
    store.popFocus();
  }
});
</script>

<template>
  <div v-if="visible && currentItem" class="item-dialog-overlay">
    <div class="item-dialog" :class="rarityClass">
      <div class="dialog-header">
        <h3>{{ currentItem?.name || 'Unknown Item' }}</h3>
        <button class="close-button" @click="closeDialog">×</button>
      </div>
      <div class="dialog-content">
        <div class="dialog-image-container">
          <img :src="imageUrl" alt="Item" class="dialog-image" />
          <div class="tags-container">
            <span class="tag item-rarity" :class="rarityClass">
              {{ rarityText }}
            </span>
            <span class="tag stat-tag gold-display">
              <div class="gold-icon"></div>
              <span class="gold-amount">{{ currentItem.value }}</span>
            </span>
            <span class="tag stat-tag">
              {{ currentItem.weight }}
            </span>
            <span v-for="(material, idx) in currentItem.materials" :key="idx" class="tag stat-tag">
              {{ material }}
            </span>
            <span class="tag stat-tag">
              {{ currentItem.damage }}
            </span>
          </div>
        </div>
        <div class="dialog-details">
          <p class="item-description">{{ currentItem?.description || 'No description available.' }}</p>
          
          <div class="item-skills">
            <h4>Quirks:</h4>
            <div v-for="(skill, index) in currentItem.skills" :key="index" class="skill-item">
              <div class="skill-header">
                <div class="skill-name">{{ skill.name }}</div>
                <div class="skill-targets">
                  <span class="target-tag">
                    {{ typeof skill.targets === 'number' && skill.targets >= 0 && skill.targets <= 2 ? (skill.targets === 0
                      ? 'Self' : skill.targets === 1 ? '1 Target' : '2 Targets') : 'Self' }}
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
/* Dialog Overlay */
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

/* Dialog Container */
.item-dialog {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 90%;
  max-width: 650px;
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

/* Dialog Header */
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #333;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.2rem;
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

/* Dialog Content */
.dialog-content {
  padding: 15px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 15px;
}

/* Image Container */
.dialog-image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25%;
  min-width: 80px;
  max-width: 120px;
}

.dialog-image {
  width: 100%;
  max-height: 120px;
  object-fit: contain;
}

/* Details Container */
.dialog-details {
  color: #ddd;
  width: 75%;
  flex-grow: 1;
}

.item-description {
  margin-bottom: 10px;
  line-height: 1.4;
  font-size: 0.9rem;
}

/* Tags */
.tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: bold;
  background-color: rgba(255, 255, 255, 0.15);
  font-size: 0.8rem;
}

.item-rarity {
  text-align: left;
}

.stat-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.75rem;
  padding: 1px 5px;
  color: white;
  background-color: rgba(255, 255, 255, 0.3);
}

/* Gold display styling from HUD.vue */
.gold-display {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-weight: bold;
}

.gold-amount {
  font-size: 1.1em;
}

/* Tags Container */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: flex-start;
  justify-content: flex-start;
  margin-top: 8px;
  width: 100%;
}

/* Skill Styles */
.item-skills {
  margin: 8px 0;
}

.item-skills h4 {
  font-size: 0.9rem;
  margin: 0 0 5px 0;
  color: #aaa;
}

.skill-item {
  margin-bottom: 8px;
  padding: 6px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 0.85rem;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
  flex-wrap: wrap;
}

.skill-name {
  font-weight: bold;
  color: #ddd;
  font-size: 0.85rem;
}

.skill-description {
  font-size: 0.8rem;
  color: #bbb;
  margin-top: 3px;
}

/* Target Tag */
.target-tag {
  font-size: 0.65rem;
  padding: 1px 4px;
  border-radius: 8px;
  font-weight: bold;
  background-color: #607d8b;
  color: white;
  white-space: nowrap;
}

/* Used to style the item rarity tag */
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
</style>