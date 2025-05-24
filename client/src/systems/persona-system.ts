import { type Ref, ref, computed } from 'vue'
import type { SocketSystem } from './socket-system'

export class PersonaSystem {
  private personaData: Ref<Map<string, string>>
  private socketSystem: SocketSystem
  private initialized = false

  constructor(
    personaData: Ref<Map<string, string>>,
    socketSystem: SocketSystem
  ) {
    this.personaData = personaData
    this.socketSystem = socketSystem

    // Subscribe to relevant events
    this.socketSystem.addEventListener('persona-details', this.handlePersonaDetails.bind(this))
    this.socketSystem.addEventListener('gold-update', this.handleGoldUpdate.bind(this))
  }

  /**
   * Get a reactive object containing all persona data points
   * Automatically fetches data on first call
   */
  usePersona() {
    if (!this.initialized) {
      this.socketSystem.fetchPersona()
      this.initialized = true
    }

    return computed(() => {
      const details: Record<string, string> = {}
      this.personaData.value.forEach((value, key) => {
        details[key] = value
      })
      return details
    })
  }

  /**
   * Handle incoming persona details from the server
   */
  private handlePersonaDetails(details: Record<string, string>) {
    // Update all persona data points
    Object.entries(details).forEach(([key, value]) => {
      this.personaData.value.set(key, value)
    })
  }

  /**
   * Handle gold update events
   */
  private handleGoldUpdate(data: { gold: number }) {
    if (data.gold !== undefined) {
      this.personaData.value.set('gold', data.gold.toString())
    }
  }
} 