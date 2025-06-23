<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';
import ItemPreview from './ItemPreview.vue';
import { useEscapeKeyHandler } from '../composables/useEscapeKeyHandler';

const gameStore = useGameStore();
const props = defineProps<{
  show: boolean;
  workbenchImage: string;
  toolsItems?: any[];
  workingItems?: any[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const hoveredItem = ref<any>(null);
const hoveredItemPosition = ref({ x: 0, y: 0 });
const draggedItem = ref<any>(null);
const dropTarget = ref<'tools' | 'working' | null>(null);
const selectedToolItem = ref<any>(null);
const selectedSkill = ref<any>(null);
const selectedTargets = ref<any[]>([]);
const mousePosition = ref({ x: 0, y: 0 });
const showSkillsDropdown = ref(false);
const skillsDropdownPosition = ref({ x: 0, y: 0 });

const isToolGridEmpty = computed(() => !props.toolsItems?.length);

const selectedToolSkills = computed(() => {
  if (!selectedToolItem.value || !selectedToolItem.value.skills) {
    return [];
  }
  return selectedToolItem.value.skills;
});

const positionSkillsDropdown = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement;
  if (target) {
    const rect = target.getBoundingClientRect();
    skillsDropdownPosition.value = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    };
  }
};

const handleItemClick = (item: any, sourceArea: 'tools' | 'working', event?: MouseEvent) => {
  hoveredItem.value = null;

  if (sourceArea === 'tools') {
    handleToolItemClick(item, event);
    return;
  }

  if (selectedSkill.value) {
    handleSkillTargetSelection(item);
    return;
  }

  moveItemToMainInventory(item);
};

const handleToolItemClick = (item: any, event?: MouseEvent) => {
  if (selectedToolItem.value === item) {
    showSkillsDropdown.value = !showSkillsDropdown.value;

    if (showSkillsDropdown.value && event) {
      positionSkillsDropdown(event);
    }
    return;
  }

  selectedToolItem.value = item;
  selectedSkill.value = null; // Clear skill when switching tools to prevent confusion
  showSkillsDropdown.value = true;

  if (event) {
    positionSkillsDropdown(event);
  }
};

const handleSkillTargetSelection = (item: any) => {
  const isAlreadySelected = selectedTargets.value.some(target => target.id === item.id);

  if (isAlreadySelected) {
    selectedTargets.value = selectedTargets.value.filter(target => target.id !== item.id);
    return;
  }

  selectedTargets.value.push(item);

  if (selectedTargets.value.length < selectedSkill.value.targets) {
    return;
  }

  const toolSkillIndex = selectedToolItem.value.skills.findIndex(
    (s: any) => s === selectedSkill.value
  );

  if (toolSkillIndex === -1) {
    console.error('Selected skill not found in tool skills');
    return;
  }

  gameStore.emitEvent('skill-invoked', {
    skill: selectedSkill.value,
    tool: selectedToolItem.value,
    targets: selectedTargets.value
  });

  gameStore.useSkill(
    selectedToolItem.value.id,
    toolSkillIndex,
    selectedTargets.value.map(target => target.id)
  );

  selectedSkill.value = null;
  selectedTargets.value = [];
};

const moveItemToMainInventory = (item: any) => {
  const targetInventory = `${gameStore.userId}:main`;

  // One-time listener to handle post-move actions
  const listenerId = gameStore.addEventListener('item-moved', (data) => {
    if (data && data.itemId === item.id && data.targetInventoryId === targetInventory) {
      gameStore.removeEventListener('item-moved', listenerId);
      emit('close');

      gameStore.emitEvent('item-pickup', {
        id: data.itemId
      });
    }
  });

  gameStore.moveItem(item.id, targetInventory);
};

const handleSkillClick = (skill: any, event: MouseEvent) => {
  if (selectedSkill.value === skill) {
    selectedSkill.value = null;
    selectedTargets.value = [];
    return;
  }

  // Skills with invalid target counts default to self-targeting
  if (!skill.targets || typeof skill.targets !== 'number' || skill.targets < 0 || skill.targets > 2) {
    handleSelfTargetingSkill(skill);
    return;
  }

  selectedSkill.value = skill;
  selectedTargets.value = [];

  mousePosition.value = {
    x: event.clientX,
    y: event.clientY
  };

  showSkillsDropdown.value = false;
};

