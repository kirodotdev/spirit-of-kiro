<script setup lang="ts">
import { type PhysicsProperties } from '../utils/physics';
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useGameStore } from '../stores/game';
import ItemDialog from './ItemDialog.vue';

const store = useGameStore();

interface Props {
  id: string;
  row: number;
  col: number;
  tileSize: number;
  width: number;
  height: number;
  depth: number;
  playerIsNear: boolean;
  physics?: PhysicsProperties;
  props: {
    itemId: string; // Now we only pass the itemId
    pickedUp: boolean; // Whether the item has been picked up before
  };
}

const props = defineProps<Props>();

// Get the item details directly from the itemsById Map
const item = store.itemsById.get(props.props.itemId);

// Dialog state
const showDialog = ref(false);

// Use the item's imageUrl if available, otherwise use generic.png
const icon = computed(() => item?.imageUrl || '/src/assets/generic.png');

// Determine CSS class based on item value
const getRarityClass = computed(() => {
  if (!item || item.value === undefined) return 'item-common';
  
  const value = item.value;
  if (value > 1000) return 'item-legendary';
  if (value > 500) return 'item-epic';
  if (value > 250) return 'item-rare';
  if (value > 100) return 'item-uncommon';
  return 'item-common';
});

// Calculate shadow opacity based on item height
const shadowOpacity = computed(() => {
  const height = props.physics?.height || 0;
  // Linear decrease from 0.3 to 0 as height increases from 0 to 4
  return Math.max(0, 0.3 * (1 - height / 4));
});

function handlePlayerInteraction() {
  if (!props.playerIsNear || !item) {
    return;
  }

  // If the item hasn't been picked up yet, show the dialog first
  if (!props.props.pickedUp) {
    showDialog.value = true;
    // Lock player interaction while dialog is open
    store.interactionLocked = true;
    return;
  }

  completePickup();
}

function handleDialogClose() {
  showDialog.value = false;
  store.interactionLocked = false;
  
  // Complete the pickup process (the item is now considered picked up)
  completePickup();
}

function completePickup() {
  // Remove the item from the game world so it no longer renders
  // but we will keep it inside of the item list, so that the
  // player can pick it up.
  store.removeObject(props.id);

  // Emit item pickup events. The PlayerCharacter component subscribes
  // to this event.
  store.emitEvent('item-pickup', {
    id: props.props.itemId
  });
}

let interactionListenerId: string;
let inspectItemListenerId: string;

onMounted(() => {
  interactionListenerId = store.addEventListener('player-interaction', handlePlayerInteraction);
  inspectItemListenerId = store.addEventListener('inspect-item', (data) => {
    if (data && data.id === props.props.itemId) {
      showDialog.value = true;
      store.interactionLocked = true;
    }
  });
});

onUnmounted(() => {
  store.removeEventListener('player-interaction', interactionListenerId);
  store.removeEventListener('inspect-item', inspectItemListenerId);
  // Make sure to unlock interactions if component is unmounted while dialog is open
  if (showDialog.value) {
    store.interactionLocked = false;
  }
});
</script>

