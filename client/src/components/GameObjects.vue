
<template>
  <div class="game-objects">
    <template v-for="obj in sortedGameObjects" :key="obj.id">
      <component :is="obj.type" 
        :id="obj.id"
        :col="(obj.col - 1)" 
        :row="(obj.row - 1)" 
        :tileSize="tileSize"
        :width="obj.width || 1"
        :depth="obj.depth || 1"
        :height="obj.height || 1"
        :playerIsNear="obj.playerIsNear"
        :physics="obj.physics"
        :props="obj.props" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GameObject } from '@/systems/game-object-system';

interface Props {
  gameObjects: GameObject[];
  tileSize: number;
}

const props = defineProps<Props>();

const sortedGameObjects = computed(() => {
  return [...props.gameObjects].sort((a, b) => {
    // Sort from back to front (top to bottom, left to right)
    return (a.row) - (b.row);
  });
});
</script>

<style>
.game-objects {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
