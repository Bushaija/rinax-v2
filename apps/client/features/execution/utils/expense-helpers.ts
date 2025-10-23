/**
 * Utility functions for expense operations
 * Requirements: 1.1, 1.2, 3.1, 4.2
 */

import type { ExpenseEntry, PaymentStatus, FinancialBalances, PayableBreakdown } from '../types/expense'
import { ExpenseEntrySchema, CreateExpenseEntrySchema } from '../schemas/expense-validation'

/**
 * Calculate the remaining balance for an expense
 */
export function calculateRemainingBalance(expense: ExpenseEntry): number {
  return expense.amount - expense.amountPaid
}

/**
 * Determine if an expense is fully paid
 */
export function isExpenseFullyPaid(expense: ExpenseEntry): boolean {
  return expense.paymentStatus === 'paid' && expense.amountPaid === expense.amount
}

/**
 * Calculate total payables from breakdown
 */
export function calculateTotalPayables(payables: PayableBreakdown): number {
  return payables.salaries + payables.maintenance + payables.supplies + 
         payables.transportation + payables.other
}

/**
 * Update payment status and validate the change
 */
export function updatePaymentStatus(
  expense: ExpenseEntry, 
  newStatus: PaymentStatus, 
  newAmountPaid?: number
): ExpenseEntry {
  const updatedExpense: ExpenseEntry = {
    ...expense,
    paymentStatus: newStatus,
    amountPaid: newAmountPaid ?? expense.amountPaid,
    dateModified: new Date()
  }

  // Auto-calculate amountPaid based on status if not provided
  if (newAmountPaid === undefined) {
    switch (newStatus) {
      case 'paid':
        updatedExpense.amountPaid = expense.amount
        break
      case 'unpaid':
        updatedExpense.amountPaid = 0
        break
      case 'partial':
        // Keep existing amountPaid for partial, but ensure it's valid
        if (updatedExpense.amountPaid === 0 || updatedExpense.amountPaid === expense.amount) {
          throw new Error('Partial payment requires a valid amount between 0 and total expense')
        }
        break
    }
  }

  // Validate the updated expense
  const validationResult = ExpenseEntrySchema.safeParse(updatedExpense)
  if (!validationResult.success) {
    throw new Error(`Invalid expense update: ${validationResult.error.message}`)
  }

  return updatedExpense
}

/**
 * Create a new expense entry with validation
 */
export function createExpenseEntry(
  data: Omit<ExpenseEntry, 'id' | 'dateCreated' | 'dateModified'>
): Omit<ExpenseEntry, 'id' | 'dateCreated' | 'dateModified'> {
  // Validate the input data
  const validationResult = CreateExpenseEntrySchema.safeParse(data)
  if (!validationResult.success) {
    throw new Error(`Invalid expense data: ${validationResult.error.message}`)
  }

  return validationResult.data
}

/**
 * Calculate financial balances from a list of expenses
 * Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.3
 */
export function calculateFinancialBalances(
  expenses: ExpenseEntry[], 
  initialCash: number,
  categoryMapping?: Record<string, keyof PayableBreakdown>
): FinancialBalances {
  let totalExpenses = 0
  let totalPaid = 0
  const payables: PayableBreakdown = {
    salaries: 0,
    maintenance: 0,
    supplies: 0,
    transportation: 0,
    other: 0
  }

  expenses.forEach(expense => {
    totalExpenses += expense.amount
    totalPaid += expense.amountPaid

    // Add unpaid amount to appropriate payable category
    const unpaidAmount = expense.amount - expense.amountPaid
    if (unpaidAmount > 0) {
      const category = categoryMapping?.[expense.categoryId] || 'other'
      payables[category] += unpaidAmount
    }
  })

  return {
    cashAtBank: initialCash - totalPaid,
    payables,
    totalExpenses,
    initialCash
  }
}

/**
 * Calculate Cash at Bank from expense payments
 * Requirements: 1.3, 3.1, 3.2
 */
