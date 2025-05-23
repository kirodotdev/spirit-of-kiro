<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, computed } from 'vue';
import { useGameStore } from '../stores/game';
import { getRarityClass } from '../utils/items';
import ItemPreview from './ItemPreview.vue';

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

// State to track which item is being hovered
const hoveredItem = ref<any>(null);

// State to track the position of the hovered item
const hoveredItemPosition = ref({ x: 0, y: 0 });

// State to track the currently dragged item
const draggedItem = ref<any>(null);

// State to track the current drop target area
const dropTarget = ref<'tools' | 'working' | null>(null);

// State to track the currently selected tool item
const selectedToolItem = ref<any>(null);

// State to track the currently selected skill for casting
const selectedSkill = ref<any>(null);

// State to track mouse position for skill casting
const mousePosition = ref({ x: 0, y: 0 });

// State to track if skills dropdown is visible
const showSkillsDropdown = ref(false);

// State to track the position of the skills dropdown
const skillsDropdownPosition = ref({ x: 0, y: 0 });

// Computed property to check if the tools items array is empty
const isToolGridEmpty = computed(() => !props.toolsItems?.length);

// Computed property to get skills from the selected tool item
const selectedToolSkills = computed(() => {
  if (!selectedToolItem.value || !selectedToolItem.value.skills) {
    return [];
  }
  return selectedToolItem.value.skills;
});

// Position the skills dropdown based on the event target
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
  // Clear the hovered item preview immediately when an item is clicked
  hoveredItem.value = null;
  
  if (sourceArea === 'tools') {
    // If clicking on a tool item, show/hide skills dropdown
    if (selectedToolItem.value === item) {
      // Toggle dropdown visibility
      showSkillsDropdown.value = !showSkillsDropdown.value;
      
      if (showSkillsDropdown.value && event) {
        positionSkillsDropdown(event);
      }
    } else {
      // Select the new tool and show its skills
      selectedToolItem.value = item;
      // Clear any selected skill when changing tools
      selectedSkill.value = null;
      // Show the dropdown
      showSkillsDropdown.value = true;
      
      if (event) {
        positionSkillsDropdown(event);
      }
    }
  } else {
    // If a skill is selected, cast it on the working item
    if (selectedSkill.value) {
      handleCastSkill(item);
      return;
    }
    
    // Otherwise, move to inventory as before
    const targetInventory = `${gameStore.userId}:main`;
    
    // Set up a one-time listener for the 'item-moved' event
    const listenerId = gameStore.addEventListener('item-moved', (data) => {
      // Check if this is the item we just moved
      if (data && data.itemId === item.id && data.targetInventoryId === targetInventory) {
        // Remove the listener since we only need it once
        gameStore.removeEventListener('item-moved', listenerId);
        
        // Close the workbench fullscreen view
        emit('close');
        
        // Put the item in the player's hands
        gameStore.emitEvent('item-pickup', {
          id: data.itemId
        });
      }
    });

    // Move the item from workbench to main inventory
    gameStore.moveItem(item.id, targetInventory);
  }
};

// Handle skill button click
const handleSkillClick = (skill: any, event: MouseEvent) => {
  // If a skill is already selected, deselect it
  if (selectedSkill.value === skill) {
    selectedSkill.value = null;
    return;
  }
  
  // Select the skill for casting
  selectedSkill.value = skill;
  
  // Update the mouse position when a skill is clicked
  mousePosition.value = {
    x: event.clientX,
    y: event.clientY
  };
  
  // Hide the dropdown after selecting a skill
  showSkillsDropdown.value = false;
};

// Handle casting a selected skill on a working item
const handleCastSkill = (targetItem: any) => {
  if (!selectedSkill.value || !selectedToolItem.value) return;
  
  // Get the index of the skill in the tool's skills array
  const toolSkillIndex = selectedToolItem.value.skills.findIndex(
    (s: any) => s === selectedSkill.value
  );
  
  if (toolSkillIndex === -1) {
    console.error('Selected skill not found in tool skills');
    return;
  }
  
  // Emit the skill-invoked event before using the skill
  gameStore.emitEvent('skill-invoked', {
    skill: selectedSkill.value,
    tool: selectedToolItem.value,
    target: targetItem
  });
  
  // Use the skill on the target item
  gameStore.useSkill(
    selectedToolItem.value.id,
    toolSkillIndex,
    [targetItem.id]
  );
  
  // Clear the selected skill after casting
  selectedSkill.value = null;
};

