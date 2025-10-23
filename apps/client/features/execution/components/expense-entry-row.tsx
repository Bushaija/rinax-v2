/**
 * ExpenseEntryRow component with integrated payment controls
 * Requirements: 1.1, 2.1, 2.2
 */

"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Edit3, Save, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ExpenseEntry } from "../types/expense"
import { PaymentStatusSelector } from "./payment-status-selector"
import { usePaymentStatusSelector } from "../hooks/use-payment-integration"
import { ExpenseEntrySchema } from "../schemas/expense-validation"

interface ExpenseEntryRowProps {
  expense: ExpenseEntry
  onUpdate: (expense: ExpenseEntry) => void
  onDelete: (id: string) => void
  disabled?: boolean
  className?: string
}

export function ExpenseEntryRow({
  expense,
  onUpdate,
  onDelete,
  disabled = false,
  className
}: ExpenseEntryRowProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedAmount, setEditedAmount] = React.useState(expense.amount.toString())
  const [editedDescription, setEditedDescription] = React.useState(expense.description)
  const [validationErrors, setValidationErrors] = React.useState<string[]>([])
  const [isValidating, setIsValidating] = React.useState(false)

  // Get integrated payment handler with real-time validation
  const { onChange: handlePaymentChange } = usePaymentStatusSelector(expense)

  // Real-time validation for amount input
  const validateAmount = React.useCallback((value: string) => {
    const errors: string[] = []
    
    if (!value.trim()) {
      errors.push("Amount is required")
      return errors
    }
    
    const numericValue = parseFloat(value)
    
    if (isNaN(numericValue)) {
      errors.push("Amount must be a valid number")
    } else if (numericValue <= 0) {
      errors.push("Amount must be greater than 0")
    } else if (numericValue > 999999999) {
      errors.push("Amount is too large")
    }
    
    return errors
  }, [])

  // Real-time validation for description input
  const validateDescription = React.useCallback((value: string) => {
    const errors: string[] = []
    
    if (!value.trim()) {
      errors.push("Description is required")
    } else if (value.length > 500) {
      errors.push("Description must be less than 500 characters")
    }
    
    return errors
  }, [])

  // Handle amount change with real-time validation
  const handleAmountChange = (value: string) => {
    setEditedAmount(value)
    
    // Real-time validation
    const amountErrors = validateAmount(value)
    const descriptionErrors = validateDescription(editedDescription)
    setValidationErrors([...amountErrors, ...descriptionErrors])
  }

  // Handle description change with real-time validation
  const handleDescriptionChange = (value: string) => {
    setEditedDescription(value)
    
    // Real-time validation
    const amountErrors = validateAmount(editedAmount)
    const descriptionErrors = validateDescription(value)
    setValidationErrors([...amountErrors, ...descriptionErrors])
  }

  // Comprehensive validation before saving
  const validateExpenseEntry = (amount: number, description: string): string[] => {
    const errors: string[] = []
    
    try {
      // Create a test expense entry for validation
      const testExpense: ExpenseEntry = {
        ...expense,
        amount,
        description: description.trim(),
        dateModified: new Date()
      }
      
      // Validate using Zod schema
      const result = ExpenseEntrySchema.safeParse(testExpense)
      if (!result.success) {
        result.error.errors.forEach(err => {
          errors.push(err.message)
        })
      }
    } catch (error) {
      errors.push("Validation failed: " + (error instanceof Error ? error.message : "Unknown error"))
    }
    
    return errors
  }

  // Save changes with comprehensive validation
  const handleSave = async () => {
    setIsValidating(true)
    
    try {
      const numericAmount = parseFloat(editedAmount)
      const trimmedDescription = editedDescription.trim()
      
      // Comprehensive validation
      const errors = validateExpenseEntry(numericAmount, trimmedDescription)
      
      if (errors.length > 0) {
        setValidationErrors(errors)
        return
      }

      const updatedExpense: ExpenseEntry = {
        ...expense,
        amount: numericAmount,
        description: trimmedDescription,
        dateModified: new Date()
      }

      // Call the update handler
      onUpdate(updatedExpense)
      
      // Reset editing state
      setIsEditing(false)
      setValidationErrors([])
    } catch (error) {
      setValidationErrors([
        "Failed to save expense: " + (error instanceof Error ? error.message : "Unknown error")
      ])
    } finally {
      setIsValidating(false)
    }
  }

  // Cancel editing and reset form
  const handleCancel = () => {
    setEditedAmount(expense.amount.toString())
    setEditedDescription(expense.description)
    setValidationErrors([])
    setIsEditing(false)
  }

  // Handle delete with confirmation
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete this expense: "${expense.description}"?`)) {
      onDelete(expense.id)
    }
  }

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Check if form has valid data for saving
  const canSave = React.useMemo(() => {
    return validationErrors.length === 0 && 
           editedAmount.trim() !== '' && 
           editedDescription.trim() !== '' &&
           !isValidating
  }, [validationErrors, editedAmount, editedDescription, isValidating])

  return (
    <div className={cn(
      "flex flex-col gap-4 p-4 border rounded-lg bg-card transition-all duration-200",
      isEditing && "border-primary/50 shadow-sm",
      className
    )}>
      {/* Main Content Row */}
      <div className="flex items-start gap-4">
        {/* Expense Details */}
        <div className="flex-1 space-y-3">
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`description-${expense.id}`} className="text-sm font-medium">
                  Description
                </Label>
                <Input
                  id={`description-${expense.id}`}
                  value={editedDescription}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  disabled={disabled || isValidating}
                  placeholder="Enter expense description"
                  className={cn(
                    validationErrors.some(err => err.includes("Description")) && 
                    "border-destructive focus-visible:ring-destructive"
                  )}
                  aria-describedby={validationErrors.length > 0 ? `errors-${expense.id}` : undefined}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`amount-${expense.id}`} className="text-sm font-medium">
                  Amount
                </Label>
                <Input
                  id={`amount-${expense.id}`}
                  type="number"
                  value={editedAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={disabled || isValidating}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className={cn(
                    validationErrors.some(err => err.includes("Amount")) && 
                    "border-destructive focus-visible:ring-destructive"
                  )}
                  aria-describedby={validationErrors.length > 0 ? `errors-${expense.id}` : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <h4 className="font-medium text-foreground">{expense.description}</h4>
              <p className="text-sm text-muted-foreground">
                Amount: {formatCurrency(expense.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                Last modified: {expense.dateModified.toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Payment Status Selector */}
        <div className="flex-shrink-0">
          <PaymentStatusSelector
            expense={expense}
            onChange={handlePaymentChange}
            disabled={disabled || isEditing}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                size="sm"
                disabled={disabled || !canSave}
                className="min-w-[60px]"
              >
                {isValidating ? (
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    <span className="sr-only">Saving...</span>
                  </div>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </>
                )}
              </Button>
              <Button
                onClick={handleCancel}
                size="sm"
                variant="outline"
                disabled={disabled || isValidating}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
                disabled={disabled}
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                onClick={handleDelete}
                size="sm"
                variant="outline"
                disabled={disabled}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
                <span className="sr-only">Delete expense</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription id={`errors-${expense.id}`}>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}