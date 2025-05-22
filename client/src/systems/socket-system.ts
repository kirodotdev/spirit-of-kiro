import type { Ref } from 'vue'

export class SocketSystem {
  private ws: Ref<WebSocket | null>
  private wsConnected: Ref<boolean>
  private isAuthenticated: Ref<boolean>
  private eventListeners: Map<string, Map<string, (data?: any) => void>>

  // Reconnection properties
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 10
  private baseReconnectDelay: number = 1000 // 1 second
  private maxReconnectDelay: number = 30000 // 30 seconds
  private reconnectTimeoutId: number | null = null

  // Wildcard character for event pattern matching
  private readonly wildcardChar: string = '*'

  constructor(
    ws: Ref<WebSocket | null>,
    wsConnected: Ref<boolean>,
    isAuthenticated: Ref<boolean>
  ) {
    this.ws = ws
    this.wsConnected = wsConnected
    this.isAuthenticated = isAuthenticated
    this.eventListeners = new Map()
  }

  initWebSocket() {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'
    this.ws.value = new WebSocket(wsUrl)

    this.ws.value.onopen = () => {
      this.wsConnected.value = true
      console.log('WebSocket connected')

      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0
    }

    this.ws.value.onclose = (event) => {
      this.wsConnected.value = false
      this.isAuthenticated.value = false
      console.log('WebSocket disconnected', event)

      // Attempt to reconnect
      this.scheduleReconnect()
    }

    this.ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
      // Error handling is done in onclose handler
    }

    this.ws.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Received message:', data)

        if (data.type === 'signin_success' || data.type === 'signup_success') {
          this.isAuthenticated.value = true
        }

