<template>
  <div 
    class="hint-display" 
    :class="{ 'hint-visible': isVisible }"
    v-html="currentHint"
  >
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';

const gameStore = useGameStore();
const currentHint = ref('');
const isVisible = ref(false);
let hideTimeout: number | null = null;

const showHint = (hint: string, duration?: number) => {
  // Clear any existing timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  
  // Show new hint
  currentHint.value = hint;
  isVisible.value = true;
  
  // Set timeout to hide hint if duration is provided
  if (duration) {
    hideTimeout = setTimeout(() => {
      isVisible.value = false;
      currentHint.value = '';
    }, duration);
  }
};

const clearHint = () => {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }
  isVisible.value = false;
  currentHint.value = '';
};

// Set up event listeners
let hintListenerId: string;
let clearHintListenerId: string;

onMounted(() => {
  hintListenerId = gameStore.addEventListener('hint', (data) => {
    if (data && typeof data.message === 'string') {
      showHint(data.message, data.duration);
    }
  });
  
  clearHintListenerId = gameStore.addEventListener('clear-hint', () => {
    clearHint();
  });
});

onUnmounted(() => {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  gameStore.removeEventListener('hint', hintListenerId);
  gameStore.removeEventListener('clear-hint', clearHintListenerId);
});
</script>

<style scoped>
.hint-display {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  max-width: 300px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 1000;
  text-align: left;
}

.hint-visible {
  opacity: 1;
}
</style>