const handleSelfTargetingSkill = (skill: any) => {
  const toolSkillIndex = selectedToolItem.value.skills.findIndex(
    (s: any) => s === skill
  );

  if (toolSkillIndex === -1) {
    console.error('Selected skill not found in tool skills');
    return;
  }

  gameStore.emitEvent('skill-invoked', {
    skill: skill,
    tool: selectedToolItem.value,
    target: selectedToolItem.value // Tool targets itself for self-skills
  });

  gameStore.useSkill(
    selectedToolItem.value.id,
    toolSkillIndex,
    [] // Self-targeting requires no target IDs
  );

  showSkillsDropdown.value = false;
};

const handleItemMouseEnter = (event: MouseEvent, item: any) => {
  hoveredItem.value = item;

  const target = event.currentTarget as HTMLElement;
  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const tooltipWidth = 600;
  const tooltipHeight = 400;

  hoveredItemPosition.value = {
    x: rect.left - (tooltipWidth / 2) - 10,
    y: rect.bottom + 10
  };

  adjustTooltipPosition(tooltipWidth, tooltipHeight, rect);
};

// Prevents tooltip from rendering outside viewport bounds
const adjustTooltipPosition = (tooltipWidth: number, tooltipHeight: number, rect: DOMRect) => {
  if (hoveredItemPosition.value.x + tooltipWidth > window.innerWidth) {
    hoveredItemPosition.value.x = window.innerWidth - tooltipWidth - 10;
  }

  if (hoveredItemPosition.value.x < 0) {
    hoveredItemPosition.value.x = 10;
  }

  if (hoveredItemPosition.value.y + tooltipHeight > window.innerHeight) {
    hoveredItemPosition.value.y = rect.top - tooltipHeight - 10;
  }
};

const handleItemMouseLeave = () => {
  hoveredItem.value = null;
};

const handleDragStart = (event: DragEvent, item: any, sourceArea: 'tools' | 'working') => {
  if (!item) return;

  draggedItem.value = { ...item, sourceArea };

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }

  // Clean up UI state during drag
  hoveredItem.value = null;
  showSkillsDropdown.value = false;
  selectedSkill.value = null;
};

const handleDragEvent = (event: DragEvent, targetArea: 'tools' | 'working') => {
  event.preventDefault();

  if (event.type === 'dragover' && event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }

  dropTarget.value = targetArea;
};

const handleDragLeave = () => {
  dropTarget.value = null;
};

const handleDrop = (event: DragEvent, targetArea: 'tools' | 'working') => {
  event.preventDefault();
  dropTarget.value = null;

  if (!draggedItem.value || draggedItem.value.sourceArea === targetArea) {
    draggedItem.value = null;
    return;
  }

  const targetInventoryId = targetArea === 'tools'
    ? `${gameStore.userId}:workbench-tools`
    : `${gameStore.userId}:workbench-working`;

  gameStore.moveItem(draggedItem.value.id, targetInventoryId);
  draggedItem.value = null;
};

// Escape key handler with priority: skill > dropdown > close workbench
useEscapeKeyHandler('workbench-fullscreen', (event) => {
  if (event.key === 'Escape' && props.show) {
    if (selectedSkill.value) {
      selectedSkill.value = null;
      return true;
    }

    if (showSkillsDropdown.value) {
      showSkillsDropdown.value = false;
      return true;
    }

    emit('close');
    return true;
  }
  return false;
});

const handleMouseMove = (e: MouseEvent) => {
  if (selectedSkill.value) {
    mousePosition.value = {
      x: e.clientX,
      y: e.clientY
    };
  }
};

const handleClickOutside = (e: MouseEvent) => {
  if (showSkillsDropdown.value) {
    const dropdown = document.querySelector('.skills-dropdown');
    const toolItems = document.querySelectorAll('.inventory-slot.selected');

    let clickedOnTool = false;
    toolItems.forEach(tool => {
      if (tool.contains(e.target as Node)) {
        clickedOnTool = true;
      }
    });

    if (dropdown && !dropdown.contains(e.target as Node) && !clickedOnTool) {
      showSkillsDropdown.value = false;
    }
  }
};

const handleContextMenu = (e: MouseEvent) => {
  if (selectedSkill.value) {
    e.preventDefault(); // Prevent browser context menu when canceling skill
    selectedSkill.value = null;
    selectedTargets.value = [];
  }
};

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('click', handleClickOutside);
  window.addEventListener('contextmenu', handleContextMenu);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('click', handleClickOutside);
  window.removeEventListener('contextmenu', handleContextMenu);
});

