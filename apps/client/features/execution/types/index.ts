/**
 * Export all expense-related types and interfaces
 * Requirements: 1.1, 1.2, 3.1, 4.2
 */

// Core types
export type {
  ExpenseEntry,
  PaymentStatus,
  FinancialBalances,
  PayableBreakdown,
  SyncStatus,
  ExpenseDataPayload,
  SyncResponse,
  ConflictResolution,
  ValidationError,
  AppError,
  NetworkError
} from './expense'

// Validation schemas and input types
export {
  PaymentStatusSchema,
  ExpenseEntrySchema,
  PayableBreakdownSchema,
  FinancialBalancesSchema,
  SyncStatusSchema,
  ExpenseDataPayloadSchema,
  ConflictResolutionSchema,
  ValidationErrorSchema,
  SyncResponseSchema,
  PartialExpenseEntrySchema,
  CreateExpenseEntrySchema,
  PaymentUpdateSchema
} from '../schemas/expense-validation'

export type {
  ExpenseEntryInput,
  CreateExpenseEntryInput,
  PartialExpenseEntryInput,
  PaymentUpdateInput,
  ExpenseDataPayloadInput,
  SyncResponseInput
} from '../schemas/expense-validation'