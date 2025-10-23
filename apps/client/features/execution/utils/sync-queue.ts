/**
 * Sync queue manager for handling offline operations
 * Requirements: 5.1, 5.2, 5.3
 */

import { STORAGE_KEYS } from './local-storage'
import type { ExpenseEntry } from '../types/expense'

// Sync operation types
export type SyncOperation = 'create' | 'update' | 'delete'

// Sync queue item interface
export interface SyncQueueItem {
  id: string
  operation: SyncOperation
  expenseId: string
  data: any
  timestamp: Date
  retryCount: number
  maxRetries: number
  lastError?: string
}

// Sync queue manager class
export class SyncQueueManager {
  private static instance: SyncQueueManager | null = null
  private queue: SyncQueueItem[] = []
  private isProcessing = false
  private maxRetries = 3
  private retryDelay = 1000 // Start with 1 second

  static getInstance(): SyncQueueManager {
    if (!SyncQueueManager.instance) {
      SyncQueueManager.instance = new SyncQueueManager()
    }
    return SyncQueueManager.instance
  }

  constructor() {
    this.loadQueue()
  }

  /**
   * Add operation to sync queue
   */
  enqueue(operation: SyncOperation, expenseId: string, data: any): string {
    const item: SyncQueueItem = {
      id: `${operation}-${expenseId}-${Date.now()}`,
      operation,
      expenseId,
      data: this.serializeData(data),
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.maxRetries
    }

    this.queue.push(item)
    this.saveQueue()
    
    console.log(`Enqueued ${operation} operation for expense ${expenseId}`)
    return item.id
  }

