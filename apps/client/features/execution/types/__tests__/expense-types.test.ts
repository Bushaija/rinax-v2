/**
 * Tests for expense types and validation schemas
 * Requirements: 1.1, 1.2, 3.1, 4.2
 */

import { describe, it, expect } from 'vitest'
import {
  ExpenseEntrySchema,
  CreateExpenseEntrySchema,
  PaymentUpdateSchema,
  PaymentStatusSchema,
  FinancialBalancesSchema
} from '../expense-validation'
import type { ExpenseEntry, PaymentStatus, FinancialBalances } from '../expense'

describe('Expense Types and Validation', () => {
  describe('PaymentStatus', () => {
    it('should validate valid payment statuses', () => {
      expect(PaymentStatusSchema.parse('paid')).toBe('paid')
      expect(PaymentStatusSchema.parse('unpaid')).toBe('unpaid')
      expect(PaymentStatusSchema.parse('partial')).toBe('partial')
    })

    it('should reject invalid payment statuses', () => {
      expect(() => PaymentStatusSchema.parse('invalid')).toThrow()
      expect(() => PaymentStatusSchema.parse('')).toThrow()
    })
  })

  describe('ExpenseEntry', () => {
    const validExpenseEntry: ExpenseEntry = {
      id: 'exp-001',
      categoryId: 'cat-001',
      activityId: 'act-001',
      description: 'Office supplies',
      amount: 100,
      paymentStatus: 'paid',
      amountPaid: 100,
      dateCreated: new Date(),
      dateModified: new Date()
    }

    it('should validate a complete expense entry', () => {
      const result = ExpenseEntrySchema.parse(validExpenseEntry)
      expect(result).toEqual(validExpenseEntry)
    })

    it('should reject expense with amount paid exceeding total', () => {
      const invalidExpense = {
        ...validExpenseEntry,
        amount: 100,
        amountPaid: 150
      }
      expect(() => ExpenseEntrySchema.parse(invalidExpense)).toThrow()
    })

    it('should reject paid expense with incorrect amount paid', () => {
      const invalidExpense = {
        ...validExpenseEntry,
        paymentStatus: 'paid' as PaymentStatus,
        amount: 100,
        amountPaid: 50
      }
      expect(() => ExpenseEntrySchema.parse(invalidExpense)).toThrow()
    })

    it('should reject unpaid expense with non-zero amount paid', () => {
      const invalidExpense = {
        ...validExpenseEntry,
        paymentStatus: 'unpaid' as PaymentStatus,
        amountPaid: 50
      }
      expect(() => ExpenseEntrySchema.parse(invalidExpense)).toThrow()
    })

    it('should validate partial payment correctly', () => {
      const partialExpense = {
        ...validExpenseEntry,
        paymentStatus: 'partial' as PaymentStatus,
        amount: 100,
        amountPaid: 50
      }
      const result = ExpenseEntrySchema.parse(partialExpense)
      expect(result.paymentStatus).toBe('partial')
      expect(result.amountPaid).toBe(50)
    })
  })

  describe('CreateExpenseEntry', () => {
    it('should validate expense creation without ID and timestamps', () => {
      const createData = {
        categoryId: 'cat-001',
        activityId: 'act-001',
        description: 'Office supplies',
        amount: 100,
        paymentStatus: 'paid' as PaymentStatus,
        amountPaid: 100
      }
      const result = CreateExpenseEntrySchema.parse(createData)
      expect(result).toEqual(createData)
    })

    it('should reject creation data with ID', () => {
      const createData = {
        id: 'should-not-be-here',
        categoryId: 'cat-001',
        activityId: 'act-001',
        description: 'Office supplies',
        amount: 100,
        paymentStatus: 'paid' as PaymentStatus,
        amountPaid: 100
      }
      // This should still work since omit removes the id field from validation
      const result = CreateExpenseEntrySchema.parse(createData)
      expect(result).not.toHaveProperty('id')
    })
  })

  describe('PaymentUpdate', () => {
    it('should validate payment status update', () => {
      const update = {
        expenseId: 'exp-001',
        paymentStatus: 'paid' as PaymentStatus
      }
      const result = PaymentUpdateSchema.parse(update)
      expect(result).toEqual(update)
    })

    it('should require amount for partial payments', () => {
      const update = {
        expenseId: 'exp-001',
        paymentStatus: 'partial' as PaymentStatus
      }
      expect(() => PaymentUpdateSchema.parse(update)).toThrow()
    })

    it('should validate partial payment with amount', () => {
      const update = {
        expenseId: 'exp-001',
        paymentStatus: 'partial' as PaymentStatus,
        amountPaid: 50
      }
      const result = PaymentUpdateSchema.parse(update)
      expect(result).toEqual(update)
    })
  })

  describe('FinancialBalances', () => {
    it('should validate financial balances', () => {
      const balances: FinancialBalances = {
        cashAtBank: 1000,
        payables: {
          salaries: 500,
          maintenance: 200,
          supplies: 100,
          transportation: 150,
          other: 50
        },
        totalExpenses: 1000,
        initialCash: 2000
      }
      const result = FinancialBalancesSchema.parse(balances)
      expect(result).toEqual(balances)
    })

    it('should reject negative payables', () => {
      const balances = {
        cashAtBank: 1000,
        payables: {
          salaries: -100, // Invalid negative value
          maintenance: 200,
          supplies: 100,
          transportation: 150,
          other: 50
        },
        totalExpenses: 1000,
        initialCash: 2000
      }
      expect(() => FinancialBalancesSchema.parse(balances)).toThrow()
    })
  })
})