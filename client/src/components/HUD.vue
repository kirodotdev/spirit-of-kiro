<template>
  <div class="hud">
    <div class="hud-bubble">
      <div class="gold-display">
        <div class="gold-icon"></div>
        <span class="gold-amount">{{ gold }}</span>
      </div>
      <div v-if="goldChange" class="gold-change" :class="{ 'positive': goldChange > 0, 'negative': goldChange < 0 }">
        {{ goldChange > 0 ? '+' : '' }}{{ goldChange }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref, watch } from 'vue'

const gameStore = useGameStore()
const persona = gameStore.usePersona()
const previousGold = ref(0)
const goldChange = ref(0)

const gold = computed(() => {
  return persona.value.gold || '0'
})

// Watch for gold changes and animate the difference
watch(gold, (newValue, oldValue) => {
  const newGold = parseInt(newValue || '0')
  const oldGold = parseInt(oldValue || '0')
  if (!isNaN(newGold) && !isNaN(oldGold)) {
    goldChange.value = newGold - oldGold
    // Clear the change after animation
    setTimeout(() => {
      goldChange.value = 0
    }, 2000)
  }
  previousGold.value = newGold
}, { immediate: true })
</script>

<style scoped>
.hud {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.hud-bubble {
  background-color: rgba(40, 40, 40, 0.8);
  border-radius: 12px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.gold-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  color: white;
  font-weight: bold;
}

.gold-icon {
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #ffd700, #ffa500);
  border-radius: 50%;
  box-shadow: 0 0 4px rgba(255, 215, 0, 0.5);
}

.gold-amount {
  font-size: 1.1em;
}

.gold-change {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.9em;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 8px;
  animation: fadeUp 2s ease-out forwards;
  white-space: nowrap;
}

.gold-change.positive {
  color: #4caf50;
  background-color: rgba(76, 175, 80, 0.2);
}

.gold-change.negative {
  color: #f44336;
  background-color: rgba(244, 67, 54, 0.2);
}

@keyframes fadeUp {
  0% {
    opacity: 0;
    transform: translate(-50%, 0);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -10px);
  }
  80% {
    opacity: 1;
    transform: translate(-50%, -10px);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
}
</style> 