<template>
  <div 
    class="game-item"
    :style="{
      position: 'absolute',
      top: `${row * tileSize - ((physics?.height || 0) * tileSize)}px`,
      left: `${col * tileSize}px`,
      width: `${tileSize * width}px`,
      height: `${tileSize * depth}px`,
      transform: `scale(${1 + ((physics?.height || 0) * .1)})`,
      transition: 'transform 0.1s ease-out',
      border: store.debug ? '1px solid red': 'none'
    }"
  >
    <!-- Ground tile outline (always visible in debug mode) -->
    <div v-if="store.debug" 
         :style="{
           position: 'absolute',
           top: `${(physics?.height || 0) * tileSize}px`,
           left: '0',
           width: `${tileSize * width}px`,
           height: `${tileSize * depth}px`,
           border: '1px solid red',
           zIndex: 999
         }">
    </div>
    <div v-if="store.debug && physics?.active" 
         class="debug-vector"
         :style="{
           transform: `rotate(${physics.angle}deg)`,
           width: `${physics.velocity * tileSize}px`
         }">
    </div>
    <!-- Height visualization line (only visible in debug mode) -->
    <div v-if="store.debug" 
         class="height-line"
         :style="{
           position: 'absolute',
           left: '0',
           bottom: '0',
           width: '2px',
           height: `${height * tileSize}px`,
           backgroundColor: 'blue',
           zIndex: 1000
         }">
    </div>
    <!-- Drop shadow under item at ground level -->
    <div
      class="item-shadow"
      :style="{
        position: 'absolute',
        bottom: `-${(physics?.height || 0) * tileSize + (tileSize * 0.2)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${tileSize * width * 0.7}px`,
        height: `${tileSize * depth * 0.2}px`,
        backgroundColor: `rgba(0, 0, 0, ${shadowOpacity})`,
        borderRadius: '50%',
        filter: 'blur(3px)',
        zIndex: -1
      }"
    ></div>
    <div class="item-container" :class="[{ 'item-near': playerIsNear }, getRarityClass]">
      <div v-if="playerIsNear" class="interact-prompt">E</div>
      <img :src="icon" alt="Item" class="item-image" />
    </div>
    <!--<div class="item-name" :class="getRarityClass">{{ item?.name || 'Unknown Item' }}</div>-->
  </div>
  
  <!-- Use the extracted ItemDialog component -->
  <ItemDialog 
    :item="item" 
    :visible="showDialog" 
    :image-url="icon" 
    :rarity-class="getRarityClass" 
    @close="handleDialogClose"
  />
</template>

<style scoped>
.game-item {
  pointer-events: none;
}

.item-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  position: relative;
}

.item-near {
  
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 10px;
  transition: transform 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
  border: 2px solid #333;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.item-near .item-image {
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}

.item-name {
  position: absolute;
  bottom: -24px;
  left: 0;
  width: 100%;
  color: white;
  font-size: 12px;
  text-align: center;
  padding: 4px;
  word-break: break-word;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* Apply different colors based on item rarity */
.item-common .item-name {
  color: #ffffff;
}

.item-uncommon .item-name {
  color: #4caf50;
}

.item-rare .item-name {
  color: #2196f3;
}

.item-epic .item-name {
  color: #9c27b0;
  text-shadow: 0 0 4px rgba(156, 39, 176, 0.6);
}

.item-legendary .item-name {
  color: #ff9800;
  text-shadow: 0 0 6px rgba(255, 152, 0, 0.8);
  animation: pulse-glow 2s infinite;
}

/* Apply rarity-based styling to item images */
.item-common .item-image {
  border-color: #333;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.item-uncommon .item-image {
  border-color: #4caf50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
}

.item-rare .item-image {
  border-color: #2196f3;
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.3);
}

.item-epic .item-image {
  border-color: #9c27b0;
  box-shadow: 0 0 10px rgba(156, 39, 176, 0.3);
}

.item-legendary .item-image {
  border-color: #ff9800;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
  animation: image-pulse 2s infinite;
}

@keyframes pulse-glow {
  0% { text-shadow: 0 0 4px rgba(255, 152, 0, 0.6); }
  50% { text-shadow: 0 0 10px rgba(255, 152, 0, 0.9); }
  100% { text-shadow: 0 0 4px rgba(255, 152, 0, 0.6); }
}

@keyframes image-pulse {
  0% { box-shadow: 0 0 10px rgba(255, 152, 0, 0.3); }
  50% { box-shadow: 0 0 20px rgba(255, 152, 0, 0.6); }
  100% { box-shadow: 0 0 10px rgba(255, 152, 0, 0.3); }
}

.debug-vector {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 2px;
  background-color: orange;
  transform-origin: left center;
  z-index: 1000;
}

.ground-tile-outline {
  pointer-events: none;
  box-sizing: border-box;
  background-color: rgba(255, 0, 0, 0.1);
}

.interact-prompt {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: calc(0.5 * v-bind(tileSize))px;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 5px white;
  background-color: black;
  padding: 5px 10px;
  border-radius: 4px;
}


</style>