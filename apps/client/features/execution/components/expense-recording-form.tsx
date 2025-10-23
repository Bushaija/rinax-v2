/**
 * ExpenseRecordingForm container component
 * Requirements: 1.1, 1.2, 2.1, 2.2
 */

"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Plus, Save, RefreshCw, AlertCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { nanoid } from "nanoid"

import type { ExpenseEntry, PaymentStatus } from "../types/expense"
import { ExpenseEntryRow } from "./expense-entry-row"
import { BalanceDisplay } from "./balance-display"
import { useExpenseStore, useExpenseActions, useExpenseState } from "../stores/expense-store"
import { useBalanceDisplay } from "../hooks/use-balance-display"
import { CreateExpenseEntrySchema } from "../schemas/expense-validation"
import { createExpenseEntry } from "../utils/expense-helpers"

interface ExpenseRecordingFormProps {
  initialData?: ExpenseEntry[]
  onSave?: (data: ExpenseData) => Promise<void>
  onAutoSave?: (data: ExpenseData) => Promise<void>
  disabled?: boolean
  className?: string
}

interface ExpenseData {
  expenses: ExpenseEntry[]
  balances: {
    cashAtBank: number
    payables: {
      salaries: number
      maintenance: number
      supplies: number
      transportation: number
      other: number
    }
    totalExpenses: number
    initialCash: number
  }
  metadata: {
    lastModified: Date
    version: number
  }
}

interface NewExpenseFormData {
  categoryId: string
  activityId: string
  description: string
  amount: string
  paymentStatus: PaymentStatus
  amountPaid: string
}

const defaultNewExpense: NewExpenseFormData = {
  categoryId: '',
  activityId: '',
  description: '',
  amount: '',
  paymentStatus: 'unpaid',
  amountPaid: '0'
}

