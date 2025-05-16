<script setup lang="ts">
import { type PhysicsProperties } from '../utils/physics';
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useGameStore } from '../stores/game';

const store = useGameStore();

interface Props {
  id: string;
  row: number;
  col: number;
  tileSize: number;
  width: number;
  height: number;
  depth: number;
  playerIsNear: boolean;
  physics?: PhysicsProperties;
  props: {
    itemId: string; // Now we only pass the itemId
    pickedUp: boolean; // Whether the item has been picked up before
  };
}

const props = defineProps<Props>();

// Get the item details directly from the itemsById Map
const item = store.itemsById.get(props.props.itemId);

// Use pickedUp from props instead of a local ref

// Dialog state
const showDialog = ref(false);

// Use the item's imageUrl if available, otherwise use generic.png
const icon = computed(() => item?.imageUrl || '/src/assets/generic.png');

// Determine CSS class based on item value
const getRarityClass = computed(() => {
  if (!item || item.value === undefined) return 'item-common';
  
  const value = item.value;
  if (value > 1000) return 'item-legendary';
  if (value > 500) return 'item-epic';
  if (value > 250) return 'item-rare';
  if (value > 100) return 'item-uncommon';
  return 'item-common';
});

// Calculate shadow opacity based on item height
const shadowOpacity = computed(() => {
  const height = props.physics?.height || 0;
  // Linear decrease from 0.3 to 0 as height increases from 0 to 4
  return Math.max(0, 0.3 * (1 - height / 4));
});

