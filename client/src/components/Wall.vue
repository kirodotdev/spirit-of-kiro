<script setup lang="ts">
import { useGameStore } from '../stores/game';

defineProps<{
  row: number;
  col: number;
  tileSize: number;
  width: number;
  depth: number;
  height: number;
}>();

const gameStore = useGameStore();
</script>

<template>
  <div :style="{
    position: 'absolute',
    top: `${row * tileSize}px`,
    left: `${col * tileSize}px`,
    width: `${width * tileSize}px`,
    height: `${depth * tileSize}px`,
    border: gameStore.debug ? '1px solid red': 'none',
  }">
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