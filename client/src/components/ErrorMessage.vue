<template>
  <Transition name="error-fade">
    <div v-if="isVisible" class="error-message" :class="{ shake: shouldShake }">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ message }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

interface Props {
  message: string;
  autoDismiss?: boolean;
  dismissDelay?: number; // in milliseconds
}

const props = withDefaults(defineProps<Props>(), {
  autoDismiss: true,
  dismissDelay: 5000
});

const isVisible = ref(true);
const shouldShake = ref(false);

// Trigger shake animation on mount
onMounted(() => {
  shouldShake.value = true;
  
  // Remove shake class after animation completes
  setTimeout(() => {
    shouldShake.value = false;
  }, 500);
});

// Auto-dismiss after delay if enabled
if (props.autoDismiss) {
  setTimeout(() => {
    isVisible.value = false;
  }, props.dismissDelay);
}

// Watch for message changes to re-trigger shake
watch(() => props.message, () => {
  shouldShake.value = true;
  isVisible.value = true;
  
  setTimeout(() => {
    shouldShake.value = false;
  }, 500);
  
  if (props.autoDismiss) {
    setTimeout(() => {
      isVisible.value = false;
    }, props.dismissDelay);
  }
});
</script>

<style scoped>
.error-message {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(239, 68, 68, 0.95));
  border: 2px solid rgba(239, 68, 68, 0.8);
  border-radius: 8px;
  color: white;
  font-family: Georgia, serif;
  font-size: 0.95rem;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
  backdrop-filter: blur(10px);
  max-width: 500px;
  margin: 0 auto;
}

.error-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  line-height: 1.5;
}

/* Shake animation */
.shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-8px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(8px);
  }
}

/* Fade transition */
.error-fade-enter-active {
  transition: all 0.3s ease-out;
}

.error-fade-leave-active {
  transition: all 0.3s ease-in;
}

.error-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .error-message {
    font-size: 0.875rem;
    padding: 0.875rem 1.25rem;
    max-width: 90%;
  }
  
  .error-icon {
    font-size: 1.25rem;
  }
}
</style>
