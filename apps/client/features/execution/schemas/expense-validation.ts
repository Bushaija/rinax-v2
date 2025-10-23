/**
 * Zod validation schemas for expense recording feature
 * Requirements: 1.1, 1.2, 3.1, 4.2
 */

import { z } from 'zod'

// Payment status validation
export const PaymentStatusSchema = z.enum(['paid', 'unpaid', 'partial'], {
  errorMap: () => ({ message: 'Payment status must be paid, unpaid, or partial' })
})

// Base expense entry object schema (without refinements)
const BaseExpenseEntrySchema = z.object({
  id: z.string().min(1, 'Expense ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  activityId: z.string().min(1, 'Activity ID is required'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  amount: z.number().positive('Amount must be positive').max(999999999, 'Amount is too large'),
  paymentStatus: PaymentStatusSchema,
  amountPaid: z.number().min(0, 'Amount paid cannot be negative').max(999999999, 'Amount paid is too large'),
  dateCreated: z.date(),
  dateModified: z.date()
})

// Expense entry validation schema with refinements
export const ExpenseEntrySchema = BaseExpenseEntrySchema.refine((data) => {
  // Validate that amountPaid doesn't exceed total amount
  return data.amountPaid <= data.amount
}, {
  message: 'Amount paid cannot exceed total expense amount',
  path: ['amountPaid']
}).refine((data) => {
  // Validate payment status consistency
  if (data.paymentStatus === 'paid' && data.amountPaid !== data.amount) {
    return false
  }
  if (data.paymentStatus === 'unpaid' && data.amountPaid !== 0) {
    return false
  }
  if (data.paymentStatus === 'partial' && (data.amountPaid === 0 || data.amountPaid === data.amount)) {
    return false
  }
  return true
}, {
  message: 'Payment status must match the amount paid',
  path: ['paymentStatus']
})

// Payable breakdown validation
export const PayableBreakdownSchema = z.object({
  salaries: z.number().min(0, 'Salaries payable cannot be negative'),
  maintenance: z.number().min(0, 'Maintenance payable cannot be negative'),
  supplies: z.number().min(0, 'Supplies payable cannot be negative'),
  transportation: z.number().min(0, 'Transportation payable cannot be negative'),
  other: z.number().min(0, 'Other payables cannot be negative')
})

// Financial balances validation
export const FinancialBalancesSchema = z.object({
  cashAtBank: z.number(),
  payables: PayableBreakdownSchema,
  totalExpenses: z.number().min(0, 'Total expenses cannot be negative'),
  initialCash: z.number()
})

// Sync status validation
export const SyncStatusSchema = z.object({
  isOnline: z.boolean(),
  lastSync: z.date().nullable(),
  pendingChanges: z.boolean(),
  syncInProgress: z.boolean()
})

// Expense data payload validation
export const ExpenseDataPayloadSchema = z.object({
  expenses: z.array(ExpenseEntrySchema),
  balances: FinancialBalancesSchema,
  metadata: z.object({
    lastModified: z.date(),
    version: z.number().int().positive()
  })
})

// Conflict resolution validation
export const ConflictResolutionSchema = z.object({
  expenseId: z.string().min(1),
  field: z.string().min(1),
  localValue: z.any(),
  serverValue: z.any(),
  resolution: z.enum(['server', 'local'])
})

// Validation error schema
export const ValidationErrorSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
  code: z.string().min(1)
})

// Sync response validation
export const SyncResponseSchema = z.object({
  success: z.boolean(),
  data: ExpenseDataPayloadSchema.optional(),
  conflicts: z.array(ConflictResolutionSchema).optional(),
  errors: z.array(ValidationErrorSchema).optional()
})

// Partial expense entry for updates (using base schema)
export const PartialExpenseEntrySchema = BaseExpenseEntrySchema.partial().extend({
  id: z.string().min(1, 'Expense ID is required') // ID is always required for updates
})

// Create expense entry schema (without ID and timestamps)
export const CreateExpenseEntrySchema = BaseExpenseEntrySchema.omit({
  id: true,
  dateCreated: true,
  dateModified: true
})

// Payment update schema for payment status changes
export const PaymentUpdateSchema = z.object({
  expenseId: z.string().min(1, 'Expense ID is required'),
  paymentStatus: PaymentStatusSchema,
  amountPaid: z.number().min(0, 'Amount paid cannot be negative').optional()
}).refine((data) => {
  // Require amountPaid for partial payments
  if (data.paymentStatus === 'partial' && data.amountPaid === undefined) {
    return false
  }
  return true
}, {
  message: 'Amount paid is required for partial payments',
  path: ['amountPaid']
})

// Export type inference helpers
export type ExpenseEntryInput = z.infer<typeof ExpenseEntrySchema>
export type CreateExpenseEntryInput = z.infer<typeof CreateExpenseEntrySchema>
export type PartialExpenseEntryInput = z.infer<typeof PartialExpenseEntrySchema>
export type PaymentUpdateInput = z.infer<typeof PaymentUpdateSchema>
export type ExpenseDataPayloadInput = z.infer<typeof ExpenseDataPayloadSchema>
export type SyncResponseInput = z.infer<typeof SyncResponseSchema>