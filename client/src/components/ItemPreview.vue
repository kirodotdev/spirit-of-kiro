<script setup lang="ts">
import { computed } from 'vue';
import { getRarityClass } from '../utils/items';

const props = defineProps<{
  item: any | null;
}>();

// Computed properties for the preview
const imageUrl = computed(() => props.item?.imageUrl || '/src/assets/generic.png');

// Determine CSS class based on item value
const rarityClass = computed(() => {
  if (!props.item || props.item.value === undefined) return 'item-common';
  return getRarityClass(props.item.value);
});

// Format rarity text for display
const rarityText = computed(() => {
  if (!rarityClass.value) return 'Common';
  return rarityClass.value.replace('item-', '').charAt(0).toUpperCase() + rarityClass.value.replace('item-', '').slice(1);
});

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
</script>

<template>
  <div v-if="item" class="item-preview" :class="rarityClass">
    <div class="preview-header">
      <h3>{{ item.name || 'Unknown Item' }}</h3>
    </div>
    <div class="preview-content">
      <div class="preview-image-container">
        <img :src="imageUrl" alt="Item" class="preview-image" />
        <div class="tags-container">
          <span class="tag item-rarity" :class="rarityClass">
            {{ rarityText }}
          </span>
          <span v-if="item.value !== undefined" class="tag stat-tag">
            <span class="stat-icon">💰</span> {{ item.value }}
          </span>
          <span v-if="item.weight" class="tag stat-tag">
            {{ item.weight }}
          </span>
          <span v-if="item.damage" class="tag stat-tag">
            {{ item.damage }}
          </span>
        </div>
      </div>
      <div class="preview-details">
        <p class="item-description">{{ item.description || 'No description available.' }}</p>
        
        <div class="item-skills" v-if="item.skills && item.skills.length > 0">
          <h4>Quirks:</h4>
          <div v-for="(skill, index) in item.skills" :key="index" class="skill-item">
            <div class="skill-header">
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-outcomes" v-if="skill.outcomes && skill.outcomes.length > 0">
                <span v-for="(outcome, i) in skill.outcomes" :key="i" class="outcome-tag" :class="getOutcomeClass(outcome)">
                  {{ formatOutcome(outcome) }}
                </span>
              </div>
            </div>
            <div class="skill-description">{{ skill.description }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.item-preview {
  position: absolute;
  bottom: 55%;
  left: 50%;
  transform: translateX(-50%);
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 2px solid #333;
  z-index: 30;
  pointer-events: none; /* Allow clicking through the preview */
}

.item-preview.item-uncommon {
  border-color: #4caf50;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}

.item-preview.item-rare {
  border-color: #2196f3;
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
}

.item-preview.item-epic {
  border-color: #9c27b0;
  box-shadow: 0 0 20px rgba(156, 39, 176, 0.3);
}

.item-preview.item-legendary {
  border-color: #ff9800;
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.5);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #333;
}

.preview-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: white;
}

.preview-content {
  padding: 15px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 15px;
}

.preview-image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25%;
  min-width: 80px;
  max-width: 120px;
}

.preview-image {
  width: 100%;
  max-height: 120px;
  object-fit: contain;
}

.preview-details {
  color: #ddd;
  width: 75%;
  flex-grow: 1;
}

.item-description {
  margin-bottom: 10px;
  line-height: 1.4;
  font-size: 0.9rem;
  max-height: 80px;
  overflow-y: auto;
}

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

.stat-icon {
  font-size: 0.8rem;
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

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: flex-start;
  justify-content: flex-start;
  margin-top: 8px;
  width: 100%;
}

/* Skill styles */
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
</style>