watch(() => props.show, (newValue) => {
  if (newValue) {
    gameStore.pushFocus('workbench-fullscreen');
  } else {
    gameStore.popFocus();
  }
});
</script>

<template>
  <div v-if="show" class="fullscreen-overlay">
    <div class="workbench-container" :style="{ backgroundImage: `url(${workbenchImage})` }">
      <button class="close-button" @click="$emit('close')">Back</button>

      <!-- Item Preview Component -->
      <ItemPreview v-if="hoveredItem" :item="hoveredItem" position="fixed" :style="{
        left: hoveredItemPosition.x + 'px',
        top: hoveredItemPosition.y + 'px',
        maxHeight: '80vh',
        overflowY: 'auto'
      }" />

      <div class="tool-area" @dragover="handleDragEvent($event, 'tools')" @dragenter="handleDragEvent($event, 'tools')"
        @dragleave="handleDragLeave" @drop="handleDrop($event, 'tools')"
        :class="{ 'drop-target': dropTarget === 'tools' }">
        <div class="tool-grid">
          <div class="inventory-slot" :class="{ 'has-item': item, 'selected': selectedToolItem === item }"
            v-for="(item, index) in toolsItems" :key="item ? item.id : 'tool-' + index"
            @click="item && handleItemClick(item, 'tools', $event)"
            @mouseenter="item && handleItemMouseEnter($event, item)" @mouseleave="handleItemMouseLeave"
            :draggable="!!item" @dragstart="item && handleDragStart($event, item, 'tools')">
            <div v-if="item" class="item-container" :class="getRarityClass(item.value)">
              <img :src="item.imageUrl" class="item-image" :alt="item.name" />
            </div>
          </div>
          <!-- Add empty slots to fill the grid if needed -->
          <div class="inventory-slot" v-for="n in Math.max(0, 32 - (toolsItems ? toolsItems.length : 0))"
            :key="'empty-' + n"></div>

          <!-- Empty grid prompt message -->
          <div v-if="isToolGridEmpty" class="empty-grid-prompt">
            Drag an item here to use as a tool
          </div>
        </div>
      </div>

      <!-- Skills Dropdown - Show when a tool is selected and dropdown is toggled -->
      <div v-if="showSkillsDropdown && selectedToolItem && selectedToolSkills.length > 0" class="skills-dropdown"
        :style="{
          left: `${skillsDropdownPosition.x}px`,
          top: `${skillsDropdownPosition.y}px`
        }">
        <div class="skills-container">
          <button v-for="(skill, index) in selectedToolSkills" :key="index" class="skill-button"
            @click="handleSkillClick(skill, $event)">
            <div class="skill-button-content">
              <div class="skill-icon">
                <img :src="selectedToolItem.imageUrl" class="tool-icon-image" :alt="selectedToolItem.name" />
              </div>
              <div class="skill-text">
                <div class="skill-header">
                  <div class="skill-name">{{ skill.name }}</div>
                  <div class="skill-targets">
                    <span class="target-tag">
                      {{ typeof skill.targets === 'number' && skill.targets >= 0 && skill.targets <= 2 ?
                        (skill.targets === 0 ? 'Self' : skill.targets === 1 ? '1 Target' : '2 Targets') : 'Self' }} </span>
                  </div>
                </div>
                <div class="skill-description">{{ skill.description }}</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Working Area -->
      <div class="working-area" @dragover="handleDragEvent($event, 'working')"
        @dragenter="handleDragEvent($event, 'working')" @dragleave="handleDragLeave"
        @drop="handleDrop($event, 'working')" :class="{ 'drop-target': dropTarget === 'working' }">
        <div class="working-grid">
          <div class="inventory-slot working-slot" :class="{
            'has-item': item,
            'selected-target': selectedTargets.some(target => target.id === item?.id)
          }" v-for="(item, index) in workingItems" :key="item ? item.id : 'working-' + index"
            @click="item && handleItemClick(item, 'working')" @mouseenter="item && handleItemMouseEnter($event, item)"
            @mouseleave="handleItemMouseLeave" :draggable="!!item"
            @dragstart="item && handleDragStart($event, item, 'working')">
            <div v-if="item" class="item-container" :class="getRarityClass(item.value)">
              <img :src="item.imageUrl" class="item-image" :alt="item.name" />
            </div>
          </div>
          <!-- Add empty slots to fill the grid if needed -->
          <div class="inventory-slot working-slot"
            v-for="n in Math.max(0, 5 - (workingItems ? workingItems.length : 0))" :key="'empty-working-' + n"></div>
        </div>
      </div>

    </div>

    <!-- Skill cursor that follows the mouse when a skill is selected -->
    <div v-if="selectedSkill" class="skill-cursor"
      :style="{ left: `${mousePosition.x}px`, top: `${mousePosition.y}px` }">
      <div class="skill-cursor-icon">
        <img :src="selectedToolItem?.imageUrl" class="tool-icon-image" :alt="selectedToolItem?.name" />
      </div>
      <div class="skill-cursor-name">{{ selectedSkill.name }}</div>
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
  width: min(90vh, 90vw);
  /* Use the smaller of viewport width or height */
  height: min(90vh, 90vw);
  /* Match width to maintain square ratio */
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

