/**
 * Hook for integrating payment status changes with expense store
 * Requirements: 2.4, 1.3, 1.4, 1.5
 */

import * as React from 'react'
import type { ExpenseEntry, PaymentStatus, FinancialBalances } from '../types/expense'
import { useExpenseActions, useExpenseState } from '../stores/expense-store'
import { usePaymentWorkflow } from '../utils/payment-workflow'

/**
 * Hook for handling payment status changes with store integration
 */
export function usePaymentIntegration() {
  const { updatePaymentStatus, recalculateBalances } = useExpenseActions()
  const { balances, expenses } = useExpenseState()
  
  // Callback for real-time balance updates
  const handleBalanceUpdate = React.useCallback((updatedBalances: FinancialBalances) => {
    // This could trigger UI updates or notifications
    console.log('Balance updated:', updatedBalances)
  }, [])
  
  const { 
    processPaymentChange, 
    validateComprehensivePaymentChange,
    getPaymentTransitionOptions 
  } = usePaymentWorkflow(undefined, handleBalanceUpdate)

  /**
   * Handle payment status change with validation and store update
   */
  const handlePaymentStatusChange = React.useCallback(
    async (
      expense: ExpenseEntry,
      newStatus: PaymentStatus,
      newAmountPaid?: number
    ): Promise<{
      success: boolean
      error?: string
      warnings?: string[]
      balanceImpact?: {
        cashAtBankChange: number
        payablesChange: number
        payableCategory: keyof import('../types/expense').PayableBreakdown
      }
    }> => {
      try {
        // Use comprehensive validation that includes business rules
        const validation = validateComprehensivePaymentChange(
          expense, 
          newStatus, 
          newAmountPaid, 
          balances
        )
        
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.errors.join(', '),
            warnings: validation.warnings
          }
        }

        // Process the payment change to get balance impact
        const result = processPaymentChange(
          expense,
          balances,
          newStatus,
          newAmountPaid
        )

        // Update the expense in the store (this will trigger balance recalculation)
        updatePaymentStatus(expense.id, newStatus, newAmountPaid)

        // Ensure balances are recalculated for consistency
        recalculateBalances()

        return {
          success: true,
          warnings: validation.warnings,
          balanceImpact: result.balanceImpact
        }
      } catch (error) {
        console.error('Failed to update payment status:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      }
    },
    [updatePaymentStatus, balances, processPaymentChange, validateComprehensivePaymentChange, recalculateBalances]
  )

  /**
   * Create a payment status change handler for a specific expense
   */
  const createPaymentHandler = React.useCallback(
    (expense: ExpenseEntry) => {
      return async (status: PaymentStatus, amount?: number) => {
        const result = await handlePaymentStatusChange(expense, status, amount)
        
        if (!result.success && result.error) {
          // You could integrate with a toast system here
          console.error('Payment update failed:', result.error)
          throw new Error(result.error)
        }
        
        if (result.warnings && result.warnings.length > 0) {
          // You could show warnings to the user here
          console.warn('Payment update warnings:', result.warnings)
        }
        
        // Return the result for further processing if needed
        return result
      }
    },
    [handlePaymentStatusChange]
  )

  /**
   * Get real-time validation for payment changes (for UI feedback)
   */
  const getPaymentValidation = React.useCallback(
    (expense: ExpenseEntry, newStatus: PaymentStatus, newAmountPaid?: number) => {
      return validateComprehensivePaymentChange(expense, newStatus, newAmountPaid, balances)
    },
    [validateComprehensivePaymentChange, balances]
  )

  /**
   * Get available payment transition options for an expense
   */
  const getTransitionOptions = React.useCallback(
    (expense: ExpenseEntry) => {
      return getPaymentTransitionOptions(expense)
    },
    [getPaymentTransitionOptions]
  )

  /**
   * Check if a payment change would be valid without applying it
   */
  const canChangePaymentStatus = React.useCallback(
    (expense: ExpenseEntry, newStatus: PaymentStatus, newAmountPaid?: number): boolean => {
      const validation = validateComprehensivePaymentChange(expense, newStatus, newAmountPaid, balances)
      return validation.isValid
    },
    [validateComprehensivePaymentChange, balances]
  )

  return {
    handlePaymentStatusChange,
    createPaymentHandler,
    getPaymentValidation,
    getTransitionOptions,
    canChangePaymentStatus,
    // Expose current state for components that need it
    currentBalances: balances,
    currentExpenses: expenses
  }
}

/**
 * Hook for creating a PaymentStatusSelector with integrated store updates
 */
export function usePaymentStatusSelector(expense: ExpenseEntry) {
  const { 
    createPaymentHandler, 
    getPaymentValidation, 
    getTransitionOptions,
    canChangePaymentStatus 
  } = usePaymentIntegration()
  
  const paymentHandler = React.useMemo(
    () => createPaymentHandler(expense),
    [createPaymentHandler, expense.id, expense.paymentStatus, expense.amountPaid]
  )

  // Real-time validation for UI feedback
  const validateChange = React.useCallback(
    (status: PaymentStatus, amount?: number) => {
      return getPaymentValidation(expense, status, amount)
    },
    [getPaymentValidation, expense]
  )

  // Check if a change is allowed
  const canChange = React.useCallback(
    (status: PaymentStatus, amount?: number) => {
      return canChangePaymentStatus(expense, status, amount)
    },
    [canChangePaymentStatus, expense]
  )

  return {
    onChange: paymentHandler,
    validateChange,
    canChange,
    getTransitionOptions: () => getTransitionOptions(expense),
    expense
  }
}