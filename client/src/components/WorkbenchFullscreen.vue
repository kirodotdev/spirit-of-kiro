<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';
import ItemPreview from './ItemPreview.vue';

const gameStore = useGameStore();
const props = defineProps<{
  show: boolean;
  workbenchImage: string;
  toolsItems?: any[];
  workingItems?: any[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'action', action: string, item?: any): void;
}>();

// State to track which item is being hovered
const hoveredItem = ref<any>(null);

// State to track the currently dragged item
const draggedItem = ref<any>(null);

// State to track the current drop target area
const dropTarget = ref<'tools' | 'working' | null>(null);

// Computed property to check if the tools items array is empty
const isToolGridEmpty = computed(() => {
  return !props.toolsItems || props.toolsItems.length === 0;
});

const handleItemClick = (item: any) => {
  const targetInventory = `${gameStore.userId}:main`;

  // Clear the hovered item preview immediately when an item is clicked
  hoveredItem.value = null;

  // Set up a one-time listener for the 'item-moved' event
  const listenerId = gameStore.addEventListener('item-moved', (data) => {
    // Check if this is the item we just moved
    if (data && data.itemId === item.id && data.targetInventoryId === targetInventory) {
      // Remove the listener since we only need it once
      gameStore.removeEventListener('item-moved', listenerId);
      
      // Close the workbench fullscreen view
      emit('close');
      
      // Put the item in the player's hands
      gameStore.emitEvent('item-pickup', {
        id: data.itemId
      });
    }
  });

  // Move the item from workbench to main inventory
  gameStore.moveItem(item.id, targetInventory);
};

const handleItemMouseEnter = (item: any) => {
  hoveredItem.value = item;
};

const handleItemMouseLeave = () => {
  hoveredItem.value = null;
};

// Drag and drop handlers
const handleDragStart = (event: DragEvent, item: any, sourceArea: 'tools' | 'working') => {
  if (!item) return;
  
  // Store the dragged item and its source area
  draggedItem.value = { ...item, sourceArea };
  
  // Set the drag effect and data
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }
  
  // Hide the preview during drag
  hoveredItem.value = null;
};

const handleDragOver = (event: DragEvent, targetArea: 'tools' | 'working') => {
  // Prevent default to allow drop
  event.preventDefault();
  
  // Set the drop effect
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  
  // Update the drop target for visual feedback
  dropTarget.value = targetArea;
};

const handleDragEnter = (event: DragEvent, targetArea: 'tools' | 'working') => {
  // Prevent default to allow drop
  event.preventDefault();
  
  // Update the drop target for visual feedback
  dropTarget.value = targetArea;
};

const handleDragLeave = () => {
  // Clear the drop target when leaving a drop zone
  dropTarget.value = null;
};

const handleDrop = (event: DragEvent, targetArea: 'tools' | 'working') => {
  // Prevent default browser behavior
  event.preventDefault();
  
  // Clear the drop target
  dropTarget.value = null;
  
  // If no item is being dragged or the source and target areas are the same, do nothing
  if (!draggedItem.value || draggedItem.value.sourceArea === targetArea) {
    draggedItem.value = null;
    return;
  }
  
  // Determine the target inventory ID based on the drop area
  const targetInventoryId = targetArea === 'tools' 
    ? `${gameStore.userId}:workbench-tools` 
    : `${gameStore.userId}:workbench-working`;
  
  // Move the item to the target inventory
  gameStore.moveItem(draggedItem.value.id, targetInventoryId);
  
  // Reset the dragged item
  draggedItem.value = null;
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
      
      <div class="tool-area" 
           @dragover="handleDragOver($event, 'tools')"
           @dragenter="handleDragEnter($event, 'tools')"
           @dragleave="handleDragLeave"
           @drop="handleDrop($event, 'tools')"
           :class="{ 'drop-target': dropTarget === 'tools' }">
        <div class="tool-grid">
          <div 
            class="inventory-slot" 
            :class="{ 'has-item': item }" 
            v-for="(item, index) in toolsItems" 
            :key="item ? item.id : 'tool-'+index"
            @click="item && handleItemClick(item)"
            @mouseenter="item && handleItemMouseEnter(item)"
            @mouseleave="handleItemMouseLeave"
            draggable="item ? true : false"
            @dragstart="item && handleDragStart($event, item, 'tools')"
          >
            <div v-if="item" class="item-container" :class="getRarityClass(item.value)">
              <img :src="item.imageUrl" class="item-image" :alt="item.name" />
            </div>
          </div>
          <!-- Add empty slots to fill the grid if needed -->
          <div 
            class="inventory-slot" 
            v-for="n in Math.max(0, 32 - (toolsItems ? toolsItems.length : 0))" 
            :key="'empty-'+n"
          ></div>
          
          <!-- Empty grid prompt message -->
          <div v-if="isToolGridEmpty" class="empty-grid-prompt">
            Drag an item here to use as a tool
          </div>
        </div>
      </div>
      
      <!-- Working Area -->
      <div class="working-area"
           @dragover="handleDragOver($event, 'working')"
           @dragenter="handleDragEnter($event, 'working')"
           @dragleave="handleDragLeave"
           @drop="handleDrop($event, 'working')"
           :class="{ 'drop-target': dropTarget === 'working' }">
        <div class="working-grid">
          <div 
            class="inventory-slot working-slot" 
            :class="{ 'has-item': item }" 
            v-for="(item, index) in workingItems" 
            :key="item ? item.id : 'working-'+index"
            @click="item && handleItemClick(item)"
            @mouseenter="item && handleItemMouseEnter(item)"
            @mouseleave="handleItemMouseLeave"
            :draggable="item ? true : false"
            @dragstart="item && handleDragStart($event, item, 'working')"
          >
            <div v-if="item" class="item-container" :class="getRarityClass(item.value)">
              <img :src="item.imageUrl" class="item-image" :alt="item.name" />
            </div>
          </div>
          <!-- Add empty slots to fill the grid if needed -->
          <div 
            class="inventory-slot working-slot" 
            v-for="n in Math.max(0, 5 - (workingItems ? workingItems.length : 0))" 
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
  height: 11%;
  bottom: 40%;
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

.working-slot {
  /* Working slots already have the dashed border from .inventory-slot */
  cursor: grab;
}

.drop-target {
  outline: 2px solid rgba(255, 215, 0, 0.7);
  background-color: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
}

.inventory-slot[draggable=true] {
  cursor: grab;
}

.inventory-slot[draggable=true]:active {
  cursor: grabbing;
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