.tool-area {
  position: absolute;
  width: 61%;
  height: 31.5%;
  top: 10.5%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 5px;
  width: 100%;
  height: 100%;
}

/* Working area in the lower half of the workbench */
.working-area {
  position: absolute;
  width: 60%;
  height: 11%;
  bottom: 35%;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}

.working-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: 1fr;
  gap: 10px;
  width: 100%;
  height: 100%;
}

.inventory-slot {
  background: transparent;
  border: 3px dashed rgb(113, 67, 31);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: normal;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9em;
  transition: border-color 0.3s, background-color 0.3s;
  position: relative;
}

.tool-grid .inventory-slot {
  border: none;
}

.working-slot {
  /* Working slots already have the dashed border from .inventory-slot */
  cursor: grab;
}

.drop-target {
  outline: 2px solid rgba(255, 215, 0, 0.7);
  background-color: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
}

.inventory-slot[draggable=true] {
  cursor: grab;
}

.inventory-slot[draggable=true]:active {
  cursor: grabbing;
}

.inventory-slot.has-item {
  border: none;
  overflow: hidden;
  border-radius: 6px;
}

.inventory-slot.has-item:hover .item-container {
  transform: scale(1.05);
  cursor: pointer;
}

.inventory-slot:hover {
  border-color: rgb(173, 127, 91);
  background-color: rgba(113, 67, 31, 0.2);
}

.item-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px;
  overflow: hidden;
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.empty-grid-prompt {
  position: absolute;
  display: inline-block;
  padding: 12px 15px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.2em;
  text-align: center;
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  z-index: 5;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: auto;
  height: auto;
}

/* Selected tool styling */
.inventory-slot.selected {
  z-index: 15;
}

/* Skills dropdown styling */
.skills-dropdown {
  position: fixed;
  transform: translateX(-50%);
  /* Center horizontally relative to position */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
}

.skills-dropdown:before {
  content: '';
  position: absolute;
  top: -9px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid rgba(0, 0, 0, 0.7);
}

.skills-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 300px;
  max-height: 300px;
  overflow-y: auto;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(113, 67, 31, 0.8);
}

.skill-button {
  padding: 2px 5px;
  border-radius: 6px;
  border: none;
  background-color: rgba(50, 50, 50, 0.8);
  color: white;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  text-align: left;
  width: 100%;
  max-width: 280px;
}

.skill-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.skill-button-content {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.skill-icon {
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  min-width: 24px;
  overflow: hidden;
  border-radius: 4px;
}

.tool-icon-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.skill-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.skill-name {
  font-weight: bold;
  font-size: 0.95em;
}

.skill-targets {
  display: flex;
  align-items: center;
}

.target-tag {
  font-size: 0.65rem;
  padding: 1px 4px;
  border-radius: 8px;
  font-weight: bold;
  background-color: #607d8b;
  color: white;
  white-space: nowrap;
  display: inline-block;
}

.skill-description {
  font-size: 0.8em;
  opacity: 0.9;
  line-height: 1.3;
}

/* Skill cursor styling */
.skill-cursor {
  position: fixed;
  pointer-events: none;
  /* Allow clicking through the cursor */
  z-index: 2000;
  display: flex;
  align-items: center;
  transform: translate(-50%, -50%);
  /* Center on cursor */
  background-color: rgba(0, 0, 0, 0.7);
  border-radius: 12px;
  padding: 5px 10px;
}

.skill-cursor-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 8px;
}

.skill-cursor-name {
  color: white;
  font-size: 0.9em;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* Add styles for selected targets */
.inventory-slot.selected-target {
  outline: 2px solid #4caf50;
  outline-offset: 2px;
}

.inventory-slot.selected-target .item-container {
  transform: scale(1.05);
}
</style>