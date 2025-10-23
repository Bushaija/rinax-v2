/**
 * Core data types and interfaces for expense recording feature
 * Requirements: 1.1, 1.2, 3.1, 4.2
 */

// Core expense entry interface
export interface ExpenseEntry {
  id: string
  categoryId: string
  activityId: string
  description: string
  amount: number
  paymentStatus: PaymentStatus
  amountPaid: number
  dateCreated: Date
  dateModified: Date
}

// Payment status type
export type PaymentStatus = 'paid' | 'unpaid' | 'partial'

// Financial balances interface
export interface FinancialBalances {
  cashAtBank: number
  payables: PayableBreakdown
  totalExpenses: number
  initialCash: number
}

// Payable breakdown by category
export interface PayableBreakdown {
  salaries: number
  maintenance: number
  supplies: number
  transportation: number
  other: number
}

// Sync status for tracking data synchronization
export interface SyncStatus {
  isOnline: boolean
  lastSync: Date | null
  pendingChanges: boolean
  syncInProgress: boolean
}

// API data transfer objects
export interface ExpenseDataPayload {
  expenses: ExpenseEntry[]
  balances: FinancialBalances
  metadata: {
    lastModified: Date
    version: number
  }
}

// Sync response from server
export interface SyncResponse {
  success: boolean
  data?: ExpenseDataPayload
  conflicts?: ConflictResolution[]
  errors?: ValidationError[]
}

// Conflict resolution for sync operations
export interface ConflictResolution {
  expenseId: string
  field: string
  localValue: any
  serverValue: any
  resolution: 'server' | 'local'
}

// Validation error interface
export interface ValidationError {
  field: string
  message: string
  code: string
}

// Error handling types
export interface AppError {
  type: 'validation' | 'network' | 'sync' | 'unknown'
  message: string
  details?: any
}

export interface NetworkError extends AppError {
  type: 'network'
  status?: number
  retryable: boolean
}