// Format outcome text for display
function formatOutcome(outcome: string): string {
  return outcome.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get CSS class for outcome tag
function getOutcomeClass(outcome: string): string {
  const knownOutcomes = [
    'split target',
    'destroy self',
    'transform self',
    'consume target',
    'transform target'
  ];
  
  // Return specific class for known outcomes, or a generic class for custom ones
  return knownOutcomes.includes(outcome.toLowerCase()) 
    ? `outcome-${outcome.toLowerCase().replace(' ', '-')}` 
    : 'outcome-custom';
}

function handlePlayerInteraction() {
  if (!props.playerIsNear || !item) {
    return;
  }

  // If the item hasn't been picked up yet, show the dialog first
  if (!props.props.pickedUp) {
    showDialog.value = true;
    // Lock player interaction while dialog is open
    store.interactionLocked = true;
    return;
  }

  completePickup();
}

function closeDialog() {
  showDialog.value = false;
  store.interactionLocked = false;
  
  // Complete the pickup process (the item is now considered picked up)
  completePickup();
}

function completePickup() {
  // Remove the item from the game world so it no longer renders
  // but we will keep it inside of the item list, so that the
  // player can pick it up.
  store.removeObject(props.id);

  // Emit item pickup events. The PlayerCharacter component subscribes
  // to this event.
  store.emitEvent('item-pickup', {
    id: props.props.itemId
  });
}

let interactionListenerId: string;

onMounted(() => {
  interactionListenerId = store.addEventListener('player-interaction', handlePlayerInteraction);
});

onUnmounted(() => {
  store.removeEventListener('player-interaction', interactionListenerId);
  // Make sure to unlock interactions if component is unmounted while dialog is open
  if (showDialog.value) {
    store.interactionLocked = false;
  }
});
</script>

<template>
  <div 
    class="game-item"
    :style="{
      position: 'absolute',
      top: `${row * tileSize - ((physics?.height || 0) * tileSize)}px`,
      left: `${col * tileSize}px`,
      width: `${tileSize * width}px`,
      height: `${tileSize * depth}px`,
      transform: `scale(${1 + ((physics?.height || 0) * .1)})`,
      transition: 'transform 0.1s ease-out',
      border: store.debug ? '1px solid red': 'none'
    }"
  >
    <!-- Ground tile outline (always visible in debug mode) -->
    <div v-if="store.debug" 
         :style="{
           position: 'absolute',
           top: `${(physics?.height || 0) * tileSize}px`,
           left: '0',
           width: `${tileSize * width}px`,
           height: `${tileSize * depth}px`,
           border: '1px solid red',
           zIndex: 999
         }">
    </div>
    <div v-if="store.debug && physics?.active" 
         class="debug-vector"
         :style="{
           transform: `rotate(${physics.angle}deg)`,
           width: `${physics.velocity * tileSize}px`
         }">
    </div>
    <!-- Height visualization line (only visible in debug mode) -->
    <div v-if="store.debug" 
         class="height-line"
         :style="{
           position: 'absolute',
           left: '0',
           bottom: '0',
           width: '2px',
           height: `${height * tileSize}px`,
           backgroundColor: 'blue',
           zIndex: 1000
         }">
    </div>
    <!-- Drop shadow under item at ground level -->
    <div
      class="item-shadow"
      :style="{
        position: 'absolute',
        bottom: `-${(physics?.height || 0) * tileSize + (tileSize * 0.2)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${tileSize * width * 0.7}px`,
        height: `${tileSize * depth * 0.2}px`,
        backgroundColor: `rgba(0, 0, 0, ${shadowOpacity})`,
        borderRadius: '50%',
        filter: 'blur(3px)',
        zIndex: -1
      }"
    ></div>
    <div class="item-container" :class="[{ 'item-near': playerIsNear }, getRarityClass]">
      <div v-if="playerIsNear" class="interact-prompt">E</div>
      <img :src="icon" alt="Item" class="item-image" />
    </div>
    <!--<div class="item-name" :class="getRarityClass">{{ item?.name || 'Unknown Item' }}</div>-->
  </div>
  
  <!-- Item Details Dialog -->
  <div v-if="showDialog" class="item-dialog-overlay">
    <div class="item-dialog" :class="getRarityClass">
      <div class="dialog-header">
        <h2>{{ item?.name || 'Unknown Item' }}</h2>
        <button class="close-button" @click="closeDialog">×</button>
      </div>
      <div class="dialog-content">
        <div class="dialog-image-container">
          <img :src="icon" alt="Item" class="dialog-image" />
          <div class="tags-container">
            <span class="tag item-rarity" :class="getRarityClass">
              {{ getRarityClass.replace('item-', '').charAt(0).toUpperCase() + getRarityClass.replace('item-', '').slice(1) }}
            </span>
            <span v-for="(material, index) in item?.materials" :key="index" class="tag material-tag">{{ material }}</span>
          </div>
        </div>
        <div class="dialog-details">
          <p class="item-description">{{ item?.description || 'No description available.' }}</p>
          
          <div class="item-stats">
            <div class="stat-row" v-if="item?.value !== undefined">
              <span class="stat-label">Value:</span>
              <span class="stat-value">{{ item.value }}</span>
            </div>
            <div class="stat-row" v-if="item?.weight">
              <span class="stat-label">Weight:</span>
              <span class="stat-value">{{ item.weight }}</span>
            </div>
            <div class="stat-row" v-if="item?.damage">
              <span class="stat-label">Damage:</span>
              <span class="stat-value">{{ item.damage }}</span>
            </div>
          </div>
          
          <div class="item-skills" v-if="item?.skills && item.skills.length > 0">
            <h3>Skills:</h3>
            <div v-for="(skill, index) in item.skills" :key="index" class="skill-item">
              <div class="skill-header">
                <div class="skill-name">{{ skill.name }}</div>
                <div class="skill-outcomes" v-if="skill.outcomes && skill.outcomes.length > 0">
                  <span v-for="(outcome, i) in skill.outcomes" :key="i" class="outcome-tag" :class="getOutcomeClass(outcome)">
                    {{ formatOutcome(outcome) }}
                  </span>
                </div>
              </div>
              <div class="skill-description">{{ skill.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-item {
  pointer-events: none;
}

.item-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  position: relative;
}

.item-near {
  
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 10px;
  transition: transform 0.3s ease, border 0.3s ease, box-shadow 0.3s ease;
  border: 2px solid #333;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.item-near .item-image {
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}

.item-name {
  position: absolute;
  bottom: -24px;
  left: 0;
  width: 100%;
  color: white;
  font-size: 12px;
  text-align: center;
  padding: 4px;
  word-break: break-word;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* Apply different colors based on item rarity */
.item-common .item-name {
  color: #ffffff;
}

.item-uncommon .item-name {
  color: #4caf50;
}

.item-rare .item-name {
  color: #2196f3;
}

.item-epic .item-name {
  color: #9c27b0;
  text-shadow: 0 0 4px rgba(156, 39, 176, 0.6);
}

.item-legendary .item-name {
  color: #ff9800;
  text-shadow: 0 0 6px rgba(255, 152, 0, 0.8);
  animation: pulse-glow 2s infinite;
}

/* Apply rarity-based styling to item images */
.item-common .item-image {
  border-color: #333;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.item-uncommon .item-image {
  border-color: #4caf50;
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
}

.item-rare .item-image {
  border-color: #2196f3;
  box-shadow: 0 0 10px rgba(33, 150, 243, 0.3);
}

.item-epic .item-image {
  border-color: #9c27b0;
  box-shadow: 0 0 10px rgba(156, 39, 176, 0.3);
}

.item-legendary .item-image {
  border-color: #ff9800;
  box-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
  animation: image-pulse 2s infinite;
}

@keyframes pulse-glow {
  0% { text-shadow: 0 0 4px rgba(255, 152, 0, 0.6); }
  50% { text-shadow: 0 0 10px rgba(255, 152, 0, 0.9); }
  100% { text-shadow: 0 0 4px rgba(255, 152, 0, 0.6); }
}

@keyframes image-pulse {
  0% { box-shadow: 0 0 10px rgba(255, 152, 0, 0.3); }
  50% { box-shadow: 0 0 20px rgba(255, 152, 0, 0.6); }
  100% { box-shadow: 0 0 10px rgba(255, 152, 0, 0.3); }
}

.debug-vector {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 2px;
  background-color: orange;
  transform-origin: left center;
  z-index: 1000;
}

.ground-tile-outline {
  pointer-events: none;
  box-sizing: border-box;
  background-color: rgba(255, 0, 0, 0.1);
}

.interact-prompt {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: calc(0.5 * v-bind(tileSize))px;
  font-weight: bold;
  color: white;
  text-shadow: 0 0 5px white;
  background-color: black;
  padding: 5px 10px;
  border-radius: 4px;
}

/* Dialog Styles */
.item-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.item-dialog {
  background-color: #1a1a1a;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  border: 2px solid #333;
}

.item-dialog.item-uncommon {
  border-color: #4caf50;
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}

.item-dialog.item-rare {
  border-color: #2196f3;
  box-shadow: 0 0 20px rgba(33, 150, 243, 0.3);
}

.item-dialog.item-epic {
  border-color: #9c27b0;
  box-shadow: 0 0 20px rgba(156, 39, 176, 0.3);
}

.item-dialog.item-legendary {
  border-color: #ff9800;
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.5);
  animation: dialog-pulse 2s infinite;
}

@keyframes dialog-pulse {
  0% { box-shadow: 0 0 20px rgba(255, 152, 0, 0.3); }
  50% { box-shadow: 0 0 30px rgba(255, 152, 0, 0.6); }
  100% { box-shadow: 0 0 20px rgba(255, 152, 0, 0.3); }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #333;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: white;
}

.close-button {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-button:hover {
  color: white;
}

.dialog-content {
  padding: 20px;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
}

.dialog-image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 30%;
  min-width: 120px;
  max-width: 200px;
  padding-right: 10px;
}

.dialog-image {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.dialog-details {
  color: #ddd;
  width: 70%;
  flex-grow: 1;
}

.item-description {
  margin-bottom: 15px;
  line-height: 1.5;
}

.tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: bold;
  background-color: rgba(255, 255, 255, 0.15);
  font-size: 0.9rem;
}

.item-rarity {
  text-align: left;
}

.material-tag {
  /* Extends the .tag class */
  background-color: rgba(255, 255, 255, 0.25);
  color: #ddd;
  font-weight: normal;
}

.item-rarity.item-common {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.2);
}

