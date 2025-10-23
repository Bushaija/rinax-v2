/**
 * Advanced balance calculation engine for real-time expense tracking
 * Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.3
 */

import type { 
  ExpenseEntry, 
  PaymentStatus, 
  FinancialBalances, 
  PayableBreakdown 
} from '../types/expense'
import { 
  calculateFinancialBalances,
  calculateCashAtBank,
  calculatePayables,
  calculateTotalExpenses,
  calculateTotalPayables
} from './expense-helpers'

/**
 * Balance calculation engine with caching and optimization
 */
export class BalanceCalculationEngine {
  private initialCash: number
  private categoryMapping: Record<string, keyof PayableBreakdown>
  private cache: Map<string, FinancialBalances> = new Map()
  private cacheEnabled: boolean = true

  constructor(
    initialCash: number = 0,
    categoryMapping?: Record<string, keyof PayableBreakdown>
  ) {
    this.initialCash = initialCash
    this.categoryMapping = categoryMapping || {
      'salaries': 'salaries',
      'maintenance': 'maintenance',
      'supplies': 'supplies',
      'transportation': 'transportation'
    }
  }

  /**
   * Set initial cash amount
   */
  setInitialCash(amount: number): void {
    this.initialCash = amount
    this.clearCache()
  }

  /**
   * Update category mapping
   */
  setCategoryMapping(mapping: Record<string, keyof PayableBreakdown>): void {
    this.categoryMapping = mapping
    this.clearCache()
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled
    if (!enabled) {
      this.clearCache()
    }
  }

  /**
   * Clear calculation cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Generate cache key for expense list
   */
  private generateCacheKey(expenses: ExpenseEntry[]): string {
    const sortedExpenses = [...expenses].sort((a, b) => a.id.localeCompare(b.id))
    const expenseData = sortedExpenses.map(exp => 
      `${exp.id}:${exp.amount}:${exp.amountPaid}:${exp.paymentStatus}:${exp.categoryId}`
    ).join('|')
    return `${this.initialCash}:${expenseData}`
  }

  /**
   * Calculate balances with caching
   */
  calculateBalances(expenses: ExpenseEntry[]): FinancialBalances {
    if (!this.cacheEnabled) {
      return calculateFinancialBalances(expenses, this.initialCash, this.categoryMapping)
    }

    const cacheKey = this.generateCacheKey(expenses)
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    const balances = calculateFinancialBalances(expenses, this.initialCash, this.categoryMapping)
    this.cache.set(cacheKey, balances)
    
    return balances
  }

  /**
   * Calculate incremental balance changes for performance
   */
  calculateIncrementalChange(
    currentBalances: FinancialBalances,
    expense: ExpenseEntry,
    operation: 'add' | 'remove' | 'update',
    previousExpense?: ExpenseEntry
  ): FinancialBalances {
    let cashChange = 0
    let totalExpenseChange = 0
    const payableChanges: PayableBreakdown = {
      salaries: 0,
      maintenance: 0,
      supplies: 0,
      transportation: 0,
      other: 0
    }

    const category = this.categoryMapping[expense.categoryId] || 'other'

    switch (operation) {
      case 'add':
        totalExpenseChange = expense.amount
        cashChange = -expense.amountPaid
        payableChanges[category] = expense.amount - expense.amountPaid
        break

      case 'remove':
        totalExpenseChange = -expense.amount
        cashChange = expense.amountPaid
        payableChanges[category] = -(expense.amount - expense.amountPaid)
        break

      case 'update':
        if (!previousExpense) {
          throw new Error('Previous expense required for update operation')
        }
        
        totalExpenseChange = expense.amount - previousExpense.amount
        cashChange = previousExpense.amountPaid - expense.amountPaid
        
        const prevCategory = this.categoryMapping[previousExpense.categoryId] || 'other'
        const prevUnpaid = previousExpense.amount - previousExpense.amountPaid
        const newUnpaid = expense.amount - expense.amountPaid
        
        // Remove old payable
        payableChanges[prevCategory] -= prevUnpaid
        // Add new payable
        payableChanges[category] += newUnpaid
        break
    }

    return {
      cashAtBank: currentBalances.cashAtBank + cashChange,
      payables: {
        salaries: currentBalances.payables.salaries + payableChanges.salaries,
        maintenance: currentBalances.payables.maintenance + payableChanges.maintenance,
        supplies: currentBalances.payables.supplies + payableChanges.supplies,
        transportation: currentBalances.payables.transportation + payableChanges.transportation,
        other: currentBalances.payables.other + payableChanges.other
      },
      totalExpenses: currentBalances.totalExpenses + totalExpenseChange,
      initialCash: currentBalances.initialCash
    }
  }

  /**
   * Calculate payment status change impact
   */
  calculatePaymentStatusChange(
    currentBalances: FinancialBalances,
    expense: ExpenseEntry,
    newStatus: PaymentStatus,
    newAmountPaid?: number
  ): FinancialBalances {
    // Calculate new amount paid based on status
    let finalAmountPaid: number
    switch (newStatus) {
      case 'paid':
        finalAmountPaid = expense.amount
        break
      case 'unpaid':
        finalAmountPaid = 0
        break
      case 'partial':
        if (newAmountPaid === undefined) {
          throw new Error('Amount paid required for partial payment status')
        }
        finalAmountPaid = newAmountPaid
        break
    }

    // Calculate changes
    const cashChange = expense.amountPaid - finalAmountPaid
    const category = this.categoryMapping[expense.categoryId] || 'other'
    const oldUnpaid = expense.amount - expense.amountPaid
    const newUnpaid = expense.amount - finalAmountPaid
    const payableChange = newUnpaid - oldUnpaid

    const newPayables = { ...currentBalances.payables }
    newPayables[category] += payableChange

    return {
      ...currentBalances,
      cashAtBank: currentBalances.cashAtBank + cashChange,
      payables: newPayables
    }
  }

