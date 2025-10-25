"use client"

import * as React from "react"
import { Check, X, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export type PaymentStatus = "paid" | "unpaid" | "partial"

export interface PaymentStatusControlProps {
  expenseCode: string
  amount: number
  paymentStatus: PaymentStatus
  amountPaid: number
  onChange: (status: PaymentStatus, amountPaid: number) => void
  disabled?: boolean
}

export function PaymentStatusControl({
  expenseCode,
  amount,
  paymentStatus,
  amountPaid,
  onChange,
  disabled = false
}: PaymentStatusControlProps) {
  const [open, setOpen] = React.useState(false)
  const [partialAmount, setPartialAmount] = React.useState(amountPaid.toString())
  const [error, setError] = React.useState<string | null>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const fullyPaidButtonRef = React.useRef<HTMLButtonElement>(null)
  const unpaidButtonRef = React.useRef<HTMLButtonElement>(null)
  const partialInputRef = React.useRef<HTMLInputElement>(null)
  const applyButtonRef = React.useRef<HTMLButtonElement>(null)

  // Debug: Log props received
  React.useEffect(() => {
    console.log('🔍 [PaymentStatusControl] Props received:', {
      expenseCode,
      amount,
      paymentStatus,
      amountPaid,
    });
  }, [expenseCode, amount, paymentStatus, amountPaid]);

  // Update partial amount when amountPaid changes externally
  React.useEffect(() => {
    console.log('🔄 [PaymentStatusControl] Updating partialAmount state:', {
      expenseCode,
      amountPaid,
      amountPaidString: amountPaid.toString(),
    });
    setPartialAmount(amountPaid.toString())
  }, [amountPaid, expenseCode])

  // Focus management: focus first button when popover opens
  React.useEffect(() => {
    if (open) {
      console.log('📂 [PaymentStatusControl] Popover opened:', {
        expenseCode,
        paymentStatus,
        amountPaid,
        partialAmount,
        partialAmountType: typeof partialAmount,
      });
      if (fullyPaidButtonRef.current) {
        fullyPaidButtonRef.current.focus()
      }
    }
  }, [open])

  const handleFullyPaid = () => {
    onChange("paid", amount)
    setError(null)
    setOpen(false)
    // Return focus to trigger after closing
    setTimeout(() => triggerRef.current?.focus(), 0)
  }

  const handleUnpaid = () => {
    onChange("unpaid", 0)
    setError(null)
    setOpen(false)
    // Return focus to trigger after closing
    setTimeout(() => triggerRef.current?.focus(), 0)
  }

  const handlePartialPayment = () => {
    const parsedAmount = parseFloat(partialAmount)
    
    // Validation
    if (isNaN(parsedAmount)) {
      setError("Please enter a valid amount")
      return
    }
    
    if (parsedAmount <= 0) {
      setError("Paid amount must be greater than 0")
      return
    }
    
    if (parsedAmount > amount) {
      setError("Paid amount cannot exceed total expense")
      return
    }
    
    onChange("partial", parsedAmount)
    setError(null)
    setOpen(false)
    // Return focus to trigger after closing
    setTimeout(() => triggerRef.current?.focus(), 0)
  }

  // Keyboard navigation handler for popover content
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false)
      setTimeout(() => triggerRef.current?.focus(), 0)
      return
    }

    // Arrow key navigation between buttons
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const focusableElements = [
        fullyPaidButtonRef.current,
        unpaidButtonRef.current,
        partialInputRef.current,
        applyButtonRef.current,
      ].filter(Boolean) as HTMLElement[]

      const currentIndex = focusableElements.findIndex(
        (el) => el === document.activeElement
      )

      if (currentIndex === -1) {
        focusableElements[0]?.focus()
        return
      }

      if (e.key === "ArrowDown") {
        const nextIndex = (currentIndex + 1) % focusableElements.length
        focusableElements[nextIndex]?.focus()
      } else {
        const prevIndex =
          currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1
        focusableElements[prevIndex]?.focus()
      }
    }
  }

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "paid":
        return <Check className="size-4 text-green-600" aria-hidden="true" />
      case "unpaid":
        return <X className="size-4 text-red-600" aria-hidden="true" />
      case "partial":
        return <Minus className="size-4 text-orange-600" aria-hidden="true" />
    }
  }

  const getStatusColor = () => {
    switch (paymentStatus) {
      case "paid":
        return "text-green-600 bg-green-50"
      case "unpaid":
        return "text-red-600 bg-red-50"
      case "partial":
        return "text-orange-600 bg-orange-50"
    }
  }

  const getStatusLabel = () => {
    switch (paymentStatus) {
      case "paid":
        return "Fully paid"
      case "unpaid":
        return "Not paid"
      case "partial":
        return `Partially paid: ${amountPaid} of ${amount}`
    }
  }

  const getStatusTooltip = () => {
    switch (paymentStatus) {
      case "paid":
        return `This expense is fully paid (${amount})`
      case "unpaid":
        return `This expense is not paid yet (${amount} outstanding)`
      case "partial":
        return `This expense is partially paid (${amountPaid} paid, ${amount - amountPaid} outstanding)`
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <Popover open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:pointer-events-none disabled:opacity-50",
                  getStatusColor()
                )}
                aria-label={`Payment status for ${expenseCode}: ${getStatusLabel()}. Press Enter or Space to change payment status.`}
                aria-describedby={`${expenseCode}-payment-description`}
                aria-expanded={open}
                aria-haspopup="dialog"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setOpen(!open)
                  }
                }}
              >
                {getStatusIcon()}
                <Switch
                  checked={paymentStatus === "paid"}
                  disabled={disabled}
                  className="pointer-events-none"
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{getStatusTooltip()}</p>
          </TooltipContent>
      
          <PopoverContent 
            className="w-80" 
            align="start"
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-label="Payment status options"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm" id={`${expenseCode}-dialog-title`}>
                  Payment Status
                </h4>
                <p className="text-xs text-muted-foreground" id={`${expenseCode}-dialog-description`}>
                  Select how this expense has been paid. Use arrow keys to navigate options.
                </p>
              </div>

              <div className="space-y-2" role="group" aria-labelledby={`${expenseCode}-dialog-title`}>
                <Button
                  ref={fullyPaidButtonRef}
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleFullyPaid}
                  aria-label={`Mark as fully paid. Total amount: ${amount}`}
                >
                  <Check className="size-4 text-green-600" aria-hidden="true" />
                  Fully Paid
                </Button>

                <Button
                  ref={unpaidButtonRef}
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleUnpaid}
                  aria-label={`Mark as unpaid. Total amount: ${amount}`}
                >
                  <X className="size-4 text-red-600" aria-hidden="true" />
                  Unpaid
                </Button>

                <div className="space-y-2 rounded-md border p-3" role="group" aria-labelledby={`partial-label-${expenseCode}`}>
                  <div className="flex items-center gap-2">
                    <Minus className="size-4 text-orange-600" aria-hidden="true" />
                    <Label 
                      id={`partial-label-${expenseCode}`}
                      htmlFor={`partial-${expenseCode}`} 
                      className="text-sm font-medium"
                    >
                      Partially Paid
                    </Label>
                  </div>
                  
                  <div className="space-y-1">
                    <Input
                      ref={partialInputRef}
                      id={`partial-${expenseCode}`}
                      type="number"
                      placeholder="Enter paid amount"
                      value={partialAmount}
                      onChange={(e) => {
                        setPartialAmount(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handlePartialPayment()
                        }
                      }}
                      className={cn(error && "border-destructive")}
                      aria-invalid={!!error}
                      aria-describedby={error ? `${expenseCode}-error ${expenseCode}-total-hint` : `${expenseCode}-total-hint`}
                      aria-label={`Enter partial payment amount. Total expense is ${amount}`}
                    />
                    
                    {error && (
                      <p
                        id={`${expenseCode}-error`}
                        className="text-xs text-destructive"
                        role="alert"
                        aria-live="polite"
                      >
                        {error}
                      </p>
                    )}
                    
                    <p id={`${expenseCode}-total-hint`} className="text-xs text-muted-foreground">
                      Total expense: {amount}
                    </p>
                  </div>

                  <Button
                    ref={applyButtonRef}
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={handlePartialPayment}
                    aria-label="Apply partial payment amount"
                  >
                    Apply Partial Payment
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <span id={`${expenseCode}-payment-description`} className="sr-only">
          {getStatusLabel()}
        </span>
      </Tooltip>
    </TooltipProvider>
  )
}
