<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import dispenserImage from '../assets/chute.png';
import panel from '../assets/panel-background.png';
import { useGameStore } from '../stores/game';
import GameItem from './GameItem.vue';

const props = defineProps<{
  id: string,
  row: number;
  col: number;
  tileSize: number;
  width: number;
  depth: number;
  height: number;
  playerIsNear: boolean;
}>();

const isPulling = ref(false);
const isShaking = ref(false);
const gameStore = useGameStore();

// Progress bar variables
const showProgressBar = ref(false);
const progress = ref(0);
let progressInterval: number | null = null;

// Function to animate the progress over 20 seconds
function startProgressAnimation() {
  // Reset progress
  progress.value = 0;
  showProgressBar.value = true;
  
  // Clear any existing interval
  if (progressInterval) {
    clearInterval(progressInterval);
  }
  
  // Set up the interval to update progress
  // 20 seconds = 20000ms
  // We'll update every 100ms, so 20000/100 = 200 steps
  // Each step increases progress by 0.5%
  progressInterval = setInterval(() => {
    progress.value += 0.5;
    
    // If we've reached 100%, clear the interval
    if (progress.value >= 100) {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    }
  }, 100);
}

function handleLeverPulled() {
  // Start shaking when lever is pulled
  isShaking.value = true;
  
  // Start the progress animation
  startProgressAnimation();
}

function spawnItemGameObject(data: any) {
  // Check if the item has a story (newly generated) or not (from inventory)
  const isFromInventory = data && data.item && !data.story;
  
  if (data && data.story) {
    gameStore.emitEvent('announce', {
      message: data.story,
      duration: 10000
    });
  }

  // First, add the received item to the game store
  if (data && data.item) {    
    // Extract the itemId from the event data
    const itemId = data.item.id;
    
    // Position it slightly offset from the dispenser
    const itemRow = props.row + props.depth + 2;
    const itemCol = props.col + props.width / 2 + .5;
    const itemHeight = 1.5;
    
    // Add a new game object for the pulled item
    gameStore.addObject({
      id: itemId,
      type: GameItem,
      row: itemRow,
      col: itemCol,
      width: 1,
      depth: 1,
      height: 1,
      props: { 
        itemId,
        pickedUp: isFromInventory // Set pickedUp flag to true for items from inventory, false for newly generated items
      },
      physics: {
        active: true,
        angle: Math.floor(Math.random() * (100 - 80 + 1)) + 80,
        velocity: 10,
        friction: 2,
        height: itemHeight,
        verticalVelocity: -1,
        bounceStrength: 0.4,
        mass: 1.0 // Default mass of 1.0
      }
    });
  }
  
  // Stop the shake animation after the item is spawned
  isShaking.value = false;
  
  // Hide the progress bar when the item is spawned
  showProgressBar.value = false;
  
  // Clear any existing interval
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

let leverPulledListenerId: string;
let pulledItemListenerId: string;

onMounted(() => {
  leverPulledListenerId = gameStore.addEventListener('lever-pulled', handleLeverPulled);
  pulledItemListenerId = gameStore.addEventListener('pulled-item', spawnItemGameObject);
});

onUnmounted(() => {
  gameStore.removeEventListener('lever-pulled', leverPulledListenerId);
  gameStore.removeEventListener('pulled-item', pulledItemListenerId);
  
  // Clean up interval if component is unmounted
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
});
</script>

<template>
  <div :style="{
    position: 'absolute',
    top: `${row * tileSize}px`,
    left: `${col * tileSize}px`,
    width: `${width * tileSize}px`,
    height: `${depth * tileSize}px`,
    border: gameStore.debug ? '1px solid red': 'none'
  }">
    <div v-if="playerIsNear && !isPulling" class="interact-prompt">E</div>
    <img 
      :src="panel" 
      :style="{
        position: 'absolute',
        width: `${(width + 2) * (tileSize)}px`,
        top: `${-tileSize * 1.5}px`,
        left: `${-tileSize * .4}px`
      }"
    />
    <!-- Progress bar -->
    <div v-if="showProgressBar" class="progress-bar-container" :style="{
      position: 'absolute',
      top: `${-tileSize * 1.2}px`,
      left: `${tileSize * .1}px`,
      width: `${width * tileSize * .9}px`,
      zIndex: 10
    }">
      <div class="progress-bar-background">
        <div class="progress-bar-fill" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>
    <img 
      :src="dispenserImage" 
      :width="width * tileSize" 
      :height="4 * tileSize"
      :style="{
        position: 'absolute',
        top: `${-tileSize}px`
      }"
      :class="['dispenser', { 'dispenser-active': playerIsNear, 'dispenser-pulling': isPulling, 'dispenser-shaking': isShaking }]"
      alt="Dispenser"
    />
    <!-- Height visualization line (only visible in debug mode) -->
    <div v-if="gameStore.debug" class="height-line" :style="{
      position: 'absolute',
      left: '0',
      bottom: '0',
      width: '2px',
      height: `${height * tileSize}px`,
      backgroundColor: 'blue',
      zIndex: 1000
    }" />
  </div>
</template>

<style scoped>
.dispenser {
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
  object-fit: contain;
  transition: filter 0.3s ease;
}

.dispenser-shaking {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) infinite;
  transform-origin: top center;
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  10%, 30%, 50%, 70%, 90% { transform: rotate(-2deg); }
  20%, 40%, 60%, 80% { transform: rotate(2deg); }
}

/* Progress bar styles */
.progress-bar-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.progress-bar-background {
  width: 100%;
  height: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.progress-bar-fill {
  height: 100%;
  background-color: #4CAF50; /* Green color */
  border-radius: 4px;
  transition: width 0.1s linear;
}
</style>
