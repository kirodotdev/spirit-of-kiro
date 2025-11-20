<template>
  <div class="floating-particles">
    <div
      v-for="particle in particles"
      :key="particle.id"
      class="particle"
      :style="particle.style"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Particle {
  id: number
  style: {
    left: string
    width: string
    height: string
    animationDuration: string
    animationDelay: string
    opacity: number
  }
}

// Props
interface Props {
  count?: number // Number of particles (default: 30)
  color?: string // Particle color (default: gold)
  minSize?: number // Minimum particle size in px (default: 2)
  maxSize?: number // Maximum particle size in px (default: 6)
  minDuration?: number // Minimum animation duration in seconds (default: 10)
  maxDuration?: number // Maximum animation duration in seconds (default: 25)
}

const props = withDefaults(defineProps<Props>(), {
  count: 30,
  color: 'rgba(218, 165, 32, 0.6)',
  minSize: 2,
  maxSize: 6,
  minDuration: 10,
  maxDuration: 25
})

// Generate particles
const particles = ref<Particle[]>([])

const generateParticles = () => {
  particles.value = Array.from({ length: props.count }, (_, index) => {
    const size = Math.random() * (props.maxSize - props.minSize) + props.minSize
    const duration = Math.random() * (props.maxDuration - props.minDuration) + props.minDuration
    const delay = Math.random() * 5
    const left = Math.random() * 100
    const opacity = Math.random() * 0.4 + 0.3 // 0.3 to 0.7
    
    return {
      id: index,
      style: {
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        opacity
      }
    }
  })
}

onMounted(() => {
  generateParticles()
})
</script>

<style scoped>
.floating-particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.particle {
  position: absolute;
  bottom: -10px;
  background: radial-gradient(circle, v-bind(color) 0%, transparent 70%);
  border-radius: 50%;
  animation: float-up linear infinite;
  will-change: transform, opacity;
}

@keyframes float-up {
  0% {
    transform: translateY(0) translateX(0) scale(0);
    opacity: 0;
  }
  10% {
    opacity: var(--particle-opacity, 0.6);
  }
  50% {
    transform: translateY(-50vh) translateX(20px) scale(1);
  }
  90% {
    opacity: var(--particle-opacity, 0.6);
  }
  100% {
    transform: translateY(-100vh) translateX(-20px) scale(0.8);
    opacity: 0;
  }
}

/* Reduce motion for accessibility */
@media (prefers-reduced-motion: reduce) {
  .particle {
    animation: none;
    opacity: 0.2;
  }
}
</style>
