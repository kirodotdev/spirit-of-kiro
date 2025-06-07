import { ref, computed, watch, type Ref } from 'vue'
import type { SocketSystem } from './socket-system'

export class FocusSystem {
  private focusStack = ref<string[]>([])
  private socketSystem: SocketSystem
  private eventListenerIds: string[] = []
  private interactionLocked: Ref<boolean>

  constructor(socketSystem: SocketSystem, interactionLocked: Ref<boolean>) {
    this.socketSystem = socketSystem
    this.interactionLocked = interactionLocked
    
    // Watch for changes to the focus stack
    watch(this.focusStack, (newStack) => {
      console.log('Focus stack changed:', [...newStack])
      // Update interactionLocked based on whether there are any focused components
      this.interactionLocked.value = newStack.length > 0
    }, { deep: true })
  }

  pushFocus(componentId: string) {
    // Emit lost-focus for the previous top item if it exists
    const previousFocus = this.focusStack.value[this.focusStack.value.length - 1]
    if (previousFocus) {
      this.socketSystem.emitEvent(`lost-focus:${previousFocus}`)
    }
    
    this.focusStack.value.push(componentId)
    this.socketSystem.emitEvent(`gained-focus:${componentId}`)
  }

  popFocus() {
    const previousFocus = this.focusStack.value[this.focusStack.value.length - 1]
    this.focusStack.value.pop()
    if (previousFocus) {
      this.socketSystem.emitEvent(`lost-focus:${previousFocus}`)
    }
    // Emit gained focus for the new top of stack if it exists
    const newFocus = this.focusStack.value[this.focusStack.value.length - 1]
    if (newFocus) {
      this.socketSystem.emitEvent(`gained-focus:${newFocus}`)
    }
  }

  hasFocus(componentId: string): boolean {
    return this.focusStack.value.length > 0 && 
           this.focusStack.value[this.focusStack.value.length - 1] === componentId
  }

  get focusedComponentRef() {
    return computed(() => 
      this.focusStack.value.length > 0 
        ? this.focusStack.value[this.focusStack.value.length - 1] 
        : null
    )
  }

  get focusStackRef() {
    return this.focusStack
  }

  cleanup() {
    // Remove event listeners
    this.eventListenerIds.forEach((id) => {
      this.socketSystem.removeEventListener('gained-focus:*', id)
      this.socketSystem.removeEventListener('lost-focus:*', id)
    })
    this.eventListenerIds = []
  }
} 