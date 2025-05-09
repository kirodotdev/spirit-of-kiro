<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/game';

interface Props {
  gridSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  gridSize: 30
});

const gameStore = useGameStore();
const totalWidth = computed(() => props.gridSize * gameStore.tileSize);
const totalHeight = computed(() => props.gridSize * gameStore.tileSize);
</script>

<template>
  <div class="game-grid" :style="{ width: `${totalWidth}px`, height: `${totalHeight}px` }">
    <svg :width="totalWidth" :height="totalHeight" v-if="gameStore.debug" style="z-index: 100;">
      <template v-for="row in gridSize" :key="row">
        <template v-for="col in gridSize" :key="`${row}-${col}`">
          <rect 
            :x="(col - 1) * gameStore.tileSize" 
            :y="(row - 1) * gameStore.tileSize" 
            :width="gameStore.tileSize" 
            :height="gameStore.tileSize" 
            fill="transparent"
            stroke="#ccc" 
            stroke-width="1" 
          />
        </template>
      </template>
    </svg>
  </div>
</template>

<style scoped>
.game-grid {
  position: absolute;
  top: 0;
  left: 0;
  background-image: url('../assets/background.png');
  background-size: cover;
}
</style>