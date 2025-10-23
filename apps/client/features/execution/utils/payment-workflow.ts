/**
 * Payment workflow logic for expense recording feature
 * Requirements: 2.4, 1.3, 1.4, 1.5
 */

import type { ExpenseEntry, PaymentStatus, FinancialBalances } from '../types/expense'
import { PaymentUpdateSchema } from '../schemas/expense-validation'
import { updatePaymentStatus, calculatePaymentImpact } from './expense-helpers'

/**
 * Validation result interface
 */
export interface PaymentValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Payment workflow context interface
 */
export interface PaymentWorkflowContext {
  expense: ExpenseEntry
  currentBalances: FinancialBalances
  categoryMapping?: Record<string, keyof import('../types/expense').PayableBreakdown>
}

/**
 * Payment change result interface
 */
export interface PaymentChangeResult {
  updatedExpense: ExpenseEntry
  balanceImpact: {
    cashAtBankChange: number
    payablesChange: number
    payableCategory: keyof import('../types/expense').PayableBreakdown
  }
  validation: PaymentValidationResult
}

/**
 * Validate payment status change
 * Requirements: 2.4
 */
export function validatePaymentStatusChange(
  expense: ExpenseEntry,
  newStatus: PaymentStatus,
  newAmountPaid?: number
): PaymentValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate using Zod schema first
  const paymentUpdate = {
    expenseId: expense.id,
    paymentStatus: newStatus,
    amountPaid: newAmountPaid
  }

  const schemaValidation = PaymentUpdateSchema.safeParse(paymentUpdate)
  if (!schemaValidation.success) {
    errors.push(...schemaValidation.error.errors.map(err => err.message))
    return { isValid: false, errors, warnings }
  }

  // Additional business logic validation
  switch (newStatus) {
    case 'paid':
      if (newAmountPaid !== undefined && newAmountPaid !== expense.amount) {
        errors.push('For paid status, amount paid must equal total expense amount')
      }
      break

    case 'unpaid':
      if (newAmountPaid !== undefined && newAmountPaid !== 0) {
        errors.push('For unpaid status, amount paid must be zero')
      }
      break

    case 'partial':
      if (newAmountPaid === undefined) {
        errors.push('Partial payment requires a specific amount')
      } else {
        if (newAmountPaid <= 0) {
          errors.push('Partial payment amount must be greater than zero')
        }
        if (newAmountPaid >= expense.amount) {
          errors.push('Partial payment amount must be less than total expense')
        }
        if (newAmountPaid > expense.amount) {
          errors.push('Payment amount cannot exceed total expense amount')
        }
      }
      break
  }

  // Check for potential cash flow issues
  if (newStatus === 'paid' || (newStatus === 'partial' && newAmountPaid)) {
    const additionalPayment = (newAmountPaid ?? expense.amount) - expense.amountPaid
    // This is just a warning, not an error - the user might have other sources of cash
    if (additionalPayment > 0) {
      warnings.push(`This payment will reduce cash at bank by ${additionalPayment.toFixed(2)}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Process payment status change with validation and balance calculation
 * Requirements: 2.4, 1.3, 1.4, 1.5
 */
export function processPaymentStatusChange(
  context: PaymentWorkflowContext,
  newStatus: PaymentStatus,
  newAmountPaid?: number
): PaymentChangeResult {
  const { expense, categoryMapping } = context

  // Validate the payment change
  const validation = validatePaymentStatusChange(expense, newStatus, newAmountPaid)

  if (!validation.isValid) {
    throw new Error(`Payment validation failed: ${validation.errors.join(', ')}`)
  }

  // Calculate balance impact before making changes
  const balanceImpact = calculatePaymentImpact(
    expense,
    newStatus,
    newAmountPaid,
    categoryMapping
  )

  // Update the expense with new payment status
  const updatedExpense = updatePaymentStatus(expense, newStatus, newAmountPaid)

  return {
    updatedExpense,
    balanceImpact,
    validation
  }
}

/**
 * Handle payment status changes with real-time updates
 * Requirements: 1.3, 1.4, 1.5
 */
export class PaymentWorkflowManager {
  private categoryMapping?: Record<string, keyof import('../types/expense').PayableBreakdown>
  private onBalanceUpdate?: (balances: FinancialBalances) => void

  constructor(
    categoryMapping?: Record<string, keyof import('../types/expense').PayableBreakdown>,
    onBalanceUpdate?: (balances: FinancialBalances) => void
  ) {
    this.categoryMapping = categoryMapping
    this.onBalanceUpdate = onBalanceUpdate
  }

  /**
   * Process a payment status change and return the result
   */
  processPaymentChange(
    expense: ExpenseEntry,
    currentBalances: FinancialBalances,
    newStatus: PaymentStatus,
    newAmountPaid?: number
  ): PaymentChangeResult {
    const context: PaymentWorkflowContext = {
      expense,
      currentBalances,
      categoryMapping: this.categoryMapping
    }

    const result = processPaymentStatusChange(context, newStatus, newAmountPaid)
    
    // Trigger balance update callback if provided
    if (this.onBalanceUpdate) {
      const updatedBalances = this.calculateUpdatedBalances(
        currentBalances,
        result.balanceImpact
      )
      this.onBalanceUpdate(updatedBalances)
    }
    
    return result
  }

  /**
   * Calculate updated balances based on payment impact
   */
  private calculateUpdatedBalances(
    currentBalances: FinancialBalances,
    impact: PaymentChangeResult['balanceImpact']
  ): FinancialBalances {
    const updatedPayables = { ...currentBalances.payables }
    updatedPayables[impact.payableCategory] += impact.payablesChange

    return {
      ...currentBalances,
      cashAtBank: currentBalances.cashAtBank + impact.cashAtBankChange,
      payables: updatedPayables
    }
  }

  /**
   * Validate a payment change without processing it
   */
  validatePaymentChange(
    expense: ExpenseEntry,
    newStatus: PaymentStatus,
    newAmountPaid?: number
  ): PaymentValidationResult {
    return validatePaymentStatusChange(expense, newStatus, newAmountPaid)
  }

  /**
   * Calculate the impact of a payment change on balances
   */
  calculatePaymentImpact(
    expense: ExpenseEntry,
    newStatus: PaymentStatus,
    newAmountPaid?: number
  ) {
    return calculatePaymentImpact(expense, newStatus, newAmountPaid, this.categoryMapping)
  }

  /**
   * Get payment options for an expense
   */
  getPaymentOptions(expense: ExpenseEntry): {
    canMarkPaid: boolean
    canMarkUnpaid: boolean
    canMarkPartial: boolean
    maxPartialAmount: number
    currentStatus: PaymentStatus
  } {
    return {
      canMarkPaid: expense.paymentStatus !== 'paid',
      canMarkUnpaid: expense.paymentStatus !== 'unpaid',
      canMarkPartial: true, // Always allow partial payments
      maxPartialAmount: expense.amount,
      currentStatus: expense.paymentStatus
    }
  }

  /**
   * Format payment status for display
   */
  formatPaymentStatus(expense: ExpenseEntry): {
    label: string
    description: string
    color: 'success' | 'warning' | 'destructive'
  } {
    switch (expense.paymentStatus) {
      case 'paid':
        return {
          label: 'Paid',
          description: `Fully paid (${this.formatCurrency(expense.amountPaid)})`,
          color: 'success'
        }
      case 'unpaid':
        return {
          label: 'Unpaid',
          description: `Outstanding (${this.formatCurrency(expense.amount)})`,
          color: 'destructive'
        }
      case 'partial':
        const remaining = expense.amount - expense.amountPaid
        return {
          label: 'Partial',
          description: `Paid ${this.formatCurrency(expense.amountPaid)}, remaining ${this.formatCurrency(remaining)}`,
          color: 'warning'
        }
    }
  }

  /**
   * Validate payment change with comprehensive business rules
   * Requirements: 2.4, 1.3, 1.4, 1.5
   */
  validateComprehensivePaymentChange(
    expense: ExpenseEntry,
    newStatus: PaymentStatus,
    newAmountPaid?: number,
    currentBalances?: FinancialBalances
  ): PaymentValidationResult {
    const baseValidation = validatePaymentStatusChange(expense, newStatus, newAmountPaid)
    
    if (!baseValidation.isValid) {
      return baseValidation
    }

    const errors: string[] = [...baseValidation.errors]
    const warnings: string[] = [...baseValidation.warnings]

    // Additional business rule validations
    if (currentBalances) {
      const paymentImpact = this.calculatePaymentImpact(expense, newStatus, newAmountPaid)
      const projectedCashAtBank = currentBalances.cashAtBank + paymentImpact.cashAtBankChange

      // Warn if payment would result in negative cash balance
      if (projectedCashAtBank < 0) {
        warnings.push(`This payment would result in negative cash balance: ${this.formatCurrency(projectedCashAtBank)}`)
      }

      // Warn if payment significantly impacts cash flow
      const cashImpactPercentage = Math.abs(paymentImpact.cashAtBankChange) / Math.max(currentBalances.cashAtBank, 1) * 100
      if (cashImpactPercentage > 50) {
        warnings.push(`This payment represents ${cashImpactPercentage.toFixed(1)}% of current cash balance`)
      }
    }

    // Validate payment amount precision (no more than 2 decimal places)
    if (newAmountPaid !== undefined) {
      const decimalPlaces = (newAmountPaid.toString().split('.')[1] || '').length
      if (decimalPlaces > 2) {
        errors.push('Payment amount cannot have more than 2 decimal places')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Get payment transition options for an expense
   * Requirements: 2.4
   */
  getPaymentTransitionOptions(expense: ExpenseEntry): {
    availableTransitions: PaymentStatus[]
    recommendedAction?: string
    restrictions: string[]
  } {
    const availableTransitions: PaymentStatus[] = []
    const restrictions: string[] = []
    let recommendedAction: string | undefined

    // Always allow current status (no-op)
    availableTransitions.push(expense.paymentStatus)

    switch (expense.paymentStatus) {
      case 'unpaid':
        availableTransitions.push('paid', 'partial')
        recommendedAction = 'Consider marking as paid if payment has been made'
        break

      case 'partial':
        availableTransitions.push('paid', 'unpaid')
        if (expense.amountPaid > 0) {
          recommendedAction = 'Complete payment or adjust partial amount'
        }
        break

      case 'paid':
        availableTransitions.push('unpaid', 'partial')
        restrictions.push('Changing from paid status will affect cash balance')
        recommendedAction = 'Only change if payment was recorded incorrectly'
        break
    }

    return {
      availableTransitions: [...new Set(availableTransitions)],
      recommendedAction,
      restrictions
    }
  }

  /**
   * Format currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }
}

/**
 * Real-time payment preview calculator
 * Requirements: 1.3, 1.4, 1.5
 */
export function calculatePaymentPreview(
  expense: ExpenseEntry,
  newStatus: PaymentStatus,
  newAmountPaid: number | undefined,
  currentBalances: FinancialBalances,
  categoryMapping?: Record<string, keyof import('../types/expense').PayableBreakdown>
): {
  previewBalances: FinancialBalances
  changes: {
    cashAtBankChange: number
    payablesChange: number
    payableCategory: keyof import('../types/expense').PayableBreakdown
  }
} {
  const impact = calculatePaymentImpact(expense, newStatus, newAmountPaid, categoryMapping)
  
  const updatedPayables = { ...currentBalances.payables }
  updatedPayables[impact.payableCategory] += impact.payablesChange

  const previewBalances: FinancialBalances = {
    ...currentBalances,
    cashAtBank: currentBalances.cashAtBank + impact.cashAtBankChange,
    payables: updatedPayables
  }

  return {
    previewBalances,
    changes: impact
  }
}

/**
 * Default payment workflow manager instance
 */
export const defaultPaymentWorkflow = new PaymentWorkflowManager()

/**
 * Hook for using payment workflow in React components
 */
export function usePaymentWorkflow(
  categoryMapping?: Record<string, keyof import('../types/expense').PayableBreakdown>,
  onBalanceUpdate?: (balances: FinancialBalances) => void
) {
  const workflowManager = React.useMemo(
    () => new PaymentWorkflowManager(categoryMapping, onBalanceUpdate),
    [categoryMapping, onBalanceUpdate]
  )

  return {
    processPaymentChange: workflowManager.processPaymentChange.bind(workflowManager),
    validatePaymentChange: workflowManager.validatePaymentChange.bind(workflowManager),
    validateComprehensivePaymentChange: workflowManager.validateComprehensivePaymentChange.bind(workflowManager),
    calculatePaymentImpact: workflowManager.calculatePaymentImpact.bind(workflowManager),
    getPaymentOptions: workflowManager.getPaymentOptions.bind(workflowManager),
    getPaymentTransitionOptions: workflowManager.getPaymentTransitionOptions.bind(workflowManager),
    formatPaymentStatus: workflowManager.formatPaymentStatus.bind(workflowManager)
  }
}

// Import React for the hook
import * as React from 'react'