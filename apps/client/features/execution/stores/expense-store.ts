/**
 * Zustand store for expense recording feature
 * Requirements: 3.1, 3.2, 3.3
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { 
  ExpenseEntry, 
  PaymentStatus, 
  FinancialBalances, 
  SyncStatus,
  ExpenseDataPayload,
  SyncResponse,
  PayableBreakdown
} from '../types/expense'
import { 
  updatePaymentStatus, 
  createExpenseEntry, 
  calculateFinancialBalances 
} from '../utils/expense-helpers'
import { BalanceCalculationEngine } from '../utils/balance-calculation-engine'
import { 
  localStorageManager, 
  type StoredExpenseData,
  CURRENT_DATA_VERSION 
} from '../utils/local-storage'
import { 
  syncQueueManager, 
  enqueueOperation,
  type SyncApiClient 
} from '../utils/sync-queue'

// Store interface
export interface ExpenseStore {
  // State
  expenses: ExpenseEntry[]
  balances: FinancialBalances
  syncStatus: SyncStatus
  
  // Actions
  addExpense: (expense: Omit<ExpenseEntry, 'id' | 'dateCreated' | 'dateModified'>) => string
  updateExpense: (id: string, updates: Partial<ExpenseEntry>) => void
  deleteExpense: (id: string) => void
  updatePaymentStatus: (id: string, status: PaymentStatus, amount?: number) => void
  
  // Balance operations
  recalculateBalances: () => void
  setInitialCash: (amount: number) => void
  
  // Sync operations
  saveToServer: () => Promise<void>
  loadFromServer: () => Promise<void>
  enableAutoSave: (interval: number) => void
  disableAutoSave: () => void
  
  // Enhanced persistence operations
  saveToLocalStorage: () => boolean
  loadFromLocalStorage: () => boolean
  recoverFromBackup: () => boolean
  getStorageInfo: () => any
  getMigrationLogs: () => any[]
  
  // Sync queue operations
  processOfflineQueue: (apiClient?: SyncApiClient) => Promise<void>
  getQueueStatus: () => any
  clearSyncQueue: () => void
  retryFailedOperations: () => void
  
  // Utility actions
  clearAllExpenses: () => void
  getExpenseById: (id: string) => ExpenseEntry | undefined
  getExpensesByCategory: (categoryId: string) => ExpenseEntry[]
  
  // Internal state management
  setSyncStatus: (status: Partial<SyncStatus>) => void
  setExpenses: (expenses: ExpenseEntry[]) => void
  setBalances: (balances: FinancialBalances) => void
  
  // Balance engine operations
  initializeBalanceEngine: () => void
  getBalanceEngine: () => BalanceCalculationEngine | null
}

// Default initial state
const defaultBalances: FinancialBalances = {
  cashAtBank: 0,
  payables: {
    salaries: 0,
    maintenance: 0,
    supplies: 0,
    transportation: 0,
    other: 0
  },
  totalExpenses: 0,
  initialCash: 0
}

const defaultSyncStatus: SyncStatus = {
  isOnline: true,
  lastSync: null,
  pendingChanges: false,
  syncInProgress: false
}

// Auto-save interval reference
let autoSaveInterval: NodeJS.Timeout | null = null

// Category mapping for payables calculation
const defaultCategoryMapping: Record<string, keyof PayableBreakdown> = {
  'salaries': 'salaries',
  'maintenance': 'maintenance', 
  'supplies': 'supplies',
  'transportation': 'transportation'
}

// Balance calculation engine instance
let balanceEngine: BalanceCalculationEngine | null = null

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set, get) => ({
      // Initial state
      expenses: [],
      balances: defaultBalances,
      syncStatus: defaultSyncStatus,
      
      // Add new expense
      addExpense: (expenseData) => {
        try {
          // Validate and create expense entry
          const validatedData = createExpenseEntry(expenseData)
          
          const newExpense: ExpenseEntry = {
            id: nanoid(),
            ...validatedData,
            dateCreated: new Date(),
            dateModified: new Date()
          }
          
          set(state => {
            const updatedExpenses = [...state.expenses, newExpense]
            const updatedBalances = calculateFinancialBalances(
              updatedExpenses, 
              state.balances.initialCash,
              defaultCategoryMapping
            )
            
            return {
              expenses: updatedExpenses,
              balances: updatedBalances,
              syncStatus: {
                ...state.syncStatus,
                pendingChanges: true
              }
            }
          })
          
          // Queue for sync if offline
          if (!navigator.onLine) {
            enqueueOperation('create', newExpense.id, newExpense)
          }
          
          // Save to local storage
          get().saveToLocalStorage()
          
          return newExpense.id
        } catch (error) {
          console.error('Failed to add expense:', error)
          throw error
        }
      },
      
      // Update existing expense
      updateExpense: (id, updates) => {
        set(state => {
          const expenseIndex = state.expenses.findIndex(exp => exp.id === id)
          if (expenseIndex === -1) {
            throw new Error(`Expense with id ${id} not found`)
          }
          
          const updatedExpense = {
            ...state.expenses[expenseIndex],
            ...updates,
            dateModified: new Date()
          }
          
          const updatedExpenses = [...state.expenses]
          updatedExpenses[expenseIndex] = updatedExpense
          
          const updatedBalances = calculateFinancialBalances(
            updatedExpenses,
            state.balances.initialCash,
            defaultCategoryMapping
          )
          
          return {
            expenses: updatedExpenses,
            balances: updatedBalances,
            syncStatus: {
              ...state.syncStatus,
              pendingChanges: true
            }
          }
        })
        
        // Queue for sync if offline
        if (!navigator.onLine) {
          enqueueOperation('update', id, updates)
        }
        
        // Save to local storage
        get().saveToLocalStorage()
      },
      
      // Delete expense
      deleteExpense: (id) => {
        set(state => {
          const updatedExpenses = state.expenses.filter(exp => exp.id !== id)
          const updatedBalances = calculateFinancialBalances(
            updatedExpenses,
            state.balances.initialCash,
            defaultCategoryMapping
          )
          
          return {
            expenses: updatedExpenses,
            balances: updatedBalances,
            syncStatus: {
              ...state.syncStatus,
              pendingChanges: true
            }
          }
        })
        
        // Queue for sync if offline
        if (!navigator.onLine) {
          enqueueOperation('delete', id, null)
        }
        
        // Save to local storage
        get().saveToLocalStorage()
      },
      
      // Update payment status with validation
      updatePaymentStatus: (id, status, amount) => {
        set(state => {
          const expense = state.expenses.find(exp => exp.id === id)
          if (!expense) {
            throw new Error(`Expense with id ${id} not found`)
          }
          
          try {
            const updatedExpense = updatePaymentStatus(expense, status, amount)
            
            const expenseIndex = state.expenses.findIndex(exp => exp.id === id)
            const updatedExpenses = [...state.expenses]
            updatedExpenses[expenseIndex] = updatedExpense
            
            const updatedBalances = calculateFinancialBalances(
              updatedExpenses,
              state.balances.initialCash,
              defaultCategoryMapping
            )
            
            return {
              expenses: updatedExpenses,
              balances: updatedBalances,
              syncStatus: {
                ...state.syncStatus,
                pendingChanges: true
              }
            }
          } catch (error) {
            console.error('Failed to update payment status:', error)
            throw error
          }
        })
      },
      
      // Recalculate balances from current expenses
      recalculateBalances: () => {
        set(state => ({
          balances: calculateFinancialBalances(
            state.expenses,
            state.balances.initialCash,
            defaultCategoryMapping
          )
        }))
      },
      
      // Set initial cash amount
      setInitialCash: (amount) => {
        set(state => {
          const updatedBalances = {
            ...state.balances,
            initialCash: amount
          }
          
          // Recalculate with new initial cash
          const recalculatedBalances = calculateFinancialBalances(
            state.expenses,
            amount,
            defaultCategoryMapping
          )
          
          return {
            balances: recalculatedBalances,
            syncStatus: {
              ...state.syncStatus,
              pendingChanges: true
            }
          }
        })
      },
      
      // Save to server (placeholder implementation)
      saveToServer: async () => {
        const state = get()
        
        set(prevState => ({
          syncStatus: {
            ...prevState.syncStatus,
            syncInProgress: true
          }
        }))
        
        try {
          // TODO: Implement actual API call
          const payload: ExpenseDataPayload = {
            expenses: state.expenses,
            balances: state.balances,
            metadata: {
              lastModified: new Date(),
              version: 1
            }
          }
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          set(prevState => ({
            syncStatus: {
              ...prevState.syncStatus,
              syncInProgress: false,
              pendingChanges: false,
              lastSync: new Date()
            }
          }))
          
          console.log('Expenses saved to server successfully')
        } catch (error) {
          set(prevState => ({
            syncStatus: {
              ...prevState.syncStatus,
              syncInProgress: false,
              isOnline: false
            }
          }))
          
          console.error('Failed to save expenses to server:', error)
          throw error
        }
      },
      
      // Load from server (placeholder implementation)
      loadFromServer: async () => {
        set(prevState => ({
          syncStatus: {
            ...prevState.syncStatus,
            syncInProgress: true
          }
        }))
        
        try {
          // TODO: Implement actual API call
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // For now, just update sync status
          set(prevState => ({
            syncStatus: {
              ...prevState.syncStatus,
              syncInProgress: false,
              lastSync: new Date(),
              isOnline: true
            }
          }))
          
          console.log('Expenses loaded from server successfully')
        } catch (error) {
          set(prevState => ({
            syncStatus: {
              ...prevState.syncStatus,
              syncInProgress: false,
              isOnline: false
            }
          }))
          
          console.error('Failed to load expenses from server:', error)
          throw error
        }
      },
      
      // Enable auto-save
      enableAutoSave: (interval) => {
        // Clear existing interval
        if (autoSaveInterval) {
          clearInterval(autoSaveInterval)
        }
        
        autoSaveInterval = setInterval(() => {
          const state = get()
          if (state.syncStatus.pendingChanges && !state.syncStatus.syncInProgress) {
            state.saveToServer().catch(error => {
              console.error('Auto-save failed:', error)
            })
          }
        }, interval)
        
        console.log(`Auto-save enabled with ${interval}ms interval`)
      },
      
      // Disable auto-save
      disableAutoSave: () => {
        if (autoSaveInterval) {
          clearInterval(autoSaveInterval)
          autoSaveInterval = null
          console.log('Auto-save disabled')
        }
      },
      
      // Clear all expenses
      clearAllExpenses: () => {
        set(state => ({
          expenses: [],
          balances: {
            ...defaultBalances,
            initialCash: state.balances.initialCash
          },
          syncStatus: {
            ...state.syncStatus,
            pendingChanges: true
          }
        }))
      },
      
      // Get expense by ID
      getExpenseById: (id) => {
        return get().expenses.find(exp => exp.id === id)
      },
      
      // Get expenses by category
      getExpensesByCategory: (categoryId) => {
        return get().expenses.filter(exp => exp.categoryId === categoryId)
      },
      
      // Set sync status
      setSyncStatus: (status) => {
        set(state => ({
          syncStatus: {
            ...state.syncStatus,
            ...status
          }
        }))
      },
      
      // Set expenses directly (for loading from server)
      setExpenses: (expenses) => {
        set(state => {
          const updatedBalances = calculateFinancialBalances(
            expenses,
            state.balances.initialCash,
            defaultCategoryMapping
          )
          
          return {
            expenses,
            balances: updatedBalances
          }
        })
      },
      
      // Set balances directly
      setBalances: (balances) => {
        set({ balances })
      },
      
      // Initialize balance calculation engine
      initializeBalanceEngine: () => {
        const state = get()
        balanceEngine = new BalanceCalculationEngine(
          state.balances.initialCash,
          defaultCategoryMapping
        )
      },
      
      // Get balance calculation engine
      getBalanceEngine: () => {
        if (!balanceEngine) {
          get().initializeBalanceEngine()
        }
        return balanceEngine
      },
      
      // Enhanced persistence operations
      saveToLocalStorage: () => {
        const state = get()
        return localStorageManager.saveExpenseData({
          expenses: state.expenses,
          balances: state.balances,
          syncStatus: state.syncStatus
        })
      },
      
      loadFromLocalStorage: () => {
        try {
          const data = localStorageManager.loadExpenseData()
          if (!data) {
            return false
          }
          
          // Validate data integrity
          const validation = localStorageManager.validateDataIntegrity(data)
          if (!validation.isValid) {
            console.error('Data integrity validation failed:', validation.errors)
            return false
          }
          
          set({
            expenses: data.expenses,
            balances: data.balances,
            syncStatus: {
              ...data.syncStatus,
              syncInProgress: false, // Reset sync state on load
              isOnline: navigator?.onLine ?? true
            }
          })
          
          // Initialize balance engine
          get().initializeBalanceEngine()
          
          console.log('Successfully loaded data from localStorage')
          return true
        } catch (error) {
          console.error('Failed to load from localStorage:', error)
          return false
        }
      },
      
      recoverFromBackup: () => {
        try {
          // Clear current data and try to load from localStorage (which will try backup)
          const success = get().loadFromLocalStorage()
          if (success) {
            console.log('Successfully recovered from backup')
          }
          return success
        } catch (error) {
          console.error('Failed to recover from backup:', error)
          return false
        }
      },
      
      getStorageInfo: () => {
        return localStorageManager.getStorageInfo()
      },
      
      getMigrationLogs: () => {
        ret