export function calculateCashAtBank(
  expenses: ExpenseEntry[],
  initialCash: number
): number {
  const totalPaid = expenses.reduce((sum, expense) => sum + expense.amountPaid, 0)
  return initialCash - totalPaid
}

/**
 * Calculate total payables from unpaid and partial expenses
 * Requirements: 1.4, 3.1, 3.2
 */
export function calculatePayables(
  expenses: ExpenseEntry[],
  categoryMapping?: Record<string, keyof PayableBreakdown>
): PayableBreakdown {
  const payables: PayableBreakdown = {
    salaries: 0,
    maintenance: 0,
    supplies: 0,
    transportation: 0,
    other: 0
  }

  expenses.forEach(expense => {
    const unpaidAmount = expense.amount - expense.amountPaid
    if (unpaidAmount > 0) {
      const category = categoryMapping?.[expense.categoryId] || 'other'
      payables[category] += unpaidAmount
    }
  })

  return payables
}

/**
 * Calculate real-time total expenses computation
 * Requirements: 1.5, 3.1, 3.2, 3.3
 */
export function calculateTotalExpenses(expenses: ExpenseEntry[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0)
}

/**
 * Calculate balance changes from expense modifications
 * Requirements: 3.1, 3.2, 3.3
 */
export function calculateBalanceChanges(
  oldExpenses: ExpenseEntry[],
  newExpenses: ExpenseEntry[],
  initialCash: number,
  categoryMapping?: Record<string, keyof PayableBreakdown>
): {
  oldBalances: FinancialBalances
  newBalances: FinancialBalances
  changes: {
    cashAtBankChange: number
    payablesChange: PayableBreakdown
    totalExpensesChange: number
  }
} {
  const oldBalances = calculateFinancialBalances(oldExpenses, initialCash, categoryMapping)
  const newBalances = calculateFinancialBalances(newExpenses, initialCash, categoryMapping)

  const changes = {
    cashAtBankChange: newBalances.cashAtBank - oldBalances.cashAtBank,
    payablesChange: {
      salaries: newBalances.payables.salaries - oldBalances.payables.salaries,
      maintenance: newBalances.payables.maintenance - oldBalances.payables.maintenance,
      supplies: newBalances.payables.supplies - oldBalances.payables.supplies,
      transportation: newBalances.payables.transportation - oldBalances.payables.transportation,
      other: newBalances.payables.other - oldBalances.payables.other
    },
    totalExpensesChange: newBalances.totalExpenses - oldBalances.totalExpenses
  }

  return { oldBalances, newBalances, changes }
}

/**
 * Validate balance calculations for consistency
 * Requirements: 3.1, 3.2, 3.3
 */
