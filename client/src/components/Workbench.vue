<script setup lang="ts">
import workbenchImage from '../assets/workbench.png';
import workbenchZoomImage from '../assets/workbench-zoom.png';
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';
import WorkbenchFullscreen from './WorkbenchFullscreen.vue';

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
const showFullscreen = ref(false);

function handlePlayerInteraction() {
  if (!props.playerIsNear) {
    return;
  }
  showFullscreen.value = true;
}

let interactionListenerId: string;

onMounted(() => {
  interactionListenerId = gameStore.addEventListener('player-interaction', handlePlayerInteraction);
});

onUnmounted(() => {
  gameStore.removeEventListener('player-interaction', interactionListenerId);
});

const closeFullscreen = () => {
  showFullscreen.value = false;
};
</script>

<template>
  <div>
    <!-- Regular workbench view -->
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
        :src="workbenchImage" 
        :width="width * tileSize" 
        :height="depth * tileSize"
        :class="['workbench', { 'workbench-active': playerIsNear }]"
        alt="Workbench"
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

    <WorkbenchFullscreen
      :show="showFullscreen"
      :workbench-image="workbenchZoomImage"
      @close="closeFullscreen"
    />
  </div>
</template>

<style scoped>
.workbench {
  filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.5));
  object-fit: contain;
  transition: filter 0.3s ease;
}

.workbench-active {
  filter: drop-shadow(0 0 15px white);
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

@keyframes pulse {
  0% { opacity: 0.5; }
  50% { opacity: 1; }
  100% { opacity: 0.5; }
}
</style>