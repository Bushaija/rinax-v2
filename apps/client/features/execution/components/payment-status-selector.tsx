"use client"

import * as React from "react"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ExpenseEntry, PaymentStatus } from "../types/expense"
import { usePaymentWorkflow } from "../utils/payment-workflow"
import { usePaymentIntegration } from "../hooks/use-payment-integration"

interface PaymentStatusSelectorProps {
  expense: ExpenseEntry
  onChange: (status: PaymentStatus, amount?: number) => void
  disabled?: boolean
  className?: string
}

export function PaymentStatusSelector({
  expense,
  onChange,
  disabled = false,
  className
}: PaymentStatusSelectorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)
  const [partialAmount, setPartialAmount] = React.useState<string>(
    expense.paymentStatus === 'partial' ? expense.amountPaid.toString() : ''
  )
  const [inputError, setInputError] = React.useState<string>('')
  const [validationWarnings, setValidationWarnings] = React.useState<string[]>([])

  // Get payment integration utilities with real-time validation
  const {
    getPaymentValidation,
    getTransitionOptions,
    canChangePaymentStatus
  } = usePaymentIntegration()
  
  // Get payment workflow utilities
  const {
    getPaymentOptions,
    formatPaymentStatus
  } = usePaymentWorkflow()

  // Get payment options for this expense
  const paymentOptions = getPaymentOptions(expense)
  const statusInfo = formatPaymentStatus(expense)

  // Determine if the expense is paid (either fully paid or partial)
  const isPaid = expense.paymentStatus === 'paid' || expense.paymentStatus === 'partial'

  // Handle switch toggle between paid/unpaid states
  const handleSwitchChange = (checked: boolean) => {
    if (disabled) return

    if (checked) {
      // Switching to paid - open popover for payment details
      setIsPopoverOpen(true)
    } else {
      // Switching to unpaid - validate first using comprehensive validation
      const validation = getPaymentValidation(expense, 'unpaid')
      if (validation.isValid) {
        onChange('unpaid')
        setPartialAmount('')
        setInputError('')
        setValidationWarnings([])
        setIsPopoverOpen(false)
      } else {
        setInputError(validation.errors.join(', '))
        if (validation.warnings.length > 0) {
          setValidationWarnings(validation.warnings)
        }
      }
    }
  }

  // Handle full payment selection
  const handleFullPayment = () => {
    const validation = getPaymentValidation(expense, 'paid', expense.amount)
    
    if (validation.isValid) {
      onChange('paid', expense.amount)
      setPartialAmount('')
      setInputError('')
      setValidationWarnings(validation.warnings)
      setIsPopoverOpen(false)
    } else {
      setInputError(validation.errors.join(', '))
      if (validation.warnings.length > 0) {
        setValidationWarnings(validation.warnings)
      }
    }
  }

  // Handle partial payment input change with real-time validation
  const handlePartialAmountChange = (value: string) => {
    setPartialAmount(value)
    setInputError('')
    setValidationWarnings([])

    if (!value) return

    const numericValue = parseFloat(value)
    
    // Basic validation
    if (isNaN(numericValue) || numericValue <= 0) {
      setInputError('Amount must be a positive number')
      return
    }

    if (numericValue > expense.amount) {
      setInputError('Amount cannot exceed total expense')
      return
    }

    // Use comprehensive validation for real-time feedback
    const validation = getPaymentValidation(expense, 'partial', numericValue)
    if (!validation.isValid) {
      setInputError(validation.errors.join(', '))
    } else if (validation.warnings.length > 0) {
      setValidationWarnings(validation.warnings)
    }
  }

  // Handle partial payment confirmation
  const handlePartialPayment = () => {
    const numericAmount = parseFloat(partialAmount)
    
    // Final validation before applying using comprehensive validation
    const validation = getPaymentValidation(expense, 'partial', numericAmount)
    
    if (validation.isValid) {
      onChange('partial', numericAmount)
      setInputError('')
      setValidationWarnings([])
      setIsPopoverOpen(false)
    } else {
      setInputError(validation.errors.join(', '))
      if (validation.warnings.length > 0) {
        setValidationWarnings(validation.warnings)
      }
    }
  }

  // Handle popover close
  const handlePopoverClose = () => {
    setIsPopoverOpen(false)
    // Reset partial amount if no valid payment was made
    if (expense.paymentStatus === 'unpaid') {
      setPartialAmount('')
    }
    setInputError('')
    setValidationWarnings([])
  }

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      {/* Payment Status Display */}
      <div className="flex items-center space-x-2">
        <Label htmlFor={`payment-switch-${expense.id}`} className="text-sm font-medium">
          <span className={cn(
            "inline-flex items-center gap-1",
            statusInfo.color === 'success' && "text-green-600",
            statusInfo.color === 'warning' && "text-yellow-600", 
            statusInfo.color === 'destructive' && "text-red-600"
          )}>
            {statusInfo.label}
          </span>
        </Label>
        
        {/* Payment amount display for partial payments */}
        {expense.paymentStatus === 'partial' && (
          <span className="text-xs text-muted-foreground">
            ({formatCurrency(expense.amountPaid)} of {formatCurrency(expense.amount)})
          </span>
        )}
      </div>

      {/* Payment Status Switch with Popover */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center">
            <Switch
              id={`payment-switch-${expense.id}`}
              checked={isPaid}
              onCheckedChange={handleSwitchChange}
              disabled={disabled}
              aria-label={`Toggle payment status for expense ${expense.description}`}
            />
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-80" align="start" onInteractOutside={handlePopoverClose}>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Payment Details</h4>
              <p className="text-sm text-muted-foreground">
                Total expense: {formatCurrency(expense.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                Current status: {statusInfo.description}
              </p>
            </div>
            
            <div className="space-y-3">
              {/* Full Payment Option */}
              <Button
                onClick={handleFullPayment}
                className="w-full justify-start"
                variant="outline"
                disabled={disabled || !paymentOptions.canMarkPaid}
              >
                Pay Full Amount ({formatCurrency(expense.amount)})
              </Button>
              
              {/* Partial Payment Option */}
              <div className="space-y-2">
                <Label htmlFor={`partial-amount-${expense.id}`} className="text-sm">
                  Partial Payment
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id={`partial-amount-${expense.id}`}
                    type="number"
                    placeholder="Enter amount"
                    value={partialAmount}
                    onChange={(e) => handlePartialAmountChange(e.target.value)}
                    disabled={disabled || !paymentOptions.canMarkPartial}
                    min="0"
                    max={paymentOptions.maxPartialAmount}
                    step="0.01"
                    className={cn(
                      "flex-1",
                      inputError && "border-destructive focus-visible:ring-destructive"
                    )}
                    aria-describedby={inputError ? `error-${expense.id}` : undefined}
                  />
                  <Button
                    onClick={handlePartialPayment}
                    disabled={disabled || !partialAmount || !!inputError}
                    size="sm"
                  >
                    Apply
                  </Button>
                </div>
                
                {/* Error Messages */}
                {inputError && (
                  <p 
                    id={`error-${expense.id}`}
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {inputError}
                  </p>
                )}
                
                {/* Warning Messages */}
                {validationWarnings.length > 0 && (
                  <div className="space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <p 
                        key={index}
                        className="text-xs text-yellow-600"
                        role="alert"
                      >
                        ⚠️ {warning}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}