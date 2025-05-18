<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';
import ItemPreview from './ItemPreview.vue';

const gameStore = useGameStore();
const props = defineProps<{
  show: boolean;
  chestImage: string;
  items?: any[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'action', action: string, item?: any): void;
}>();

// State to track which item is being hovered
const hoveredItem = ref<any>(null);

const handleAction = (action: string) => {
  emit('action', action);
};

const handleItemClick = (item: any) => {
  emit('action', 'take', item);
};

const handleItemMouseEnter = (item: any) => {
  hoveredItem.value = item;
};

const handleItemMouseLeave = () => {
  hoveredItem.value = null;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  // Ensure interaction is unlocked when component unmounts
  if (props.show) {
    gameStore.interactionLocked = false;
  }
});

// Watch for changes to show prop to lock/unlock interaction
watch(() => props.show, (newValue) => {
  if (newValue) {
    gameStore.interactionLocked = true;
  } else {
    gameStore.interactionLocked = false;
  }
}, { immediate: true });
</script>

<template>
  <div v-if="show" class="fullscreen-overlay">
    <div class="chest-container" :style="{ backgroundImage: `url(${chestImage})` }">
      <button class="close-button" @click="$emit('close')">Back</button>
      
      <!-- Item Preview Component -->
      <ItemPreview :item="hoveredItem" />
      
      <div class="inventory-area">
        <div class="inventory-grid">
          <div 
            class="inventory-slot" 
            :class="{ 'has-item': item }" 
            v-for="(item, index) in items" 
            :key="item.id"
            @click="item && handleItemClick(item)"
            @mouseenter="item && handleItemMouseEnter(item)"
            @mouseleave="handleItemMouseLeave"
          >
            <div v-if="item" class="item-container" :class="getRarityClass(item.value)">
              <img :src="item.imageUrl" class="item-image" :alt="item.name" />
            </div>
          </div>
          <!-- Add empty slots to fill the grid if needed -->
          <div 
            class="inventory-slot" 
            v-for="n in Math.max(0, 21 - (items ? items.length : 0))" 
            :key='n'
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.chest-container {
  position: relative;
  width: min(90vh, 90vw); /* Use the smaller of viewport width or height */
  height: min(90vh, 90vw); /* Match width to maintain square ratio */
  max-width: min(90vh, 1200px);
  max-height: min(90vh, 1200px);
  margin: auto;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: center;
}

.close-button {
  position: absolute;
  top: 5%;
  left: 0px;
  margin-right: 5%;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10%;
  transition: background-color 0.3s;
  padding: 1%;
  z-index: 20;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.inventory-area {
  position: absolute;
  width: 58%;
  height: 24%;
  top: 47%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
  height: 100%;
}

.inventory-slot {
  background: transparent;
  border: 3px dashed rgb(113, 67, 31);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9em;
  transition: border-color 0.3s, background-color 0.3s;
  position: relative;
}

.inventory-slot.has-item {
  border: none;
}

.inventory-slot.has-item:hover .item-container {
  transform: scale(1.05);
  cursor: pointer;
}

.inventory-slot:hover {
  border-color: rgb(173, 127, 91);
  background-color: rgba(113, 67, 31, 0.2);
}

/* Item styles moved to main.css */

.item-name {
  font-size: 0.7em;
  color: white;
  text-align: center;
  margin-top: 4px;
  text-shadow: 1px 1px 2px black;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 90%;
}
</style>