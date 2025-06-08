<template>
  <div class="app">
    <LoadingScreen 
      :progress="gameStore.preloadProgress" 
    />
    <div class="control-buttons">
      <button class="debug-button" @click="gameStore.debug = !gameStore.debug">Toggle Debug</button>
      <div class="physics-indicator" :class="{ active: hasActivePhysics }">Physics</div>
    </div>
    <div class="game-container" :style="{width: `${tileSize * gridSize}px`, height: `${tileSize * gridSize}px`}">
      <GameGrid :grid-size="gridSize" :tile-size="tileSize" />
      <GameObjects :gameObjects="gameStore.objects" :tileSize="tileSize" />
      <HintDisplay />
      <HUD />
      <RandomChat />
    </div>
    <div class="connection-status" :class="{ connected: gameStore.wsConnected }" />
    <!-- Dialogs are not constantly visible, but will appear as needed -->
    <ItemDialog />
    <SellDialog />
    <DiscardDialog />
    <SkillResultDialog />
    <!-- Preloader component to keep static assets in memory -->
    <Preloader />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import GameGrid from '../components/GameGrid.vue'
import GameObjects from '../components/GameObjects.vue'
import HintDisplay from '../components/HintDisplay.vue'
import ItemDialog from '../components/ItemDialog.vue'
import SellDialog from '../components/SellDialog.vue'
import DiscardDialog from '../components/DiscardDialog.vue'
import SkillResultDialog from '../components/SkillResultDialog.vue'
import HUD from '../components/HUD.vue'
import RandomChat from '../components/RandomChat.vue'
import { setupGameObjects } from '../utils/init-world'
import { storeToRefs } from 'pinia'
import LoadingScreen from '../components/LoadingScreen.vue'
import Preloader from '../components/Preloader.vue'

const gridSize = ref(20)
const gameStore = useGameStore()
const { tileSize } = storeToRefs(gameStore);
const { hasActivePhysics } = storeToRefs(gameStore)

const calculateTileSize = () => {
  const minDimension = Math.min(window.innerWidth, window.innerHeight)
  tileSize.value = Math.floor(minDimension / gridSize.value)
}

const initializeWorld = () => {
  setupGameObjects(gameStore, gridSize.value)
}

onMounted(() => {
  calculateTileSize()
  window.addEventListener('resize', calculateTileSize)
  initializeWorld()
  // Blur any focused elements
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', calculateTileSize)
  gameStore.clearObjects()
  if (gameStore.ws) {
    gameStore.ws.close()
  }
})
</script>

<style scoped>
.app {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.game-container {
  position: relative;
}

.debug-button {
  top: 10px;
  left: 10px;
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.debug-button:hover {
  background-color: #45a049;
}

.control-buttons {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  z-index: 9999; /* Ensure debug panel is above all other elements */
}

.physics-indicator {
  padding: 4px 11px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.physics-indicator.active {
  background-color: #ff4444;
}

.connection-status {
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ff0000;
  transition: background-color 0.3s ease;
}

.connection-status.connected {
  background-color: #00ff00;
}
</style>
