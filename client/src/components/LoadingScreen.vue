<template>
  <div class="loading-screen" v-if="showLoadingScreen">
    <div class="loading-content">
      <h1>Loading Game Assets</h1>
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <div class="progress-text">
        {{ progressPercent }}% Complete
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PreloadProgress } from '../systems/preloader-system'

const props = defineProps<{
  progress: PreloadProgress
}>()

const initialLoadComplete = ref(false)

const showLoadingScreen = computed(() => {
  if (initialLoadComplete.value) return false
  return props.progress.pending > 0 || props.progress.failed > 0
})

const progressPercent = computed(() => {
  if (props.progress.total === 0) return 0
  return Math.round((props.progress.loaded / props.progress.total) * 100)
})

// Watch for when loading completes and mark initial load as done
watch(() => props.progress.pending, (newPending) => {
  if (newPending === 0) {
    initialLoadComplete.value = true
  }
})
</script>

<style scoped>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #000000;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.loading-content {
  text-align: center;
  color: white;
  padding: 2rem;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.5);
  min-width: 300px;
}

h1 {
  margin-bottom: 2rem;
  font-size: 1.5rem;
}

.progress-container {
  width: 100%;
  height: 20px;
  background-color: #333;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-bar {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 1rem;
  color: #ccc;
}
</style> 