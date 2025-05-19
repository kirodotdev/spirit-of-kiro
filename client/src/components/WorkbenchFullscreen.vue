<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';
import ItemPreview from './ItemPreview.vue';

const gameStore = useGameStore();
const props = defineProps<{
  show: boolean;
  workbenchImage: string;
  items?: any[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'action', action: string, item?: any): void;
}>();

// State to track which item is being hovered
const hoveredItem = ref<any>(null);

// State to track selected items for the working grid
const selectedWorkingItems = ref<any[]>([]);

// Computed property to check if the items array is empty
const isToolGridEmpty = computed(() => {
  return !props.items || props.items.length === 0;
});

const handleItemClick = (item: any) => {
  emit('action', 'select-item', item);
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
    <div class="workbench-container" :style="{ backgroundImage: `url(${workbenchImage})` }">
      <button class="close-button" @click="$emit('close')">Back</button>
      
      <!-- Item Preview Component -->
      <ItemPreview :item="hoveredItem" />
      
      <div class="tool-area">
        <div class="tool-grid">
          <div 
            class="inventory-slot" 
            :class="{ 'has-item': item }" 
            v-for="item in items" 
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
            v-for="n in Math.max(0, 32 - (items ? items.length : 0))" 
            :key="'empty-'+n"
          ></div>
          
          <!-- Empty grid prompt message -->
          <div v-if="isToolGridEmpty" class="empty-grid-prompt">
            Drag an item here to use as a tool
          </div>
        </div>
      </div>
      
      <!-- Working Area -->
      <div class="working-area">
        <div class="working-grid">
          <div 
            class="inventory-slot working-slot" 
            :class="{ 'has-item': item }" 
            v-for="(item, index) in selectedWorkingItems" 
            :key="item ? item.id : 'working-'+index"
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
            class="inventory-slot working-slot" 
            v-for="n in Math.max(0, 5 - (selectedWorkingItems.length || 0))" 
            :key="'empty-working-'+n"
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

.workbench-container {
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
  align-items: top;
  padding-top: 8%;
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

.tool-area {
  position: absolute;
  width: 60%;
  height: 32%;
  top: 10.5%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 10px;
  width: 100%;
  height: 100%;
}

/* Working area in the lower half of the workbench */
.working-area {
  position: absolute;
  width: 60%;
  height: 12%;
  bottom: 35%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.working-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: 1fr;
  gap: 10px;
  width: 100%;
  height: 100%;
}

.inventory-slot {
  background: transparent;
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

.working-slot {
  border: 3px dashed rgb(113, 67, 31);
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

.empty-grid-prompt {
  position: absolute;
  display: inline-block;
  padding: 12px 15px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.2em;
  text-align: center;
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  z-index: 5;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: auto;
  height: auto;
}
</style>