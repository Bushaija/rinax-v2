/**
 * Local storage utilities for expense data persistence
 * Requirements: 5.3, 5.4
 */

import type { 
  ExpenseEntry, 
  FinancialBalances, 
  SyncStatus,
  ExpenseDataPayload 
} from '../types/expense'

// Storage keys
export const STORAGE_KEYS = {
  EXPENSE_DATA: 'expense-store',
  DATA_VERSION: 'expense-data-version',
  MIGRATION_LOG: 'expense-migration-log',
  BACKUP_PREFIX: 'expense-backup-',
  SYNC_QUEUE: 'expense-sync-queue'
} as const

// Current data version for migration tracking
export const CURRENT_DATA_VERSION = 2

// Storage interfaces
export interface StoredExpenseData {
  expenses: ExpenseEntry[]
  balances: FinancialBalances
  syncStatus: SyncStatus
  version: number
  lastModified: Date
}

export interface MigrationLog {
  fromVersion: number
  toVersion: number
  timestamp: Date
  success: boolean
  errors?: string[]
}

export interface SyncQueueItem {
  id: string
  operation: 'create' | 'update' | 'delete'
  data: any
  timestamp: Date
  retryCount: number
}

// Local storage manager class
export class LocalStorageManager {
  private static instance: LocalStorageManager | null = null

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager()
    }
    return LocalStorageManager.instance
  }

  /**
   * Save expense data to local storage with versioning
   */
  saveExpenseData(data: Omit<StoredExpenseData, 'version' | 'lastModified'>): boolean {
    try {
      const versionedData: StoredExpenseData = {
        ...data,
        version: CURRENT_DATA_VERSION,
        lastModified: new Date()
      }

      // Create backup before saving new data
      this.createBackup()

      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.EXPENSE_DATA, JSON.stringify(versionedData))
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION.toString())

      return true
    } catch (error) {
      console.error('Failed to save expense data to localStorage:', error)
      return false
    }
  }

  /**
   * Load expense data from local storage with migration support
   */
  loadExpenseData(): StoredExpenseData | null {
    try {
      const rawData = localStorage.getItem(STORAGE_KEYS.EXPENSE_DATA)
      if (!rawData) {
        return null
      }

      const data = JSON.parse(rawData) as StoredExpenseData

      // Convert date strings back to Date objects
      const processedData = this.deserializeDates(data)

      // Check if migration is needed
      if (processedData.version < CURRENT_DATA_VERSION) {
        return this.migrateData(processedData)
      }

      return processedData
    } catch (error) {
      console.error('Failed to load expense data from localStorage:', error)
      
      // Try to recover from backup
      return this.recoverFromBackup()
    }
  }

  /**
   * Create a backup of current data
   */
  private createBackup(): boolean {
    try {
      const currentData = localStorage.getItem(STORAGE_KEYS.EXPENSE_DATA)
      if (currentData) {
        const backupKey = `${STORAGE_KEYS.BACKUP_PREFIX}${Date.now()}`
        localStorage.setItem(backupKey, currentData)

        // Keep only the last 5 backups
        this.cleanupOldBackups()
      }
      return true
    } catch (error) {
      console.error('Failed to create backup:', error)
      return false
    }
  }

  /**
   * Recover data from the most recent backup
   */
  private recoverFromBackup(): StoredExpenseData | null {
    try {
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_KEYS.BACKUP_PREFIX))
        .sort((a, b) => {
          const timestampA = parseInt(a.replace(STORAGE_KEYS.BACKUP_PREFIX, ''))
          const timestampB = parseInt(b.replace(STORAGE_KEYS.BACKUP_PREFIX, ''))
          return timestampB - timestampA // Most recent first
        })

      if (backupKeys.length === 0) {
        return null
      }

      const mostRecentBackup = localStorage.getItem(backupKeys[0])
      if (!mostRecentBackup) {
        return null
      }

      const data = JSON.parse(mostRecentBackup) as StoredExpenseData
      console.log('Recovered data from backup:', backupKeys[0])
      
      return this.deserializeDates(data)
    } catch (error) {
      console.error('Failed to recover from backup:', error)
      return null
    }
  }

  /**
   * Clean up old backups, keeping only the most recent 5
   */
  private cleanupOldBackups(): void {
    try {
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_KEYS.BACKUP_PREFIX))
        .sort((a, b) => {
          const timestampA = parseInt(a.replace(STORAGE_KEYS.BACKUP_PREFIX, ''))
          const timestampB = parseInt(b.replace(STORAGE_KEYS.BACKUP_PREFIX, ''))
          return timestampB - timestampA // Most recent first
        })

      // Remove backups beyond the first 5
      backupKeys.slice(5).forEach(key => {
        localStorage.removeItem(key)
      })
    } catch (error) {
      console.error('Failed to cleanup old backups:', error)
    }
  }

  /**
   * Migrate data from older versions
   */
  private migrateData(data: StoredExpenseData): StoredExpenseData {
    const migrationLog: MigrationLog = {
      fromVersion: data.version,
      toVersion: CURRENT_DATA_VERSION,
      timestamp: new Date(),
      success: false,
      errors: []
    }

    try {
      let migratedData = { ...data }

      // Migration from version 1 to 2
      if (data.version === 1) {
        migratedData = this.migrateFromV1ToV2(migratedData)
      }

      // Update version
      migratedData.version = CURRENT_DATA_VERSION
      migratedData.lastModified = new Date()

      // Save migrated data
      localStorage.setItem(STORAGE_KEYS.EXPENSE_DATA, JSON.stringify(migratedData))
      localStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION.toString())

      migrationLog.success = true
      this.logMigration(migrationLog)

      console.log(`Successfully migrated data from v${data.version} to v${CURRENT_DATA_VERSION}`)
      return migratedData
    } catch (error) {
      migrationLog.errors = [error instanceof Error ? error.message : 'Unknown migration error']
      this.logMigration(migrationLog)
      
      console.error('Data migration failed:', error)
      throw new Error(`Failed to migrate data from version ${data.version} to ${CURRENT_DATA_VERSION}`)
    }
  }

  /**
   * Migrate from version 1 to version 2
   * Example: Add new fields, restructure data, etc.
   */
  private migrateFromV1ToV2(data: StoredExpenseData): StoredExpenseData {
    // Example migration: ensure all expenses have required fields
    const migratedExpenses = data.expenses.map(expense => ({
      ...expense,
      // Add any new fields that might be missing in v1
      activityId: expense.activityId || 'default-activity',
      amountPaid: expense.amountPaid || (expense.paymentStatus === 'paid' ? expense.amount : 0)
    }))

    // Example: ensure balances structure is complete
    const migratedBalances = {
      ...data.balances,
      payables: {
        salaries: 0,
        maintenance: 0,
        supplies: 0,
        transportation: 0,
        other: 0,
        ...data.balances.payables
      }
    }

    return {
      ...data,
      expenses: migratedExpenses,
      balances: migratedBalances
    }
  }

  /**
   * Convert date strings back to Date objects after JSON parsing
   */
  private deserializeDates(data: StoredExpenseData): StoredExpenseData {
    return {
      ...data,
      lastModified: new Date(data.lastModified),
      expenses: data.expenses.map(expense => ({
        ...expense,
        dateCreated: new Date(expense.dateCreated),
        dateModified: new Date(expense.dateModified)
      })),
      syncStatus: {
        ...data.syncStatus,
        lastSync: data.syncStatus.lastSync ? new Date(data.syncStatus.lastSync) : null
      }
    }
  }

  /**
   * Log migration attempts
   */
  private logMigration(log: MigrationLog): void {
    try {
      const existingLogs = this.getMigrationLogs()
      existingLogs.push(log)
      
      // Keep only the last 10 migration logs
      const recentLogs = existingLogs.slice(-10)
      
      localStorage.setItem(STORAGE_KEYS.MIGRATION_LOG, JSON.stringify(recentLogs))
    } catch (error) {
      console.error('Failed to log migration:', error)
    }
  }

  /**
   * Get migration history
   */
  getMigrationLogs(): MigrationLog[] {
    try {
      const logs = localStorage.getItem(STORAGE_KEYS.MIGRATION_LOG)
      if (!logs) {
        return []
      }
      
      return JSON.parse(logs).map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }))
    } catch (error) {
      console.error('Failed to get migration logs:', error)
      return []
    }
  }

  /**
   * Clear all expense data from localStorage
   */
  clearExpenseData(): boolean {
    try {
      // Remove main data
      localStorage.removeItem(STORAGE_KEYS.EXPENSE_DATA)
      localStorage.removeItem(STORAGE_KEYS.DATA_VERSION)
      
      // Remove backups
      Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_KEYS.BACKUP_PREFIX))
        .forEach(key => localStorage.removeItem(key))
      
      // Clear sync queue
      localStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE)
      
      return true
    } catch (error) {
      console.error('Failed to clear expense data:', error)
      return false
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): {
    totalSize: number
    expenseDataSize: number
    backupCount: number
    hasData: boolean
  } {
    try {
      const expenseData = localStorage.getItem(STORAGE_KEYS.EXPENSE_DATA)
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith(STORAGE_KEYS.BACKUP_PREFIX))
      
      let totalSize = 0
      Object.keys(localStorage).forEach(key => {
        totalSize += (localStorage.getItem(key) || '').length
      })

      return {
        totalSize,
        expenseDataSize: expenseData ? expenseData.length : 0,
        backupCount: backupKeys.length,
        hasData: !!expenseData
      }
    } catch (error) {
      console.error('Failed to get storage info:', error)
      return {
        totalSize: 0,
        expenseDataSize: 0,
        backupCount: 0,
        hasData: false
      }
    }
  }

  /**
   * Validate data integrity
   */
  validateDataIntegrity(data: StoredExpenseData): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required fields
    if (!Array.isArray(data.expenses)) {
      errors.push('Expenses must be an array')
    }

    if (!data.balances || typeof data.balances !== 'object') {
      errors.push('Balances must be an object')
    }

    if (!data.syncStatus || typeof data.syncStatus !== 'object') {
      errors.push('Sync status must be an object')
    }

    // Validate expenses
    data.expenses.forEach((expense, index) => {
      if (!expense.id) {
        errors.push(`Expense at index ${index} missing id`)
      }
      if (typeof expense.amount !== 'number' || expense.amount < 0) {
        errors.push(`Expense at index ${index} has invalid amount`)
      }
      if (!['paid', 'unpaid', 'partial'].includes(expense.paymentStatus)) {
        errors.push(`Expense at index ${index} has invalid payment status`)
      }
    })

    // Validate balances
    if (data.balances) {
      if (typeof data.balances.cashAtBank !== 'number') {
        errors.push('Cash at bank must be a number')
      }
      if (typeof data.balances.totalExpenses !== 'number') {
        errors.push('Total expenses must be a number')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const localStorageManager = LocalStorageManager.getInstance()

// Utility functions for easier access
export const saveExpenseData = (data: Omit<StoredExpenseData, 'version' | 'lastModified'>) => 
  localStorageManager.saveExpenseData(data)

export const loadExpenseData = () => 
  localStorageManager.loadExpenseData()

export const clearExpenseData = () => 
  localStorageManager.clearExpenseData()

export const getStorageInfo = () => 
  localStorageManager.getStorageInfo()

export const getMigrationLogs = () => 
  localStorageManager.getMigrationLogs()