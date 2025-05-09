
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

function handleLeverPulled() {
  // Start shaking when lever is pulled
  isShaking.value = true;
}

function spawnItemGameObject(data: any) {
  if (data && data.story) {
    gameStore.emitEvent('announce', {
      message: data.story,
      duration: 10000
    });
  }

  // First, add the received item to the game store
  if (data && data.item) {
    // Add the received item to the game store
    const item = data.item;
    gameStore.addItem(item);
    
    // Extract the itemId from the event data
    const itemId = item.id;
    
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
        pickedUp: false // Set pickedUp flag to false for new items from dispenser
      },
      physics: {
        active: true,
        angle: Math.floor(Math.random() * (100 - 80 + 1)) + 80,
        velocity: 10,
        friction: 0.90,
        height: itemHeight,
        verticalVelocity: -1,
        bounceStrength: 0.4,
        mass: 1.0 // Default mass of 1.0
      }
    });
  }
  
  // Stop the shake animation after the item is spawned
  isShaking.value = false;
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
</style>
