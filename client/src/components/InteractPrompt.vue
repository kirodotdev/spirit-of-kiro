<template>
  <div v-if="show" class="interact-prompt">
    <span class="prompt-key">{{ key }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  show: boolean;
  key?: string;
}

withDefaults(defineProps<Props>(), {
  key: 'E'
});
</script>

<style scoped>
.interact-prompt {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  pointer-events: none;
  z-index: 100;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  animation: prompt-pulse 1.5s ease-in-out infinite;
}

.prompt-key {
  display: inline-block;
  min-width: 20px;
  text-align: center;
}

@keyframes prompt-pulse {
  0%, 100% {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateX(-50%) scale(1.1);
    opacity: 0.9;
  }
}

/* Hover effect when player is very close */
.interact-prompt:hover {
  background: rgba(76, 175, 80, 0.9);
  border-color: rgba(255, 255, 255, 0.6);
}
</style>