  /**
   * Process all items in the queue
   */
  async processQueue(apiClient: SyncApiClient): Promise<ProcessResult> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0, remaining: this.queue.length }
    }

    this.isProcessing = true
    let processed = 0
    let failed = 0

    try {
      // Process items in chronological order
      const itemsToProcess = [...this.queue].sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      )

      for (const item of itemsToProcess) {
        try {
          await this.processItem(item, apiClient)
          this.removeFromQueue(item.id)
          processed++
          
          console.log(`Successfully processed ${item.operation} for expense ${item.expenseId}`)
        } catch (error) {
          item.retryCount++
          item.lastError = error instanceof Error ? error.message : 'Unknown error'
          
          if (item.retryCount >= item.maxRetries) {
            console.error(`Max retries exceeded for ${item.operation} on expense ${item.expenseId}`)
            this.removeFromQueue(item.id)
            failed++
          } else {
            console.warn(`Retry ${item.retryCount}/${item.maxRetries} for ${item.operation} on expense ${item.expenseId}`)
          }
        }
      }

      this.saveQueue()
    } finally {
      this.isProcessing = false
    }

    return { 
      processed, 
      failed, 
      remaining: this.queue.length 
    }
  }

  /**
   * Process individual queue item
   */
  private async processItem(item: SyncQueueItem, apiClient: SyncApiClient): Promise<void> {
    const data = this.deserializeData(item.data)
    
    switch (item.operation) {
      case 'create':
        await apiClient.createExpense(data)
        break
      case 'update':
        await apiClient.updateExpense(item.expenseId, data)
        break
      case 'delete':
        await apiClient.deleteExpense(item.expenseId)
        break
      default:
        throw new Error(`Unknown operation: ${item.operation}`)
    }
  }

  /**
   * Remove item from queue
   */
  private removeFromQueue(itemId: string): void {
    this.queue = this.queue.filter(item => item.id !== itemId)
  }

  /**
   * Get queue status
   */
  getQueueStatus(): QueueStatus {
    const now = new Date()
    const pendingItems = this.queue.length
    const failedItems = this.queue.filter(item => item.retryCount >= item.maxRetries).length
    const oldestItem = this.queue.length > 0 
      ? Math.min(...this.queue.map(item => item.timestamp.getTime()))
      : null

    return {
      pendingItems,
      failedItems,
      isProcessing: this.isProcessing,
      oldestItemAge: oldestItem ? now.getTime() - oldestItem : null,
      totalSize: this.calculateQueueSize()
    }
  }

  /**
   * Clear all items from queue
   */
  clearQueue(): void {
    this.queue = []
    this.saveQueue()
    console.log('Sync queue cleared')
  }

  /**
   * Clear failed items from queue
   */
  clearFailedItems(): void {
    const initialCount = this.queue.length
    this.queue = this.queue.filter(item => item.retryCount < item.maxRetries)
    const removedCount = initialCount - this.queue.length
    
    this.saveQueue()
    console.log(`Removed ${removedCount} failed items from sync queue`)
  }

  /**
   * Retry failed items (reset retry count)
   */
  retryFailedItems(): void {
    this.queue.forEach(item => {
      if (item.retryCount >= item.maxRetries) {
        item.retryCount = 0
        item.lastError = undefined
      }
    })
    
    this.saveQueue()
    console.log('Reset retry count for failed items')
  }

  /**
   * Get items by operation type
   */
  getItemsByOperation(operation: SyncOperation): SyncQueueItem[] {
    return this.queue.filter(item => item.operation === operation)
  }

  /**
   * Get items for specific expense
   */
  getItemsForExpense(expenseId: string): SyncQueueItem[] {
    return this.queue.filter(item => item.expenseId === expenseId)
  }

  /**
   * Check if expense has pending operations
   */
  hasPendingOperations(expenseId: string): boolean {
    return this.queue.some(item => item.expenseId === expenseId)
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      const serializedQueue = this.queue.map(item => ({
        ...item,
        timestamp: item.timestamp.toISOString()
      }))
      
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(serializedQueue))
    } catch (error) {
      console.error('Failed to save sync queue:', error)
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const queueData = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE)
      if (!queueData) {
        this.queue = []
        return
      }

      const parsedQueue = JSON.parse(queueData)
      this.queue = parsedQueue.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }))

      console.log(`Loaded ${this.queue.length} items from sync queue`)
    } catch (error) {
      console.error('Failed to load sync queue:', error)
      this.queue = []
    }
  }

  /**
   * Serialize data for storage
   */
  private serializeData(data: any): string {
    try {
      return JSON.stringify(data)
    } catch (error) {
      console.error('Failed to serialize data:', error)
      return '{}'
    }
  }

  /**
   * Deserialize data from storage
   */
  private deserializeData(data: string): any {
    try {
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to deserialize data:', error)
      return {}
    }
  }

  /**
   * Calculate total queue size in bytes
   */
  private calculateQueueSize(): number {
    try {
      const queueString = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || ''
      return queueString.length
    } catch (error) {
      return 0
    }
  }
}

// Interfaces for external use
export interface ProcessResult {
  processed: number
  failed: number
  remaining: number
}

export interface QueueStatus {
  pendingItems: number
  failedItems: number
  isProcessing: boolean
  oldestItemAge: number | null
  totalSize: number
}

// API client interface for sync operations
export interface SyncApiClient {
  createExpense(expense: ExpenseEntry): Promise<ExpenseEntry>
  updateExpense(id: string, updates: Partial<ExpenseEntry>): Promise<ExpenseEntry>
  deleteExpense(id: string): Promise<void>
}

// Export singleton instance
export const syncQueueManager = SyncQueueManager.getInstance()

// Utility functions
export const enqueueOperation = (operation: SyncOperation, expenseId: string, data: any) =>
  syncQueueManager.enqueue(operation, expenseId, data)

export const processQueue = (apiClient: SyncApiClient) =>
  syncQueueManager.processQueue(apiClient)

export const getQueueStatus = () =>
  syncQueueManager.getQueueStatus()

export const clearQueue = () =>
  syncQueueManager.clearQueue()

export const retryFailedItems = () =>
  syncQueueManager.retryFailedItems()