export function validateBalanceConsistency(
  expenses: ExpenseEntry[],
  balances: FinancialBalances,
  categoryMapping?: Record<string, keyof PayableBreakdown>
): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Recalculate balances for comparison
  const calculatedBalances = calculateFinancialBalances(expenses, balances.initialCash, categoryMapping)
  
  // Check cash at bank consistency
  if (Math.abs(balances.cashAtBank - calculatedBalances.cashAtBank) > 0.01) {
    errors.push(`Cash at Bank mismatch: expected ${calculatedBalances.cashAtBank}, got ${balances.cashAtBank}`)
  }
  
  // Check total expenses consistency
  if (Math.abs(balances.totalExpenses - calculatedBalances.totalExpenses) > 0.01) {
    errors.push(`Total Expenses mismatch: expected ${calculatedBalances.totalExpenses}, got ${balances.totalExpenses}`)
  }
  
  // Check payables consistency
  const payableCategories: (keyof PayableBreakdown)[] = ['salaries', 'maintenance', 'supplies', 'transportation', 'other']
  payableCategories.forEach(category => {
    if (Math.abs(balances.payables[category] - calculatedBalances.payables[category]) > 0.01) {
      errors.push(`${category} payables mismatch: expected ${calculatedBalances.payables[category]}, got ${balances.payables[category]}`)
    }
  })
  
  // Check that cash at bank + total payables + total paid equals initial cash + total expenses
  const totalPayables = calculateTotalPayables(balances.payables)
  const totalPaid = expenses.reduce((sum, expense) => sum + expense.amountPaid, 0)
  const expectedTotal = balances.initialCash + balances.totalExpenses
  const actualTotal = balances.cashAtBank + totalPayables + totalPaid
  
  if (Math.abs(expectedTotal - actualTotal) > 0.01) {
    errors.push(`Balance equation mismatch: initial cash (${balances.initialCash}) + total expenses (${balances.totalExpenses}) should equal cash at bank (${balances.cashAtBank}) + payables (${totalPayables}) + paid (${totalPaid})`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Calculate payment impact on balances before applying changes
 * Requirements: 3.1, 3.2, 3.3
 */
export function calculatePaymentImpact(
  expense: ExpenseEntry,
  newPaymentStatus: PaymentStatus,
  newAmountPaid?: number,
  categoryMapping?: Record<string, keyof PayableBreakdown>
): {
  cashAtBankChange: number
  payablesChange: number
  payableCategory: keyof PayableBreakdown
} {
  // Calculate current unpaid amount
  const currentUnpaid = expense.amount - expense.amountPaid
  
  // Calculate new amount paid
  let finalAmountPaid: number
  switch (newPaymentStatus) {
    case 'paid':
      finalAmountPaid = expense.amount
      break
    case 'unpaid':
      finalAmountPaid = 0
      break
    case 'partial':
      finalAmountPaid = newAmountPaid ?? expense.amountPaid
      break
  }
  
  // Calculate new unpaid amount
  const newUnpaid = expense.amount - finalAmountPaid
  
  // Calculate changes
  const cashAtBankChange = expense.amountPaid - finalAmountPaid // Negative means more cash spent
  const payablesChange = newUnpaid - currentUnpaid // Positive means more payables
  const payableCategory = categoryMapping?.[expense.categoryId] || 'other'
  
  return {
    cashAtBankChange,
    payablesChange,
    payableCategory
  }
}

/**
 * Real-time balance calculator for UI updates
 * Requirements: 3.1, 3.2, 3.3
 */
export function createRealTimeBalanceCalculator(
  initialCash: number,
  categoryMapping?: Record<string, keyof PayableBreakdown>
) {
  return {
    /**
     * Calculate balances from current expense list
     */
    calculate: (expenses: ExpenseEntry[]): FinancialBalances => {
      return calculateFinancialBalances(expenses, initialCash, categoryMapping)
    },
    
    /**
     * Calculate balance preview when adding a new expense
     */
    previewAdd: (
      currentExpenses: ExpenseEntry[],
      newExpense: Omit<ExpenseEntry, 'id' | 'dateCreated' | 'dateModified'>
    ): FinancialBalances => {
      const tempExpense: ExpenseEntry = {
        ...newExpense,
        id: 'temp',
        dateCreated: new Date(),
        dateModified: new Date()
      }
      return calculateFinancialBalances([...currentExpenses, tempExpense], initialCash, categoryMapping)
    },
    
    /**
     * Calculate balance preview when updating an expense
     */
    previewUpdate: (
      currentExpenses: ExpenseEntry[],
      expenseId: string,
      updates: Partial<ExpenseEntry>
    ): FinancialBalances => {
      const updatedExpenses = currentExpenses.map(expense =>
        expense.id === expenseId ? { ...expense, ...updates } : expense
      )
      return calculateFinancialBalances(updatedExpenses, initialCash, categoryMapping)
    },
    
    /**
     * Calculate balance preview when deleting an expense
     */
    previewDelete: (
      currentExpenses: ExpenseEntry[],
      expenseId: string
    ): FinancialBalances => {
      const filteredExpenses = currentExpenses.filter(expense => expense.id !== expenseId)
      return calculateFinancialBalances(filteredExpenses, initialCash, categoryMapping)
    }
  }
}