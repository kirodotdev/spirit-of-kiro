
<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from './stores/game'
import { useRouter } from 'vue-router'

const gameStore = useGameStore()
const router = useRouter()

onMounted(() => {
  // Initialize WebSocket at app root level
  gameStore.initWebSocket()
})

onUnmounted(() => {
  // Clean up WebSocket resources when app is unmounted
  gameStore.cleanup()
})

// Add watcher for authentication state changes
watch(() => gameStore.isAuthenticated, (newValue, oldValue) => {
  // If user was authenticated and now is not, redirect to auth page
  if (oldValue === true && newValue === false) {
    router.push('/auth')
  }
})
</script>

<template>
  <div class="app">
    <router-view />
  </div>
</template>

