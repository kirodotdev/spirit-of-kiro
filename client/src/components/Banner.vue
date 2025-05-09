
<template>
  <div 
    class="banner" 
    :class="{ 'banner-visible': isVisible }"
    :style="{ 
      position: 'absolute',
      left: `${col * tileSize}px`,
      top: `${row * tileSize}px`,
      width: `${width * tileSize}px`
     }"
  >
    {{ currentMessage }}
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';

const props = defineProps<{
  row: number,
  col: number,
  width: number,
  tileSize: number
}>();

const gameStore = useGameStore();
const currentMessage = ref('');
const isVisible = ref(false);
let hideTimeout: number | null = null;

const showMessage = (message: string, duration: number) => {
  // Clear any existing timeout
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  
  // Show new message
  currentMessage.value = message;
  isVisible.value = true;
  
  // Set timeout to hide message
  hideTimeout = setTimeout(() => {
    isVisible.value = false;
    currentMessage.value = '';
  }, duration);
};

// Set up event listener for announcements
let announcementListenerId: string;

onMounted(() => {
  announcementListenerId = gameStore.addEventListener('announce', (data) => {
    if (data && typeof data.message === 'string' && typeof data.duration === 'number') {
      showMessage(data.message, data.duration);
    }
  });
});

onUnmounted(() => {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
  }
  gameStore.removeEventListener('announce', announcementListenerId);
});
</script>

<style scoped>
.banner {
  position: absolute;
  top: 0;
  margin: 0 auto;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 0 0 8px 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 1000;
}

.banner-visible {
  opacity: 1;
}
</style>
