
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import leverImage from '../assets/lever.png';
import { useGameStore } from '../stores/game';

const props = defineProps<{
  id: string,
  row: number;
  col: number;
  tileSize: number;
  width: number;
  depth: number;
  height: number;
  playerIsNear: boolean;
  props: {
    pivotPoint?: 'top' | 'middle' | 'bottom' | { x: number, y: number };
    initialAngle?: number;
    maxRotationAngle?: number;
    rotationSpeed?: number;
    autoReset?: boolean;
    resetDelay?: number;
    resetSpeed?: number;
  }
}>();

const isPulling = ref(false);
const isRotating = ref(false);
const isPulled = ref(false);
const currentRotation = ref(props.props.initialAngle || 0);
const gameStore = useGameStore();
const localInventory = ref<any[]>([]);

function handlePlayerInteraction() {
  if (!props.playerIsNear || isPulling.value || isRotating.value) {
    return;
  }

  // Start pulling
  isPulling.value = true;
  
  // Start rotation animation
  isRotating.value = true;
  
  // Animate rotation
  const initialAngle = props.props.initialAngle || 0;
  const maxAngle = props.props.maxRotationAngle || 60;
  const rotationSpeed = props.props.rotationSpeed || 100;
  
  // Simple animation using setTimeout
  const startTime = Date.now();
  const animateRotation = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / rotationSpeed, 1);
    currentRotation.value = initialAngle + progress * (maxAngle - initialAngle);
    
    if (progress < 1) {
      requestAnimationFrame(animateRotation);
    } else {
      // Rotation complete
      isRotating.value = false;
      isPulled.value = true;
      isPulling.value = false;
      
      // Emit lever-pulled event
      gameStore.emitEvent('lever-pulled');
      
      // Check if we have local inventory items to prioritize
      if (localInventory.value.length > 0) {
        // Pop an item from the local inventory
        const item = localInventory.value.shift();
        // Emit the pulled-item event with the local item
        gameStore.emitEvent('pulled-item', { item });
      } else {
        // If no local items, request a new one from the server
        gameStore.pullItem();
      }
      
      // Auto reset if configured
      if (props.props.autoReset) {
        setTimeout(() => {
          resetLever();
        }, props.props.resetDelay || 2000);
      }
    }
  };
  
  animateRotation();
}

function resetLever() {
  if (!isPulled.value || isRotating.value) {
    return;
  }
  
  // Start reset animation
  isRotating.value = true;
  
  // Animate reset rotation
  const resetSpeed = props.props.resetSpeed || props.props.rotationSpeed || 100;
  
  // Simple animation using setTimeout
  const startTime = Date.now();
  const animateReset = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / resetSpeed, 1);
    const initialAngle = props.props.initialAngle || 0;
    const maxAngle = props.props.maxRotationAngle || 60;
    currentRotation.value = initialAngle + (1 - progress) * (maxAngle - initialAngle);
    
    if (progress < 1) {
      requestAnimationFrame(animateReset);
    } else {
      // Reset complete
      isRotating.value = false;
      isPulled.value = false;
      
      // Emit event when lever is reset
      gameStore.emitEvent('lever-reset', {
        leverId: props.id
      });
    }
  };
  
  animateReset();
}

// Handle inventory list response from server
function handleInventoryList(data: any, eventType?: string) {
  if (data && Array.isArray(data)) {
    localInventory.value = data;
  }
}

// Calculate pivot point based on configuration
const getPivotPoint = () => {
  const pivotConfig = props.props.pivotPoint || 'bottom';
  
  if (typeof pivotConfig === 'object') {
    // Custom pivot point
    return `${pivotConfig.x}% ${pivotConfig.y}%`;
  }
  
  // Predefined pivot points
  switch (pivotConfig) {
    case 'top':
      return '50% 0%';
    case 'middle':
      return '50% 50%';
    case 'bottom':
    default:
      return '50% 100%';
  }
};

let interactionListenerId: string;
let inventoryListenerId: string;

onMounted(() => {
  interactionListenerId = gameStore.addEventListener('player-interaction', handlePlayerInteraction);
  inventoryListenerId = gameStore.addEventListener('inventory-items:main', handleInventoryList);
  
  // Fetch inventory when component mounts
  gameStore.listInventory(`${gameStore.userId}:main`);
});

onUnmounted(() => {
  gameStore.removeEventListener('player-interaction', interactionListenerId);
  gameStore.removeEventListener('inventory-items:main', inventoryListenerId);
});
</script>

<template>
  <div :style="{
    position: 'absolute',
    top: `${row * tileSize}px`,
    left: `${col * tileSize}px`,
    width: `${width * tileSize}px`,
    height: `${depth * tileSize}px`,
    border: gameStore.debug ? '1px solid red': 'none',
    zIndex: 10
  }">
    <div v-if="playerIsNear && !isPulling && !isPulled" class="interact-prompt">E</div>
    <img 
      :src="leverImage" 
      :height="depth * tileSize"
      :style="{
        position: 'absolute',
        top: `${-tileSize * 2}px`,
        transformOrigin: getPivotPoint(),
        transform: `rotate(${currentRotation}deg)`
      }"
      :class="['lever', { 'lever-active': playerIsNear, 'lever-pulling': isPulling }]"
      alt="Lever"
    />
  </div>
</template>

<style scoped>
.lever {
  filter: none;
  object-fit: contain;
  transition: filter 0.3s ease;
}

.lever-active {
  filter: drop-shadow(0 0 15px white);
}

.lever-pulling {
  animation: pulse 1s infinite;
}

.interact-prompt {
  position: absolute;
  top: -80%;
  right: -10%;
  font-size: calc(0.5 * v-bind(tileSize))px;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 5px white;
  background-color: black;
  padding: 5px 10px;
  border-radius: 4px;
}

@keyframes pulse {
  0% { filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.5)); }
  50% { filter: drop-shadow(0 0 30px rgba(255, 255, 255, 1)); }
  100% { filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.5)); }
}
</style>
