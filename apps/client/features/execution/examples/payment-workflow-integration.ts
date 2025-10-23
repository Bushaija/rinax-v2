/**
 * Example demonstrating payment workflow integration with expense store
 * Requirements: 2.4, 1.3, 1.4, 1.5
 */

import type { ExpenseEntry, PaymentStatus, FinancialBalances } from '../types/expense'
import { PaymentWorkflowManager, calculatePaymentPreview } from '../utils/payment-workflow'

/**
 * Example usage of payment workflow with real-time balance updates
 */
export class PaymentWorkflowIntegrationExample {
  private workflowManager: PaymentWorkflowManager
  private currentBalances: FinancialBalances
  private expenses: ExpenseEntry[]

  constructor(initialBalances: FinancialBalances, expenses: ExpenseEntry[] = []) {
    this.currentBalances = initialBalances
    this.expenses = expenses
    
    // Initialize workflow manager with balance update callback
    this.workflowManager = new PaymentWorkflowManager(
      undefined, // Use default category mapping
      this.handleBalanceUpdate.bind(this)
    )
  }

  /**
   * Handle real-time balance updates
   */
  private handleBalanceUpdate(updatedBalances: FinancialBalances) {
    console.log('Balance updated:', {
      cashAtBank: updatedBalances.cashAtBank,
      totalPayables: this.calculateTotalPayables(updatedBalances.payables)
    })
    
    // In a real application, this would trigger UI updates
    this.currentBalances = updatedBalances
  }

  /**
   * Process a payment status change with comprehensive validation
   */
  async processPaymentChange(
    expenseId: string,
    newStatus: PaymentStatus,
    newAmountPaid?: number
  ): Promise<{
    success: boolean
    error?: string
    warnings?: string[]
    balancePreview?: FinancialBalances
  }> {
    const expense = this.expenses.find(exp => exp.id === expenseId)
    if (!expense) {
      return { success: false, error: 'Expense not found' }
    }

    try {
      // Step 1: Comprehensive validation
      const validation = this.workflowManager.validateComprehensivePaymentChange(
        expense,
        newStatus,
        newAmountPaid,
        this.currentBalances
      )

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          warnings: validation.warnings
        }
      }

      // Step 2: Calculate balance preview
      const preview = calculatePaymentPreview(
        expense,
        newStatus,
        newAmountPaid,
        this.currentBalances
      )

      // Step 3: Process the payment change
      const result = this.workflowManager.processPaymentChange(
        expense,
        this.currentBalances,
        newStatus,
        newAmountPaid
      )

      // Step 4: Update local expense data (in real app, this would be in the store)
      const expenseIndex = this.expenses.findIndex(exp => exp.id === expenseId)
      if (expenseIndex !== -1) {
        this.expenses[expenseIndex] = result.updatedExpense
      }

      return {
        success: true,
        warnings: validation.warnings,
        balancePreview: preview.previewBalances
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get payment options for an expense
   */
  getPaymentOptions(expenseId: string) {
    const expense = this.expenses.find(exp => exp.id === expenseId)
    if (!expense) {
      throw new Error('Expense not found')
    }

    return {
      paymentOptions: this.workflowManager.getPaymentOptions(expense),
      transitionOptions: this.workflowManager.getPaymentTransitionOptions(expense),
      statusInfo: this.workflowManager.formatPaymentStatus(expense)
    }
  }

  /**
   * Validate a payment change without applying it (for real-time UI feedback)
   */
  validatePaymentChange(
    expenseId: string,
    newStatus: PaymentStatus,
    newAmountPaid?: number
  ) {
    const expense = this.expenses.find(exp => exp.id === expenseId)
    if (!expense) {
      return { isValid: false, errors: ['Expense not found'], warnings: [] }
    }

    return this.workflowManager.validateComprehensivePaymentChange(
      expense,
      newStatus,
      newAmountPaid,
      this.currentBalances
    )
  }

  /**
   * Get real-time balance preview for a payment change
   */
  getBalancePreview(
    expenseId: string,
    newStatus: PaymentStatus,
    newAmountPaid?: number
  ) {
    const expense = this.expenses.find(exp => exp.id === expenseId)
    if (!expense) {
      throw new Error('Expense not found')
    }

    return calculatePaymentPreview(
      expense,
      newStatus,
      newAmountPaid,
      this.currentBalances
    )
  }

  /**
   * Helper method to calculate total payables
   */
  private calculateTotalPayables(payables: FinancialBalances['payables']): number {
    return payables.salaries + payables.maintenance + payables.supplies + 
           payables.transportation + payables.other
  }

  /**
   * Get current state for debugging/monitoring
   */
  getCurrentState() {
    return {
      balances: this.currentBalances,
      expenses: this.expenses,
      totalExpenses: this.expenses.reduce((sum, exp) => sum + exp.amount, 0),
      totalPaid: this.expenses.reduce((sum, exp) => sum + exp.amountPaid, 0),
      totalPayables: this.calculateTotalPayables(this.currentBalances.payables)
    }
  }
}

/**
 * Example usage scenarios
 */
export function demonstratePaymentWorkflow() {
  // Initialize with sample data
  const initialBalances: FinancialBalances = {
    cashAtBank: 10000,
    payables: {
      salaries: 5000,
      maintenance: 1000,
      supplies: 500,
      transportation: 300,
      other: 200
    },
    totalExpenses: 15000,
    initialCash: 20000
  }

  const sampleExpenses: ExpenseEntry[] = [
    {
      id: 'exp-1',
      categoryId: 'salaries',
      activityId: 'act-1',
      description: 'Employee salaries',
      amount: 3000,
      paymentStatus: 'unpaid',
      amountPaid: 0,
      dateCreated: new Date(),
      dateModified: new Date()
    },
    {
      id: 'exp-2',
      categoryId: 'supplies',
      activityId: 'act-2',
      description: 'Office supplies',
      amount: 500,
      paymentStatus: 'partial',
      amountPaid: 200,
      dateCreated: new Date(),
      dateModified: new Date()
    }
  ]

  const integration = new PaymentWorkflowIntegrationExample(initialBalances, sampleExpenses)

  // Example 1: Mark expense as paid
  console.log('=== Example 1: Mark expense as paid ===')
  integration.processPaymentChange('exp-1', 'paid').then(result => {
    console.log('Payment result:', result)
    console.log('Current state:', integration.getCurrentState())
  })

  // Example 2: Make partial payment
  console.log('=== Example 2: Make partial payment ===')
  integration.processPaymentChange('exp-2', 'partial', 400).then(result => {
    console.log('Partial payment result:', result)
  })

  // Example 3: Get payment options
  console.log('=== Example 3: Get payment options ===')
  const options = integration.getPaymentOptions('exp-1')
  console.log('Payment options:', options)

  // Example 4: Real-time validation
  console.log('=== Example 4: Real-time validation ===')
  const validation = integration.validatePaymentChange('exp-1', 'partial', 1500)
  console.log('Validation result:', validation)

  // Example 5: Balance preview
  console.log('=== Example 5: Balance preview ===')
  const preview = integration.getBalancePreview('exp-1', 'paid')
  console.log('Balance preview:', preview)

  return integration
}

// The class is already exported above, no need to re-export