export function ExpenseRecordingForm({
  initialData,
  onSave,
  onAutoSave,
  disabled = false,
  className
}: ExpenseRecordingFormProps) {
  // Store state and actions
  const { expenses, balances, syncStatus } = useExpenseState()
  const {
    addExpense,
    updateExpense,
    deleteExpense,
    updatePaymentStatus,
    saveToServer,
    setInitialCash,
    recalculateBalances
  } = useExpenseActions()

  // Balance display hook for real-time updates
  const {
    currentBalances,
    previousBalances,
    isLoading: isBalanceLoading,
    hasChanges: hasBalanceChanges,
    enableAnimations
  } = useBalanceDisplay({
    enableAnimations: true,
    updateInterval: 150,
    enablePreviousBalanceTracking: true
  })

  // Local form state
  const [newExpenseForm, setNewExpenseForm] = React.useState<NewExpenseFormData>(defaultNewExpense)
  const [isAddingExpense, setIsAddingExpense] = React.useState(false)
  const [validationErrors, setValidationErrors] = React.useState<string[]>([])
  const [isSaving, setIsSaving] = React.useState(false)
  const [initialCashInput, setInitialCashInput] = React.useState(balances.initialCash.toString())

  // Initialize store with initial data
  React.useEffect(() => {
    if (initialData && initialData.length > 0) {
      // Set expenses directly in store
      const store = useExpenseStore.getState()
      store.setExpenses(initialData)
    }
  }, [initialData])

  // Auto-save functionality
  React.useEffect(() => {
    if (!onAutoSave || expenses.length === 0) return

    const autoSaveInterval = setInterval(() => {
      if (syncStatus.pendingChanges && !syncStatus.syncInProgress) {
        handleAutoSave()
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval)
  }, [onAutoSave, expenses, syncStatus])

  // Handle auto-save
  const handleAutoSave = React.useCallback(async () => {
    if (!onAutoSave) return

    try {
      const expenseData: ExpenseData = {
        expenses,
        balances,
        metadata: {
          lastModified: new Date(),
          version: 1
        }
      }

      await onAutoSave(expenseData)
      toast.success("Auto-saved", { duration: 1500 })
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [onAutoSave, expenses, balances])

  // Validate new expense form
  const validateNewExpenseForm = React.useCallback((formData: NewExpenseFormData): string[] => {
    const errors: string[] = []

    if (!formData.categoryId.trim()) {
      errors.push("Category ID is required")
    }

    if (!formData.activityId.trim()) {
      errors.push("Activity ID is required")
    }

    if (!formData.description.trim()) {
      errors.push("Description is required")
    } else if (formData.description.length > 500) {
      errors.push("Description must be less than 500 characters")
    }

    if (!formData.amount.trim()) {
      errors.push("Amount is required")
    } else {
      const numericAmount = parseFloat(formData.amount)
      if (isNaN(numericAmount) || numericAmount <= 0) {
        errors.push("Amount must be a positive number")
      } else if (numericAmount > 999999999) {
        errors.push("Amount is too large")
      }
    }

    if (formData.paymentStatus === 'partial') {
      if (!formData.amountPaid.trim()) {
        errors.push("Amount paid is required for partial payments")
      } else {
        const numericAmountPaid = parseFloat(formData.amountPaid)
        const numericAmount = parseFloat(formData.amount)
        
        if (isNaN(numericAmountPaid) || numericAmountPaid < 0) {
          errors.push("Amount paid must be a non-negative number")
        } else if (numericAmountPaid >= numericAmount) {
          errors.push("Amount paid must be less than total amount for partial payments")
        }
      }
    }

    return errors
  }, [])

  // Handle new expense form changes
  const handleNewExpenseChange = React.useCallback((field: keyof NewExpenseFormData, value: string) => {
    setNewExpenseForm(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-calculate amount paid based on payment status
      if (field === 'paymentStatus') {
        switch (value as PaymentStatus) {
          case 'paid':
            updated.amountPaid = updated.amount
            break
          case 'unpaid':
            updated.amountPaid = '0'
            break
          case 'partial':
            // Keep current amount paid, but ensure it's valid
            break
        }
      }

      // Real-time validation
      const errors = validateNewExpenseForm(updated)
      setValidationErrors(errors)

      return updated
    })
  }, [validateNewExpenseForm])

  // Handle adding new expense
  const handleAddExpense = React.useCallback(async () => {
    setIsAddingExpense(true)

    try {
      // Final validation
      const errors = validateNewExpenseForm(newExpenseForm)
      if (errors.length > 0) {
        setValidationErrors(errors)
        return
      }

      // Parse numeric values
      const amount = parseFloat(newExpenseForm.amount)
      const amountPaid = newExpenseForm.paymentStatus === 'paid' 
        ? amount 
        : newExpenseForm.paymentStatus === 'unpaid' 
          ? 0 
          : parseFloat(newExpenseForm.amountPaid)

      // Create expense entry data
      const expenseData = {
        categoryId: newExpenseForm.categoryId.trim(),
        activityId: newExpenseForm.activityId.trim(),
        description: newExpenseForm.description.trim(),
        amount,
        paymentStatus: newExpenseForm.paymentStatus,
        amountPaid
      }

      // Validate using schema
      const validatedData = createExpenseEntry(expenseData)

      // Add to store
      const expenseId = addExpense(validatedData)

      // Reset form
      setNewExpenseForm(defaultNewExpense)
      setValidationErrors([])

      toast.success("Expense added successfully", {
        description: `Added "${expenseData.description}" for ${amount.toLocaleString()}`
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setValidationErrors([errorMessage])
      toast.error("Failed to add expense", {
        description: errorMessage
      })
    } finally {
      setIsAddingExpense(false)
    }
  }, [newExpenseForm, validateNewExpenseForm, addExpense])

  // Handle expense update
  const handleExpenseUpdate = React.useCallback((updatedExpense: ExpenseEntry) => {
    try {
      updateExpense(updatedExpense.id, updatedExpense)
      toast.success("Expense updated successfully")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update expense"
      toast.error("Update failed", { description: errorMessage })
    }
  }, [updateExpense])

  // Handle expense deletion
  const handleExpenseDelete = React.useCallback((expenseId: string) => {
    try {
      deleteExpense(expenseId)
      toast.success("Expense deleted successfully")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete expense"
      toast.error("Delete failed", { description: errorMessage })
    }
  }, [deleteExpense])

  // Handle payment status change
  const handlePaymentStatusChange = React.useCallback((expenseId: string, status: PaymentStatus, amount?: number) => {
    try {
      updatePaymentStatus(expenseId, status, amount)
      toast.success("Payment status updated")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update payment status"
      toast.error("Update failed", { description: errorMessage })
    }
  }, [updatePaymentStatus])

  // Handle initial cash change
  const handleInitialCashChange = React.useCallback((value: string) => {
    setInitialCashInput(value)
    
    const numericValue = parseFloat(value)
    if (!isNaN(numericValue) && numericValue >= 0) {
      setInitialCash(numericValue)
    }
  }, [setInitialCash])

  // Handle save
  const handleSave = React.useCallback(async () => {
    if (!onSave) return

    setIsSaving(true)

    try {
      const expenseData: ExpenseData = {
        expenses,
        balances,
        metadata: {
          lastModified: new Date(),
          version: 1
        }
      }

      await onSave(expenseData)
      toast.success("Expenses saved successfully")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save expenses"
      toast.error("Save failed", { description: errorMessage })
    } finally {
      setIsSaving(false)
    }
  }, [onSave, expenses, balances])

  // Handle sync to server
  const handleSyncToServer = React.useCallback(async () => {
    try {
      await saveToServer()
    } catch (error) {
      // Error handling is done in the store
    }
  }, [saveToServer])

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Expense Recording</span>
            <div className="flex items-center gap-2">
              {syncStatus.syncInProgress && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
              {syncStatus.pendingChanges && (
                <span className="text-xs text-orange-600">Unsaved changes</span>
              )}
              {hasBalanceChanges && (
                <span className="text-xs text-green-600">Balance updated</span>
              )}
              {syncStatus.lastSync && (
                <span className="text-xs text-gray-500">
                  Last synced: {syncStatus.lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Initial Cash Setting */}
          <div className="mb-4">
            <Label htmlFor="initial-cash" className="text-sm font-medium">
              Initial Cash at Bank
            </Label>
            <Input
              id="initial-cash"
              type="number"
              value={initialCashInput}
              onChange={(e) => handleInitialCashChange(e.target.value)}
              disabled={disabled}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-48 mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Real-time Balance Display */}
      <BalanceDisplay
        balances={currentBalances}
        previousBalances={previousBalances}
        isLoading={isBalanceLoading}
        showAnimations={enableAnimations}
        showBreakdown={true}
      />

      {/* Add New Expense Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Expense
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category-id">Category ID</Label>
              <Input
                id="category-id"
                value={newExpenseForm.categoryId}
                onChange={(e) => handleNewExpenseChange('categoryId', e.target.value)}
                disabled={disabled || isAddingExpense}
                placeholder="e.g., salaries, maintenance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-id">Activity ID</Label>
              <Input
                id="activity-id"
                value={newExpenseForm.activityId}
                onChange={(e) => handleNewExpenseChange('activityId', e.target.value)}
                disabled={disabled || isAddingExpense}
                placeholder="e.g., staff-payment, equipment-repair"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newExpenseForm.description}
                onChange={(e) => handleNewExpenseChange('description', e.target.value)}
                disabled={disabled || isAddingExpense}
                placeholder="Enter expense description"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={newExpenseForm.amount}
                onChange={(e) => handleNewExpenseChange('amount', e.target.value)}
                disabled={disabled || isAddingExpense}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-status">Payment Status</Label>
              <select
                id="payment-status"
                value={newExpenseForm.paymentStatus}
                onChange={(e) => handleNewExpenseChange('paymentStatus', e.target.value)}
                disabled={disabled || isAddingExpense}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="partial">Partially Paid</option>
              </select>
            </div>

            {newExpenseForm.paymentStatus === 'partial' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="amount-paid">Amount Paid</Label>
                <Input
                  id="amount-paid"
                  type="number"
                  value={newExpenseForm.amountPaid}
                  onChange={(e) => handleNewExpenseChange('amountPaid', e.target.value)}
                  disabled={disabled || isAddingExpense}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Add Button */}
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleAddExpense}
              disabled={disabled || isAddingExpense || validationErrors.length > 0}
              className="min-w-[120px]"
            >
              {isAddingExpense ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Expense Entries ({expenses.length})</span>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSyncToServer}
                variant="outline"
                size="sm"
                disabled={disabled || syncStatus.syncInProgress || !syncStatus.pendingChanges}
              >
                {syncStatus.syncInProgress ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync to Server
                  </>
                )}
              </Button>
              {onSave && (
                <Button
                  onClick={handleSave}
                  disabled={disabled || isSaving}
                  className="min-w-[100px]"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No expenses recorded yet.</p>
              <p className="text-sm">Add your first expense using the form above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <ExpenseEntryRow
                  key={expense.id}
                  expense={expense}
                  onUpdate={handleExpenseUpdate}
                  onDelete={handleExpenseDelete}
                  disabled={disabled}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}