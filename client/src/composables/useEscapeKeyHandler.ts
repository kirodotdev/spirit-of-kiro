import { onMounted, onUnmounted } from 'vue';
import { useGameStore } from '../stores/game';

export function useEscapeKeyHandler(componentId: string, customKeyDownHandler?: (event: KeyboardEvent) => boolean) {
  const gameStore = useGameStore();

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && gameStore.hasFocus(componentId)) {
      // If a custom handler is provided, use it
      if (customKeyDownHandler) {
        return customKeyDownHandler(event);
      }
      return true; // Return true if the event was handled
    }
    return false;
  }

  function handleGainedFocus() {
    window.addEventListener('keydown', handleKeyDown);
  }

  function handleLostFocus() {
    window.removeEventListener('keydown', handleKeyDown);
  }

  let gainedFocusListenerId: string;
  let lostFocusListenerId: string;

  onMounted(() => {
    gainedFocusListenerId = gameStore.addEventListener(`gained-focus:${componentId}`, handleGainedFocus);
    lostFocusListenerId = gameStore.addEventListener(`lost-focus:${componentId}`, handleLostFocus);
  });

  onUnmounted(() => {
    gameStore.removeEventListener(`gained-focus:${componentId}`, gainedFocusListenerId);
    gameStore.removeEventListener(`lost-focus:${componentId}`, lostFocusListenerId);
    window.removeEventListener('keydown', handleKeyDown);
  });

  return {
    handleKeyDown
  };
} 