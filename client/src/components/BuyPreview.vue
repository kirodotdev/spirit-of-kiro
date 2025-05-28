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
}>();

// Computed properties for the preview
const imageUrl = computed(() => props.item?.imageUrl || '/src/assets/generic.png');

// Determine CSS class based on item value
const rarityClass = computed(() => {
  if (!props.item || props.item.value === undefined) return 'item-common';
  return getRarityClass(props.item.value);
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
</script>

<template>
  <div v-if="item" class="buy-preview" :class="rarityClass" :style="positionStyle">
    <div class="preview-content">
      <div class="price-container">
        <div class="gold-display">
          <div class="gold-icon"></div>
          <span v-if="item.value !== undefined" class="price-tag">
            {{ item.value }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.buy-preview {
  background-color: rgba(40, 40, 40, 0.8);
  border-radius: 12px;
  width: auto;
  max-width: none;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 30;
  pointer-events: none;
}

.buy-preview.item-uncommon {
  border: 2px solid #4caf50;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}

.buy-preview.item-rare {
  border: 2px solid #2196f3;
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
}

.buy-preview.item-epic {
  border: 2px solid #9c27b0;
  box-shadow: 0 0 20px rgba(156, 39, 176, 0.3);
}

.buy-preview.item-legendary {
  border: 2px solid #ff9800;
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.5);
}

.preview-content {
  padding: 0;
  display: flex;
  align-items: center;
}

.price-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  color: white;
  font-weight: bold;
}

.gold-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gold-icon {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #ffd700, #ffa500);
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.5);
}

.price-tag {
  font-size: 1.1em;
  color: white;
  font-weight: bold;
}

.item-name {
  font-size: 0.9em;
  text-align: center;
  white-space: nowrap;
}

.item-name.item-uncommon {
  color: #4caf50;
}

.item-name.item-rare {
  color: #2196f3;
}

.item-name.item-epic {
  color: #9c27b0;
}

.item-name.item-legendary {
  color: #ff9800;
}
</style> 