  /**
   * Batch calculate multiple expense changes
   */
  batchCalculateChanges(
    currentBalances: FinancialBalances,
    changes: Array<{
      type: 'add' | 'remove' | 'update'
      expense: ExpenseEntry
      previousExpense?: ExpenseEntry
    }>
  ): FinancialBalances {
    let result = { ...currentBalances }

    for (const change of changes) {
      result = this.calculateIncrementalChange(
        result,
        change.expense,
        change.type,
        change.previousExpense
      )
    }

    return result
  }

  /**
   * Validate balance integrity
   */
  validateBalances(
    expenses: ExpenseEntry[],
    balances: FinancialBalances
  ): {
    isValid: boolean
    errors: string[]
    correctedBalances?: FinancialBalances
  } {
    const errors: string[] = []
    
    // Calculate expected balances
    const expectedBalances = calculateFinancialBalances(
      expenses, 
      this.initialCash, 
      this.categoryMapping
    )

    // Check each balance component
    const tolerance = 0.01 // Allow for floating point precision issues

    if (Math.abs(balances.cashAtBank - expectedBalances.cashAtBank) > tolerance) {
      errors.push(`Cash at Bank: expected ${expectedBalances.cashAtBank}, got ${balances.cashAtBank}`)
    }

    if (Math.abs(balances.totalExpenses - expectedBalances.totalExpenses) > tolerance) {
      errors.push(`Total Expenses: expected ${expectedBalances.totalExpenses}, got ${balances.totalExpenses}`)
    }

    if (balances.initialCash !== expectedBalances.initialCash) {
      errors.push(`Initial Cash: expected ${expectedBalances.initialCash}, got ${balances.initialCash}`)
    }

    // Check payables
    const payableCategories: (keyof PayableBreakdown)[] = [
      'salaries', 'maintenance', 'supplies', 'transportation', 'other'
    ]
    
    payableCategories.forEach(category => {
      if (Math.abs(balances.payables[category] - expectedBalances.payables[category]) > tolerance) {
        errors.push(`${category} payables: expected ${expectedBalances.payables[category]}, got ${balances.payables[category]}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      correctedBalances: errors.length > 0 ? expectedBalances : undefined
    }
  }

  /**
   * Get balance summary statistics
   */
  getBalanceSummary(balances: FinancialBalances): {
    totalPayables: number
    totalPaid: number
    cashUtilizationRate: number
    payablesByCategory: Array<{ category: string; amount: number; percentage: number }>
  } {
    const totalPayables = calculateTotalPayables(balances.payables)
    const totalPaid = balances.initialCash - balances.cashAtBank
    const cashUtilizationRate = balances.initialCash > 0 ? (totalPaid / balances.initialCash) * 100 : 0

    const payablesByCategory = Object.entries(balances.payables)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalPayables > 0 ? (amount / totalPayables) * 100 : 0
      }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    return {
      totalPayables,
      totalPaid,
      cashUtilizationRate,
      payablesByCategory
    }
  }

  /**
   * Create a snapshot of current calculation state
   */
  createSnapshot(): {
    initialCash: number
    categoryMapping: Record<string, keyof PayableBreakdown>
    cacheSize: number
    timestamp: Date
  } {
    return {
      initialCash: this.initialCash,
      categoryMapping: { ...this.categoryMapping },
      cacheSize: this.cache.size,
      timestamp: new Date()
    }
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(snapshot: {
    initialCash: number
    categoryMapping: Record<string, keyof PayableBreakdown>
  }): void {
    this.initialCash = snapshot.initialCash
    this.categoryMapping = { ...snapshot.categoryMapping }
    this.clearCache()
  }
}

/**
 * Create a singleton instance for global use
 */
export const globalBalanceEngine = new BalanceCalculationEngine()

/**
 * Hook-like function for React components
 */
export function createBalanceCalculator(
  initialCash: number,
  categoryMapping?: Record<string, keyof PayableBreakdown>
) {
  const engine = new BalanceCalculationEngine(initialCash, categoryMapping)
  
  return {
    calculate: (expenses: ExpenseEntry[]) => engine.calculateBalances(expenses),
    calculateIncremental: (
      currentBalances: FinancialBalances,
      expense: ExpenseEntry,
      operation: 'add' | 'remove' | 'update',
      previousExpense?: ExpenseEntry
    ) => engine.calculateIncrementalChange(currentBalances, expense, operation, previousExpense),
    calculatePaymentChange: (
      currentBalances: FinancialBalances,
      expense: ExpenseEntry,
      newStatus: PaymentStatus,
      newAmountPaid?: number
    ) => engine.calculatePaymentStatusChange(currentBalances, expense, newStatus, newAmountPaid),
    validate: (expenses: ExpenseEntry[], balances: FinancialBalances) => 
      engine.validateBalances(expenses, balances),
    getSummary: (balances: FinancialBalances) => engine.getBalanceSummary(balances),
    setInitialCash: (amount: number) => engine.setInitialCash(amount),
    setCategoryMapping: (mapping: Record<string, keyof PayableBreakdown>) => 
      engine.setCategoryMapping(mapping),
    clearCache: () => engine.clearCache()
  }
}