const handleItemMouseEnter = (event: MouseEvent, item: any) => {
  hoveredItem.value = item;
  
  // Capture the position of the hovered item
  const target = event.currentTarget as HTMLElement;
  if (target) {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 600; // Approximate width of tooltip

    hoveredItemPosition.value = {
      x: rect.left - (tooltipWidth / 2) - 10, // Centered under the item
      y: rect.bottom + 10 // Align with the bottom of the item
    };
    
    // Check if tooltip would go off-screen to the right
    if (hoveredItemPosition.value.x + tooltipWidth > window.innerWidth) {
      hoveredItemPosition.value.x = window.innerWidth - tooltipWidth - 10;
    }

    // Check if tooltip would go off-screen to the left
    if (hoveredItemPosition.value.x < 0) {
      hoveredItemPosition.value.x = 10;
    }
    
    // Check if tooltip would go off-screen at the bottom
    const tooltipHeight = 400; // Approximate height of tooltip
    if (hoveredItemPosition.value.y + tooltipHeight > window.innerHeight) {
      // Adjust y position to keep tooltip on screen
      hoveredItemPosition.value.y = rect.top - tooltipHeight - 10;
    }
  }
};

const handleItemMouseLeave = () => {
  hoveredItem.value = null;
};

// Drag and drop handlers
const handleDragStart = (event: DragEvent, item: any, sourceArea: 'tools' | 'working') => {
  if (!item) return;
  
  // Store the dragged item and its source area
  draggedItem.value = { ...item, sourceArea };
  
  // Set the drag effect and data
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  }
  
  // Hide the preview during drag
  hoveredItem.value = null;
  
  // Close the skills dropdown when starting to drag
  showSkillsDropdown.value = false;
  
  // Clear any selected skill
  selectedSkill.value = null;
};

const handleDragEvent = (event: DragEvent, targetArea: 'tools' | 'working') => {
  // Prevent default to allow drop
  event.preventDefault();
  
  // Set the drop effect if this is a dragover event
  if (event.type === 'dragover' && event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  
  // Update the drop target for visual feedback
  dropTarget.value = targetArea;
};

const handleDragLeave = () => {
  // Clear the drop target when leaving a drop zone
  dropTarget.value = null;
};

const handleDrop = (event: DragEvent, targetArea: 'tools' | 'working') => {
  // Prevent default browser behavior
  event.preventDefault();
  
  // Clear the drop target
  dropTarget.value = null;
  
  // If no item is being dragged or the source and target areas are the same, do nothing
  if (!draggedItem.value || draggedItem.value.sourceArea === targetArea) {
    draggedItem.value = null;
    return;
  }
  
  // Determine the target inventory ID based on the drop area
  const targetInventoryId = targetArea === 'tools' 
    ? `${gameStore.userId}:workbench-tools` 
    : `${gameStore.userId}:workbench-working`;
  
  // Move the item to the target inventory
  gameStore.moveItem(draggedItem.value.id, targetInventoryId);
  
  // Reset the dragged item
  draggedItem.value = null;
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show && gameStore.hasFocus('workbench')) {
    if (selectedSkill.value) {
      // First cancel any selected skill
      selectedSkill.value = null;
    } else if (showSkillsDropdown.value) {
      // Close the skills dropdown if it's open
      showSkillsDropdown.value = false;
    } else {
      // Then close the workbench if no skill is selected and dropdown is closed
      emit('close');
    }
  }
};

// Track mouse position for skill casting
const handleMouseMove = (e: MouseEvent) => {
  if (selectedSkill.value) {
    mousePosition.value = {
      x: e.clientX,
      y: e.clientY
    };
  }
};