.item-rarity.item-uncommon {
  color: #4caf50;
  background-color: rgba(76, 175, 80, 0.25);
}

.item-rarity.item-rare {
  color: #2196f3;
  background-color: rgba(33, 150, 243, 0.25);
}

.item-rarity.item-epic {
  color: #9c27b0;
  background-color: rgba(156, 39, 176, 0.25);
}

.item-rarity.item-legendary {
  color: #ff9800;
  background-color: rgba(255, 152, 0, 0.25);
  text-shadow: 0 0 3px rgba(255, 152, 0, 0.5);
}

.dialog-footer {
  padding: 15px 20px;
  border-top: 1px solid #333;
  display: flex;
  justify-content: flex-end;
}

/* Additional styles for item details */
.item-stats {
  margin: 15px 0;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.stat-label {
  font-weight: bold;
  color: #aaa;
}

.stat-value {
  color: white;
}

.item-materials, .item-skills {
  margin: 10px 0;
}

.item-skills h3 {
  font-size: 1rem;
  margin-bottom: 5px;
  color: #aaa;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: flex-start;
  justify-content: flex-start;
  margin-top: 10px;
  width: 100%;
}

.skill-item {
  margin-bottom: 10px;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}

.skill-name {
  font-weight: bold;
  color: #ddd;
}

.skill-description {
  font-size: 0.9rem;
  color: #bbb;
  margin-top: 5px;
}

.skill-outcomes {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.outcome-tag {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
  text-transform: capitalize;
  white-space: nowrap;
}

.outcome-split-target {
  background-color: #2196f3;
  color: white;
}

.outcome-destroy-self {
  background-color: #f44336;
  color: white;
}

.outcome-transform-self {
  background-color: #9c27b0;
  color: white;
}

.outcome-consume-target {
  background-color: #ff9800;
  color: white;
}

.outcome-transform-target {
  background-color: #4caf50;
  color: white;
}

.outcome-custom {
  background-color: #607d8b;
  color: white;
}
</style>