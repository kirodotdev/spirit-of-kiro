import { type Ref, computed } from 'vue'
import { useGameStore } from '../stores/game'
import type { SocketSystem } from './socket-system'
import type { Item } from './item-system'

export interface PreloadProgress {
  total: number
  loaded: number
  failed: number
  pending: number
}

// List of static assets to preload
const STATIC_ASSETS = [
  // Main game assets
  '/src/assets/background.png',
  '/src/assets/computer.png',
  '/src/assets/computer-zoom.png',
  '/src/assets/happy.png',
  '/src/assets/neutral.png',
  '/src/assets/unhappy.png',
  '/src/assets/sell-table.png',
  '/src/assets/appraising.png',
  '/src/assets/chest.png',
  '/src/assets/chest-open.png',
  '/src/assets/generic.png',
  '/src/assets/workbench.png',
  '/src/assets/workbench-zoom.png',
  '/src/assets/shelf.png',
  '/src/assets/panel-background.png',
  '/src/assets/lever.png',
  '/src/assets/garbage.png',
  '/src/assets/dispenser.png',
  '/src/assets/chute.png',
  // Ghost assets
  '/src/assets/kiro-ghost/southwest.png',
  '/src/assets/kiro-ghost/south.png',
  '/src/assets/kiro-ghost/northeast.png',
  '/src/assets/kiro-ghost/north.png',
  '/src/assets/kiro-ghost/east.png'
]

export class PreloaderSystem {
  private socketSystem: SocketSystem
  private eventListenerIds: string[] = []
  private loadingQueue: Set<string> = new Set()
  private loadedImages: Set<string> = new Set()
  private failedImages: Set<string> = new Set()
  private progress: Ref<PreloadProgress>
  private isInitialLoadComplete: Ref<boolean>

  constructor(socketSystem: SocketSystem, progress: Ref<PreloadProgress>, isInitialLoadComplete: Ref<boolean>) {
    this.socketSystem = socketSystem
    this.progress = progress
    this.isInitialLoadComplete = isInitialLoadComplete

    console.log('[PreloaderSystem] Initialized')
    
    // Subscribe to the same events as ItemSystem to preload item images
    this.eventListenerIds.push(this.socketSystem.addEventListener('inventory-items:*', this.handleInventoryItems.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('pulled-item', this.handlePulledItem.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('skill-results', this.handleSkillResults.bind(this)))
    this.eventListenerIds.push(this.socketSystem.addEventListener('discarded-results', this.handleDiscardedResults.bind(this)))
    console.log('[PreloaderSystem] Subscribed to item events')

    // Automatically start loading static assets
    this.preloadStaticAssets(STATIC_ASSETS).catch(error => {
      console.error('[PreloaderSystem] Failed to load static assets:', error)
    })
  }

  /**
   * Preloads a single image and updates progress
   */
  private async preloadImage(url: string): Promise<void> {
    if (this.loadedImages.has(url) || this.failedImages.has(url) || this.loadingQueue.has(url)) {
      return
    }

    this.loadingQueue.add(url)
    this.updateProgress()
    console.log(`[PreloaderSystem] Starting to load image: ${url}`)

    try {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })
      this.loadedImages.add(url)
      console.log(`[PreloaderSystem] Successfully loaded image: ${url}`)
    } catch (error) {
      console.error(`[PreloaderSystem] Failed to load image: ${url}`, error)
      this.failedImages.add(url)
    } finally {
      this.loadingQueue.delete(url)
      this.updateProgress()
    }
  }

  /**
   * Updates the progress state
   */
  private updateProgress() {
    const newProgress = {
      total: this.loadedImages.size + this.failedImages.size + this.loadingQueue.size,
      loaded: this.loadedImages.size,
      failed: this.failedImages.size,
      pending: this.loadingQueue.size
    }
    this.progress.value = newProgress
    
    // Log progress update
    console.log('[PreloaderSystem] Progress Update:', {
      total: newProgress.total,
      loaded: newProgress.loaded,
      failed: newProgress.failed,
      pending: newProgress.pending,
      percentComplete: newProgress.total > 0 
        ? Math.round((newProgress.loaded / newProgress.total) * 100) 
        : 0
    })
  }

  /**
   * Preloads all static game assets
   */
  async preloadStaticAssets(staticAssets: string[]): Promise<void> {
    console.log(`[PreloaderSystem] Starting to preload ${staticAssets.length} static assets`)
    const promises = staticAssets.map(url => this.preloadImage(url))
    await Promise.all(promises)
    this.isInitialLoadComplete.value = true
    console.log('[PreloaderSystem] Initial static assets load complete')
  }

  /**
   * Preloads images from an array of items
   */
  private async preloadItemImages(items: Item[]): Promise<void> {
    const imageUrls = items
      .map(item => item.imageUrl)
      .filter(url => url && !this.loadedImages.has(url) && !this.failedImages.has(url))
    
    if (imageUrls.length > 0) {
      console.log(`[PreloaderSystem] Found ${imageUrls.length} new item images to preload`)
      await Promise.all(imageUrls.map(url => this.preloadImage(url)))
    }
  }

  private handleInventoryItems(data?: any) {
    if (Array.isArray(data)) {
      console.log(`[PreloaderSystem] Received ${data.length} inventory items`)
      this.preloadItemImages(data)
    }
  }

  private handlePulledItem(data?: any) {
    if (data?.item) {
      console.log('[PreloaderSystem] Received pulled item')
      this.preloadItemImages([data.item])
    }
  }

  private handleSkillResults(data?: any) {
    const items: Item[] = []
    if (data.tool) items.push(data.tool)
    if (data.outputItems) items.push(...data.outputItems)
    if (items.length > 0) {
      console.log(`[PreloaderSystem] Received ${items.length} items from skill results`)
      this.preloadItemImages(items)
    }
  }

  private handleDiscardedResults(data?: any) {
    if (Array.isArray(data)) {
      console.log(`[PreloaderSystem] Received ${data.length} discarded items`)
      this.preloadItemImages(data)
    }
  }

  cleanup() {
    console.log('[PreloaderSystem] Cleaning up event listeners')
    this.eventListenerIds.forEach(id => {
      this.socketSystem.removeEventListener('discarded-results', id)
    })
    this.eventListenerIds = []
  }
} 