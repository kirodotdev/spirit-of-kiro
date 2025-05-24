<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useGameStore } from '../stores/game';

const store = useGameStore();
const visible = ref(false);
const currentMessage = ref('');
let lastNearDoorTime = 0;
const DEBOUNCE_TIME = 5000; // 5 seconds debounce

// Array of general shop messages
const messages = [
  "Get back to work! We need more items!",
  "The repair bench is waiting for you!",
  "Time to fix some more items!",
  "The shop needs more inventory!",
  "Customers are waiting for repaired items!",
  "Don't keep me waiting! Get crafting!",
  "The repair bench is empty! Get to work!",
  "We need more items to sell!",
  "The shelves are looking bare!",
  "Keep those repairs coming!"
];

// Array of door messages when holding an item
const doorMessagesWithItem = [
  "Ah, a great find! Throw it here!",
  "Perfect! Hand that over so I can sell it!",
  "That looks good! Toss it my way!",
  "I'll take that repaired item off your hands!",
  "Great work! Now give it to me to sell!"
];

// Array of door messages when not holding an item
const doorMessagesWithoutItem = [
  "Why aren't you at the repair bench?",
  "Get back to work! We need more items!",
  "The repair bench is waiting for you!",
  "Don't keep the customers waiting!",
  "Time to fix some more items!"
];

let messageInterval: number | null = null;
let nearDoorListenerId: string | null = null;

// Check if player is holding an item
const isHoldingItem = computed(() => {
  return store.heldItemId !== null;
});

function showRandomMessage() {
  const randomIndex = Math.floor(Math.random() * messages.length);
  currentMessage.value = messages[randomIndex];
  visible.value = true;
  
  // Hide the message after 3 seconds
  setTimeout(() => {
    visible.value = false;
  }, 3000);
}

function showDoorMessage() {
  const now = Date.now();
  if (now - lastNearDoorTime < DEBOUNCE_TIME) return;
  lastNearDoorTime = now;
  
  const messages = isHoldingItem.value ? doorMessagesWithItem : doorMessagesWithoutItem;
  const randomIndex = Math.floor(Math.random() * messages.length);
  currentMessage.value = messages[randomIndex];
  visible.value = true;
  
  // Hide the message after 3 seconds
  setTimeout(() => {
    visible.value = false;
  }, 3000);
}

onMounted(() => {
  // Show first message after 5 seconds
  setTimeout(() => {
    showRandomMessage();
  }, 5000);
  
  // Set up interval to show messages every 60 seconds
  messageInterval = window.setInterval(() => {
    if (!store.interactionLocked) { // Only check for dialogs being open
      showRandomMessage();
    }
  }, 60000);

  // Listen for near-door event
  nearDoorListenerId = store.addEventListener('near-door', () => {
    showDoorMessage();
  });
});

onUnmounted(() => {
  if (messageInterval) {
    clearInterval(messageInterval);
  }
  if (nearDoorListenerId) {
    store.removeEventListener('near-door', nearDoorListenerId);
  }
});
</script>

<template>
  <div v-if="visible" class="random-chat">
    <div class="chat-bubble">
      {{ currentMessage }}
    </div>
  </div>
</template>

<style scoped>
.random-chat {
  position: absolute;
  bottom: 5%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.chat-bubble {
  background-color: rgba(0, 0, 0, 0.7);
  color: #ddd;
  padding: 10px 15px;
  border-radius: 15px;
  font-size: 1.2em;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  animation: fadeIn 0.5s ease-in;
}

.chat-bubble:after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid rgba(0, 0, 0, 0.7);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style> 