        this.emitEvent(data.type, data.body)
      } catch (e) {
        console.error('Error parsing WebSocket message:', e)
      }
    }
  }

  /**
   * Adds an event listener for the specified event type.
   * Supports wildcard patterns like "inventory-items:*" for subscribing to multiple events.
   * 
   * @param eventType - The event type to listen for, can include wildcards
   * @param callback - The callback function to execute when the event is emitted
   * @returns A unique listener ID that can be used to remove the listener
   */
  addEventListener(eventType: string, callback: (data?: any) => void): string {
    const listenerId = crypto.randomUUID()

    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Map())
    }

    const eventMap = this.eventListeners.get(eventType)!
    eventMap.set(listenerId, callback)

    return listenerId
  }

  removeEventListener(eventType: string, listenerId: string) {
    const eventMap = this.eventListeners.get(eventType)
    if (!eventMap) {
      console.warn(`No listeners found for event type: ${eventType}`)
      return
    }

    if (!eventMap.has(listenerId)) {
      console.warn(`No listener found with ID ${listenerId} for event type: ${eventType}`)
      return
    }

    eventMap.delete(listenerId)

    // Clean up empty event maps
    if (eventMap.size === 0) {
      this.eventListeners.delete(eventType)
    }
  }

  /**
   * Checks if an event matches a pattern that may include wildcards.
   * For example, "inventory-items:123" matches the pattern "inventory-items:*"
   * 
   * @param eventType - The actual event type being emitted
   * @param pattern - The pattern to match against, may include wildcards
   * @returns True if the event matches the pattern
   */
  private matchesEventPattern(eventType: string, pattern: string): boolean {
    // If the pattern is exactly the event type, it's a direct match
    if (pattern === eventType) {
      return true
    }

    // If the pattern doesn't contain a wildcard, it can't be a match at this point
    if (!pattern.includes(this.wildcardChar)) {
      return false
    }

    // Convert the pattern to a regex by escaping special characters and replacing * with .*
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
      .replace(/\*/g, '.*'); // Replace * with .*

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventType);
  }

  /**
   * Emits an event to all registered listeners for the event type.
   * Also triggers any wildcard listeners that match the event type.
   * 
   * @param eventType - The type of event to emit
   * @param data - Optional data to pass to the event listeners
   */
  emitEvent(eventType: string, data?: any) {
    // First, trigger exact match listeners
    const exactEventMap = this.eventListeners.get(eventType)
    if (exactEventMap) {
      exactEventMap.forEach(callback => callback(data, eventType))
    }

    // Then, check for wildcard patterns that match this event
    this.eventListeners.forEach((listenerMap, pattern) => {
      // Skip the exact match we already processed
      if (pattern !== eventType && this.matchesEventPattern(eventType, pattern)) {
        listenerMap.forEach(callback => callback(data, eventType))
      }
    })
  }

  pullItem() {
    if (!this.ws.value || !this.isAuthenticated.value) {
      console.error('Cannot pull item: not connected or not authenticated')
      return
    }

    const message = {
      type: 'pull-item'
    }

    this.ws.value.send(JSON.stringify(message))
  }

  listInventory(inventoryId: string) {
    if (!this.ws.value || !this.isAuthenticated.value) {
      console.error('Cannot list inventory: not connected or not authenticated')
      return
    }

    const message = {
      type: 'list-inventory',
      body: {
        inventoryId: inventoryId
      }
    }

    this.ws.value.send(JSON.stringify(message))
  }

  discardItem(itemId: string) {
    if (!this.ws.value || !this.isAuthenticated.value) {
      console.error('Cannot discard item: not connected or not authenticated')
      return
    }

    const message = {
      type: 'discard-item',
      body: {
        itemId: itemId
      }
    }

    this.ws.value.send(JSON.stringify(message))
  }

  moveItem(itemId: string, targetInventoryId: string) {
    if (!this.ws.value || !this.isAuthenticated.value) {
      console.error('Cannot move item: not connected or not authenticated')
      return
    }

    const message = {
      type: 'move-item',
      body: {
        itemId: itemId,
        targetInventoryId: targetInventoryId
      }
    }

    this.ws.value.send(JSON.stringify(message))
  }

  useSkill(toolId: string, toolSkillIndex: number, targetIds: string[]) {
    if (!this.ws.value || !this.isAuthenticated.value) {
      console.error('Cannot use skill: not connected or not authenticated')
      return
    }

    const message = {
      type: 'use-skill',
      body: {
        toolId,
        toolSkillIndex,
        targetIds
      }
    }

    this.ws.value.send(JSON.stringify(message))
  }

  sellItem(itemId: string) {
    if (!this.ws.value || !this.isAuthenticated.value) {
      console.error('Cannot sell item: not connected or not authenticated')
      return
    }

    const message = {
      type: 'sell-item',
      body: {
        itemId: itemId
      }
    }

    this.ws.value.send(JSON.stringify(message))
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`)
      this.emitEvent('reconnect-failed')
      return
    }

    // Reset authentication state before reconnecting
    this.isAuthenticated.value = false

    // Calculate delay with exponential backoff: baseDelay * 2^attempts
    // with a maximum cap and some randomization to prevent thundering herd
    const exponentialDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts)
    const jitter = Math.random() * 0.5 + 0.75 // Random value between 0.75 and 1.25
    const delay = Math.min(exponentialDelay * jitter, this.maxReconnectDelay)

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms`)

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      this.emitEvent('reconnect-attempt', { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts })
      this.initWebSocket()
    }, delay)
  }

  /**
   * Manually attempt to reconnect, resetting the reconnect attempts
   */
  reconnect() {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }

    // Reset reconnect attempts
    this.reconnectAttempts = 0

    // Reset authentication state before reconnecting
    this.isAuthenticated.value = false

    // Close existing connection if any
    if (this.ws.value && (this.ws.value.readyState === WebSocket.OPEN || this.ws.value.readyState === WebSocket.CONNECTING)) {
      this.ws.value.close()
    }

    // Initiate new connection
    this.initWebSocket()
  }

  /**
   * Clean up resources when the component is unmounted
   */
  cleanup() {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }

    if (this.ws.value) {
      this.ws.value.close()
      this.ws.value = null
    }
  }
}