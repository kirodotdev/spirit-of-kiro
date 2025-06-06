<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';

const store = useGameStore();

// State to track dialog visibility and current item
const visible = ref(false);
const currentItem = ref<any>(null);

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
  store.interactionLocked = false;
}

// Function to handle keydown events
function handleKeyDown(event: KeyboardEvent) {
  // Check if the pressed key is Escape and the dialog is visible
  if (event.key === 'Escape' && visible.value) {
    closeDialog();
  }
}

// Format outcome text for display
function formatOutcome(outcome: string): string {
  return outcome.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get CSS class for outcome tag
function getOutcomeClass(outcome: string): string {
  const knownOutcomes = [
    'split target',
    'destroy self',
    'transform self',
    'consume target',
    'transform target'
  ];

  // Return specific class for known outcomes, or a generic class for custom ones
  return knownOutcomes.includes(outcome.toLowerCase())
    ? `outcome-${outcome.toLowerCase().replace(' ', '-')}`
    : 'outcome-custom';
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
            <span v-if="currentItem?.value !== undefined" class="tag stat-tag gold-display">
              <div class="gold-icon"></div>
              <span class="gold-amount">{{ currentItem.value }}</span>
            </span>
            <span v-if="currentItem?.weight" class="tag stat-tag">
              {{ currentItem.weight }}
            </span>
            <span v-if="currentItem?.materials && currentItem.materials.length > 0"
              v-for="(material, idx) in currentItem.materials" :key="idx" class="tag stat-tag">
              {{ material }}
            </span>
            <span v-if="currentItem?.damage" class="tag stat-tag">
              {{ currentItem.damage }}
            </span>
          </div>
        </div>
        <div class="dialog-details">
          <p class="item-description">{{ currentItem?.description || 'No description available.' }}</p>
          
          <div class="item-skills" v-if="currentItem?.skills && currentItem.skills.length > 0">
            <h4>Quirks:</h4>
            <div v-for="(skill, index) in currentItem.skills" :key="index" class="skill-item">
              <div class="skill-header">
                <div class="skill-name">{{ skill.name }}</div>
                <div class="skill-outcomes" v-if="skill.outcomes && skill.outcomes.length > 0">
                  <span v-for="(outcome, i) in skill.outcomes" :key="i" class="outcome-tag"
                    :class="getOutcomeClass(outcome)">
                    {{ formatOutcome(outcome) }}
                  </span>
                </div>
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

.gold-icon {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #ffd700, #ffa500);
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.5);
}

.gold-amount {
  font-size: 1.1em;
}

/* Rarity Classes */
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

.skill-outcomes {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.outcome-tag {
  font-size: 0.65rem;
  padding: 1px 4px;
  border-radius: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.outcome-split-target {
  background-color: #2196f3;
  color: white;
}

.outcome-destroy-self {
  background-color: #f44336;
  color: white;
}

.outcome-transform-self {
  background-color: #9c27b0;
  color: white;
}

.outcome-consume-target {
  background-color: #ff9800;
  color: white;
}

.outcome-transform-target {
  background-color: #4caf50;
  color: white;
}

.outcome-custom {
  background-color: #607d8b;
  color: white;
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

/* Material tags use the same styling as stat-tag */
</style>