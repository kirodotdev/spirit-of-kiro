
<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue';
import { useGameStore } from '../stores/game';

const gameStore = useGameStore();
const props = defineProps<{
  show: boolean;
  workbenchImage: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'action', action: string): void;
}>();

const handleAction = (action: string) => {
  emit('action', action);
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  // Ensure interaction is unlocked when component unmounts
  if (props.show) {
    gameStore.interactionLocked = false;
  }
});

// Watch for changes to show prop to lock/unlock interaction
watch(() => props.show, (newValue) => {
  if (newValue) {
    gameStore.interactionLocked = true;
  } else {
    gameStore.interactionLocked = false;
  }
}, { immediate: true });
</script>

<template>
  <div v-if="show" class="fullscreen-overlay">
    <div class="workbench-container" :style="{ backgroundImage: `url(${workbenchImage})` }">
      <button class="close-button" @click="$emit('close')">Back</button>
      
      <div class="items-area">
        <div class="item-slots">
          <div class="item-slot">Item 1</div>
          <div class="item-slot">Item 2</div>
        </div>
      </div>

      <div class="tools-area">
        
      </div>
    </div>
  </div>
</template>

<style scoped>
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.workbench-container {
  position: relative;
  width: min(90vh, 90vw); /* Use the smaller of viewport width or height */
  height: min(90vh, 90vw); /* Match width to maintain square ratio */
  max-width: min(90vh, 1200px);
  max-height: min(90vh, 1200px);
  margin: auto;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  justify-content: center;
  align-items: top;
  padding-top: 8%;
}

.action-buttons {  
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 60%;
  max-width: 700px;
  z-index: 10;
}

.button-group {
  background: rgba(50, 50, 50, 0.8);
  padding: 8px;
  border-radius: 8px;
}

.button-group-title {
  color: white;
  margin-bottom: 6px;
  font-size: 1em;
  text-align: center;
}

.button-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-start;
  /* Add after pseudo elements to fill last row */
  &::after {
    content: "";
    flex: auto;
  }
}

.action-btn {
  padding: 6px 8px;
  background: #d4d4d4;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  font-size: 12px;
  width: calc(20% - 6px); /* 5 buttons per row with gap consideration */
  flex: 0 0 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-btn:hover {
  background: #c0c0c0;
  transform: scale(1.05);
}

.action-btn:disabled {
  background: #a0a0a0;
  cursor: not-allowed;
  transform: none;
}

.action-btn:active {
  transform: scale(0.95);
}

.close-button {
  position: absolute;
  top: 5%;
  left: 0px;
  margin-right: 5%;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10%;
  transition: background-color 0.3s;
  padding: 1%;
  z-index: 20;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.items-area {
  position: absolute;
  top: 50%;
  left: 12%;
  width: 76%;
  height: 20%;
  border-radius: 8px;
  color: white;
  z-index: 10;
}

.items-label {
  font-size: 1.2em;
  margin-bottom: 10px;
  text-align: center;
  color: #fff;
}

.item-slots {
  display: flex;
  gap: 10px;
  height: 100%;
}

.item-slot {
  width: 50%;
  height: 100%;
  background: transparent;
  border: 3px dashed rgb(113, 67, 31);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9em;
  cursor: pointer;
  transition: border-color 0.3s, background-color 0.3s;
}
</style>
