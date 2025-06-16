<template>
  <div class="tutorial-screen" v-if="shouldShowTutorial">
    <div class="tutorial-content">      
      <div class="tutorial-grid">
        <div class="tutorial-card">
          <div class="tutorial-image ghost-image"></div>
          <div class="tutorial-tips">
            <h2>Movement & Interaction</h2>
            <ul>
              <li><span class="keycap">W</span><span class="keycap">A</span><span class="keycap">S</span><span class="keycap">D</span> keys to move around</li>
              <li><span class="keycap">E</span> key to interact</li>
              <li><span class="keycap">T</span> key to throw held items</li>
            </ul>
          </div>
        </div>

        <div class="tutorial-card">
          <div class="tutorial-image dispenser-image"></div>
          <div class="tutorial-tips">
            <h2>Discover discarded items</h2>
            <ul>
              <li>Use <span class="keycap">E</span> to interact with the red "PULL" lever</li>
              <li>Pick up items with <span class="keycap">E</span> and inspect them with <span class="keycap">I</span></li>
              <li>While carrying an item, use <span class="keycap">E</span> to put it in a chest or workbench</li>
            </ul>
          </div>
        </div>

        <div class="tutorial-card">
          <div class="tutorial-image workbench-image"></div>
          <div class="tutorial-tips">
            <h2>Craft at the workbench</h2>
            <ul>
              <li>Carry an item to the workbench, then use <span class="keycap">E</span> to place it</li>
              <li>Drag items up to the tool wall or down to the working area</li>
              <li>Click an item on the tool wall to cast one of it's quirks</li>
              <li>Click targets for the quirk, down in the working area</li>
            </ul>
          </div>
        </div>

        <div class="tutorial-card">
          <div class="tutorial-image shopkeeper-image"></div>
          <div class="tutorial-tips">
            <h2>Sell your creations</h2>
            <ul>
              <li>Throw items out of the door to the shop keeper</li>
              <li>The shop keeper pays more for fun, unusual, and rare items</li>
              <li>Check the computer to buy items from other shops</li>
              <li>Not ready to sell? Store your treasures in the chest</li>
            </ul>
          </div>
        </div>
      </div>

      <button class="close-button" @click="closeTutorial">Got it!</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/game'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const gameStore = useGameStore()
const isTutorialClosed = ref(false)

// Get all relevant inventories
const mainInventory = gameStore.useInventory('main')
const chestInventory = gameStore.useInventory('chest1')
const workbenchWorkingInventory = gameStore.useInventory('workbench-working')
const workbenchToolsInventory = gameStore.useInventory('workbench-tools')

// Check if all inventories are empty
const areAllInventoriesEmpty = computed(() => {
  return mainInventory.value.length === 0 &&
    chestInventory.value.length === 0 &&
    workbenchWorkingInventory.value.length === 0 &&
    workbenchToolsInventory.value.length === 0
})

// Only show tutorial if all inventories are empty and tutorial hasn't been closed
const shouldShowTutorial = computed(() => {
  return areAllInventoriesEmpty.value && !isTutorialClosed.value
})

const closeTutorial = () => {
  isTutorialClosed.value = true
  emit('close')
}
</script>

<style scoped>
.tutorial-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}

.tutorial-content {
  text-align: left;
  color: white;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2rem;
  color: #4CAF50;
}

.tutorial-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.tutorial-card {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tutorial-image {
  width: 100%;
  height: 180px;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  border-radius: 4px;
}

.ghost-image {
  background-image: url('@/assets/tutorial/ghost.png');
}

.dispenser-image {
  background-image: url('@/assets/tutorial/dispenser.png');
}

.workbench-image {
  background-image: url('@/assets/tutorial/workbench.png');
}

.shopkeeper-image {
  background-image: url('@/assets/tutorial/shopkeeper.png');
}

.tutorial-tips {
  flex: 1;
}

h2 {
  color: #4CAF50;
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

ul {
  list-style-type: none;
  padding-left: 0.75rem;
  margin: 0;
}

li {
  margin: 0.35rem 0;
  line-height: 1.3;
}

.close-button {
  display: block;
  margin: 1.5rem auto 0;
  padding: 0.6rem 1.75rem;
  font-size: 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.close-button:hover {
  background-color: #45a049;
}

.keycap {
  display: inline-block;
  padding: 2px 6px;
  margin: 0 2px;
  background: #2c2c2c;
  border: 1px solid #4a4a4a;
  border-radius: 4px;
  box-shadow: 0 2px 0 #1a1a1a;
  font-family: monospace;
  font-weight: bold;
  color: #e0e0e0;
  text-transform: uppercase;
  font-size: 0.9em;
  line-height: 1;
  min-width: 1.2em;
  text-align: center;
}
</style>