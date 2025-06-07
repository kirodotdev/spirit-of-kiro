<script setup lang="ts">
import { computed } from 'vue';
import { getRarityClass } from '../utils/items';

const props = defineProps<{
  item: any | null;
  // Position configuration props
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  transform?: string;
  showOnlyPrice?: boolean;
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

// Compute the positioning style based on props without defaults
const positionStyle = computed(() => {
  return {
    position: props.position as 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky' | undefined,
    top: props.top,
    right: props.right,
    bottom: props.bottom,
    left: props.left,
    transform: props.transform
  };
});

// No custom material class needed as we're using the same styling as damage tag
</script>

<template>
  <div v-if="item" class="item-preview" :class="rarityClass" :style="positionStyle">
    <div v-if="!showOnlyPrice" class="preview-header">
      <h3>{{ item.name || 'Unknown Item' }}</h3>
    </div>
    <div class="preview-content">
      <div class="preview-image-container">
        <img :src="imageUrl" alt="Item" class="preview-image" />
        <div class="tags-container">
          <span v-if="!showOnlyPrice" class="tag item-rarity" :class="rarityClass">
            {{ rarityText }}
          </span>
          <span v-if="item.value !== undefined" class="tag stat-tag gold-display">
            <div class="gold-icon"></div>
            <span class="gold-amount">{{ item.value }}</span>
          </span>
          <span v-if="!showOnlyPrice && item.weight" class="tag stat-tag">
            {{ item.weight }}
          </span>
          <span v-if="!showOnlyPrice && item.materials && item.materials.length > 0"
            v-for="(material, idx) in item.materials" :key="idx" class="tag stat-tag">
            {{ material }}
          </span>
          <span v-if="!showOnlyPrice && item.damage" class="tag stat-tag">
            {{ item.damage }}
          </span>
        </div>
      </div>
      <div v-if="!showOnlyPrice" class="preview-details">
        <p class="item-description">{{ item.description || 'No description available.' }}</p>

        <div class="item-skills" v-if="item.skills && item.skills.length > 0">
          <h4>Quirks:</h4>
          <div v-for="(skill, index) in item.skills" :key="index" class="skill-item">
            <div class="skill-header">
              <div class="skill-name">{{ skill.name }}</div>
              <div class="skill-targets">
                <span class="target-tag">
                  {{ typeof skill.targets === 'number' && skill.targets >= 0 && skill.targets <= 2 ? (skill.targets === 0
                    ? 'Self' : skill.targets === 1 ? '1 Target' : '2 Targets') : 'Self' }} </span>
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
  /* Position is now controlled by the positionStyle computed property */
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 80%;
  max-width: 600px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 2px solid #333;
  z-index: 30;
  pointer-events: none;
  /* Allow clicking through the preview */
}

/* When showing only price, make the preview more compact */
.item-preview:has(.preview-content:only-child) {
  width: auto;
  max-width: none;
  padding: 10px;
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

/* When showing only price, adjust the content layout */
.item-preview:has(.preview-content:only-child) .preview-content {
  padding: 0;
  gap: 8px;
}

.preview-image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 25%;
  min-width: 80px;
  max-width: 120px;
}

/* When showing only price, adjust the image container */
.item-preview:has(.preview-content:only-child) .preview-image-container {
  width: auto;
  min-width: 40px;
  max-width: 60px;
}

.preview-image {
  width: 100%;
  max-height: 120px;
  object-fit: contain;
}

/* When showing only price, adjust the image size */
.item-preview:has(.preview-content:only-child) .preview-image {
  max-height: 40px;
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

/* When showing only price, make the price tag more prominent */
.item-preview:has(.preview-content:only-child) .stat-tag {
  font-size: 1rem;
  padding: 2px 8px;
  background-color: rgba(255, 255, 255, 0.4);
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

/* When showing only price, adjust the tags container */
.item-preview:has(.preview-content:only-child) .tags-container {
  margin-top: 0;
  width: auto;
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

/* Add styles for the target tag */
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