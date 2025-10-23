/**
 * Tests for payment workflow logic
 * Requirements: 2.4, 1.3, 1.4, 1.5
 */

import { describe, it, expect } from 'vitest'
import type { ExpenseEntry, PaymentStatus, FinancialBalances } from '../../types/expense'
import { 
  validatePaymentStatusChange, 
  processPaymentStatusChange,
  PaymentWorkflowManager,
  calculatePaymentPreview
} from '../payment-workflow'

// Mock expense data for testing
const mockExpense: ExpenseEntry = {
  id: 'test-expense-1',
  categoryId: 'salaries',
  activityId: 'activity-1',
  description: 'Test expense for payment workflow',
  amount: 1000,
  paymentStatus: 'unpaid',
  amountPaid: 0,
  dateCreated: new Date('2024-01-01'),
  dateModified: new Date('2024-01-01')
}

const mockBalances: FinancialBalances = {
  cashAtBank: 5000,
  payables: {
    salaries: 2000,
    maintenance: 500,
    supplies: 300,
    transportation: 200,
    other: 100
  },
  totalExpenses: 8000,
  initialCash: 10000
}

describe('Payment Workflow Logic', () => {
  describe('validatePaymentStatusChange', () => {
    it('should validate paid status correctly', () => {
      const result = validatePaymentStatusChange(mockExpense, 'paid', 1000)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate unpaid status correctly', () => {
      const result = validatePaymentStatusChange(mockExpense, 'unpaid', 0)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate partial payment correctly', () => {
      const result = validatePaymentStatusChange(mockExpense, 'partial', 500)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject partial payment exceeding total amount', () => {
      const result = validatePaymentStatusChange(mockExpense, 'partial', 1500)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Payment amount cannot exceed total expense amount')
    })

    it('should reject partial payment of zero', () => {
      const result = validatePaymentStatusChange(mockExpense, 'partial', 0)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject partial payment equal to total amount', () => {
      const result = validatePaymentStatusChange(mockExpense, 'partial', 1000)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('processPaymentStatusChange', () => {
    it('should process payment status change correctly', () => {
      const context = {
        expense: mockExpense,
        currentBalances: mockBalances
      }

      const result = processPaymentStatusChange(context, 'paid', 1000)
      
      expect(result.updatedExpense.paymentStatus).toBe('paid')
      expect(result.updatedExpense.amountPaid).toBe(1000)
      expect(result.balanceImpact.cashAtBankChange).toBe(-1000)
      expect(result.validation.isValid).toBe(true)
    })

    it('should handle partial payment correctly', () => {
      const context = {
        expense: mockExpense,
        currentBalances: mockBalances
      }

      const result = processPaymentStatusChange(context, 'partial', 600)
      
      expect(result.updatedExpense.paymentStatus).toBe('partial')
      expect(result.updatedExpense.amountPaid).toBe(600)
      expect(result.balanceImpact.cashAtBankChange).toBe(-600)
      expect(result.balanceImpact.payablesChange).toBe(400) // 1000 - 600 = 400 remaining
    })
  })

  describe('PaymentWorkflowManager', () => {
    it('should get payment options correctly', () => {
      const manager = new PaymentWorkflowManager()
      const options = manager.getPaymentOptions(mockExpense)
      
      expect(options.canMarkPaid).toBe(true)
      expect(options.canMarkUnpaid).toBe(false) // Already unpaid
      expect(options.canMarkPartial).toBe(true)
      expect(options.maxPartialAmount).toBe(1000)
      expect(options.currentStatus).toBe('unpaid')
    })

    it('should format payment status correctly', () => {
      const manager = new PaymentWorkflowManager()
      
      const unpaidFormat = manager.formatPaymentStatus(mockExpense)
      expect(unpaidFormat.label).toBe('Unpaid')
      expect(unpaidFormat.color).toBe('destructive')
      
      const paidExpense = { ...mockExpense, paymentStatus: 'paid' as PaymentStatus, amountPaid: 1000 }
      const paidFormat = manager.formatPaymentStatus(paidExpense)
      expect(paidFormat.label).toBe('Paid')
      expect(paidFormat.color).toBe('success')
    })

    it('should validate comprehensive payment changes', () => {
      const manager = new PaymentWorkflowManager()
      
      // Test with balance context
      const result = manager.validateComprehensivePaymentChange(
        mockExpense, 
        'paid', 
        1000, 
        mockBalances
      )
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThanOrEqual(0)
    })

    it('should get payment transition options', () => {
      const manager = new PaymentWorkflowManager()
      const options = manager.getPaymentTransitionOptions(mockExpense)
      
      expect(options.availableTransitions).toContain('unpaid') // Current status
      expect(options.availableTransitions).toContain('paid')
      expect(options.availableTransitions).toContain('partial')
      expect(options.recommendedAction).toBeDefined()
    })
  })

  describe('calculatePaymentPreview', () => {
    it('should calculate payment preview correctly', () => {
      const preview = calculatePaymentPreview(
        mockExpense,
        'paid',
        1000,
        mockBalances
      )
      
      expect(preview.previewBalances.cashAtBank).toBe(4000) // 5000 - 1000
      expect(preview.changes.cashAtBankChange).toBe(-1000)
      expect(preview.changes.payablesChange).toBe(-1000) // Reduces payables
    })

    it('should handle partial payment preview', () => {
      const preview = calculatePaymentPreview(
        mockExpense,
        'partial',
        600,
        mockBalances
      )
      
      expect(preview.previewBalances.cashAtBank).toBe(4400) // 5000 - 600
      expect(preview.changes.cashAtBankChange).toBe(-600)
      expect(preview.changes.payablesChange).toBe(400) // 1000 - 600 = 400 remaining
    })
  })
})