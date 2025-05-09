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

  emitEvent(eventType: string, data?: any) {
    const eventMap = this.eventListeners.get(eventType)
    if (eventMap) {
      eventMap.forEach(callback => callback(data))
    }
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