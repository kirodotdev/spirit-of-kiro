<script setup lang="ts">
import computerImage from '../assets/computer.png';
import { useGameStore } from '../stores/game';
import { ref, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia'

const props = defineProps<{
  row: number;
  col: number;
  tileSize: number;
  width: number;
  depth: number;
  height: number;
  playerIsNear: boolean;
}>();

const gameStore = useGameStore();
const { heldItemId } = storeToRefs(gameStore);
let interactionListenerId: string;

// Function to handle player interaction with the computer
const interaction = () => {
  if (!props.playerIsNear) {
    return;
  }

  // Emit peek-discarded event
  gameStore.peekDiscarded(5); // Peek at 5 discarded items
};

onMounted(() => {
  interactionListenerId = gameStore.addEventListener('player-interaction', interaction);
});

onUnmounted(() => {
  // Clean up event listener
  gameStore.removeEventListener('player-interaction', interactionListenerId);
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
    <div v-if="playerIsNear" class="interact-prompt">E</div>
    <img 
      :src="computerImage" 
      :width="width * tileSize" 
      :style="{
        position: 'absolute',
        top: `-${tileSize * 1}px`
      }"
      :class="['computer', { 'computer-active': playerIsNear }]"
      alt="Computer"
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
.computer {
  filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.5));
  object-fit: contain;
  transition: filter 0.3s ease;
}

.computer-active {
  filter: drop-shadow(0 0 15px white);
}

.interact-prompt {
  position: absolute;
  top: calc(-.3 * v-bind(tileSize) * 1px);
  left: calc(2 * v-bind(tileSize) * 1px);
  font-size: calc(0.5 * v-bind(tileSize) * 1px);
  font-weight: bold;
  color: white;
  text-shadow: 0 0 5px white;
  animation: pulse 1s infinite;
  background-color: black;
  padding: calc(0.1 * v-bind(tileSize) * 1px) calc(0.1 * v-bind(tileSize) * 1px);
  border-radius: calc(0.08 * v-bind(tileSize) * 1px);
  z-index: 1;
  line-height: 1;
}

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
</style> 