// Close skills dropdown when clicking outside
const handleClickOutside = (e: MouseEvent) => {
  if (showSkillsDropdown.value) {
    // Check if click is outside the dropdown and not on the selected tool
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

// Handle right-click to cancel selected skill
const handleContextMenu = (e: MouseEvent) => {
  if (selectedSkill.value) {
    e.preventDefault(); // Prevent the default context menu
    selectedSkill.value = null;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('click', handleClickOutside);
  window.addEventListener('contextmenu', handleContextMenu);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('click', handleClickOutside);
  window.removeEventListener('contextmenu', handleContextMenu);
  // Ensure interaction is unlocked when component unmounts
  if (props.show) {
    gameStore.interactionLocked = false;
  }
});

// Watch for changes to show prop to lock/unlock interaction and manage focus
watch(() => props.show, (newValue) => {
  if (newValue) {
    gameStore.interactionLocked = true;
    gameStore.pushFocus('workbench');
  } else {
    gameStore.interactionLocked = false;
    gameStore.popFocus();
  }
}, { immediate: true });
</script>

<template>
  <div v-if="show" class="fullscreen-overlay">
    <div class="workbench-container" :style="{ backgroundImage: `url(${workbenchImage})` }">
      <button class="close-button" @click="$emit('close')">Back</button>
      
      <!-- Item Preview Component -->
      <ItemPreview 
        v-if="hoveredItem"
        :item="hoveredItem"
        position="fixed"
        :style="{
          left: hoveredItemPosition.x + 'px',
          top: hoveredItemPosition.y + 'px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }"
      />
      
      <div class="tool-area" 
           @dragover="handleDragEvent($event, 'tools')"
           @dragenter="handleDragEvent($event, 'tools')"
           @dragleave="handleDragLeave"
           @drop="handleDrop($event, 'tools')"
           :class="{ 'drop-target': dropTarget === 'tools' }">
        <div class="tool-grid">
          <div 
            class="inventory-slot" 
            :class="{ 'has-item': item, 'selected': selectedToolItem === item }" 
            v-for="(item, index) in toolsItems" 
            :key="item ? item.id : 'tool-'+index"
            @click="item && handleItemClick(item, 'tools', $event)"
            @mouseenter="item && handleItemMouseEnter($event, item)"
            @mouseleave="handleItemMouseLeave"
            :draggable="!!item"
            @dragstart="item && handleDragStart($event, item, 'tools')"
          >
            <div v-if="item" class="item-container" :class="getRarityClass(item.value)">
              <img :src="item.imageUrl" class="item-image" :alt="item.name" />
            </div>
          </div>
          <!-- Add empty slots to fill the grid if needed -->
          <div 
            class="inventory-slot" 
            v-for="n in Math.max(0, 32 - (toolsItems ? toolsItems.length : 0))" 
            :key="'empty-'+n"
          ></div>
          
          <!-- Empty grid prompt message -->
          <div v-if="isToolGridEmpty" class="empty-grid-prompt">
            Drag an item here to use as a tool
          </div>
        </div>
      </div>
      
      <!-- Skills Dropdown - Show when a tool is selected and dropdown is toggled -->
      <div v-if="showSkillsDropdown && selectedToolItem && selectedToolSkills.length > 0" 
           class="skills-dropdown"
           :style="{
             left: `${skillsDropdownPosition.x}px`,
             top: `${skillsDropdownPosition.y}px`
           }">
        <div class="skills-container">
          <button 
            v-for="(skill, index) in selectedToolSkills" 
            :key="index"
            class="skill-button"
            @click="handleSkillClick(skill, $event)"
          >
            <div class="skill-button-content">
              <div class="skill-icon">
                <img :src="selectedToolItem.imageUrl" class="tool-icon-image" :alt="selectedToolItem.name" />
              </div>
              <div class="skill-text">
                <div class="skill-name">{{ skill.name }}</div>
                <div class="skill-description">{{ skill.description }}</div>
              </div>
            </div>
          </button>
        </div>
      </div>
      
      <!-- Working Area -->
      <div class="working-area"
           @dragover="handleDragEvent($event, 'working')"
           @dragenter="handleDragEvent($event, 'working')"
           @dragleave="handleDragLeave"
           @drop="handleDrop($event, 'working')"
           :class="{ 'drop-target': dropTarget === 'working' }">
        <div class="working-grid">
          <div 
            class="inventory-slot working-slot" 
            :class="{ 'has-item': item }" 
            v-for="(item, index) in workingItems" 
            :key="item ? item.id : 'working-'+index"
            @click="item && handleItemClick(item, 'working')"
            @mouseenter="item && handleItemMouseEnter($event, item)"
            @mouseleave="handleItemMouseLeave"
            :draggable="!!item"
            @dragstart="item && handleDragStart($event, item, 'working')"
          >
            <div v-if="item" class="item-container" :class="getRarityClass(item.value)">
              <img :src="item.imageUrl" class="item-image" :alt="item.name" />
            </div>
          </div>
          <!-- Add empty slots to fill the grid if needed -->
          <div 
            class="inventory-slot working-slot" 
            v-for="n in Math.max(0, 5 - (workingItems ? workingItems.length : 0))" 
            :key="'empty-working-'+n"
          ></div>
        </div>
      </div>

    </div>
    
    <!-- Skill cursor that follows the mouse when a skill is selected -->
    <div v-if="selectedSkill" 
         class="skill-cursor"
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
  transform: translateX(-50%); /* Center horizontally relative to position */
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

.skill-name {
  font-weight: bold;
  margin-bottom: 4px;
  font-size: 0.95em;
}

.skill-description {
  font-size: 0.8em;
  opacity: 0.9;
  line-height: 1.3;
}

/* Skill cursor styling */

/* Skill cursor styling */
.skill-cursor {
  position: fixed;
  pointer-events: none; /* Allow clicking through the cursor */
  z-index: 2000;
  display: flex;
  align-items: center;
  transform: translate(-50%, -50%); /* Center on cursor */
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
</style>