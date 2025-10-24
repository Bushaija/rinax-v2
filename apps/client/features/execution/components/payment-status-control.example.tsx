/**
 * Example usage of PaymentStatusControl component
 * 
 * This file demonstrates how to integrate the PaymentStatusControl
 * component into an expense form.
 */

"use client"

import * as React from "react"
import { PaymentStatusControl, PaymentStatus } from "./payment-status-control"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PaymentStatusControlExample() {
  const [expenseAmount, setExpenseAmount] = React.useState(12000)
  const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatus>("unpaid")
  const [amountPaid, setAmountPaid] = React.useState(0)

  const handlePaymentChange = (status: PaymentStatus, paid: number) => {
    setPaymentStatus(status)
    setAmountPaid(paid)
    console.log(`Payment status changed to ${status}, amount paid: ${paid}`)
  }

  return (
    <div className="space-y-4 p-6 max-w-md">
      <h2 className="text-lg font-semibold">Expense Payment Example</h2>
      
      <div className="space-y-2">
        <Label htmlFor="expense-amount">Expense Amount</Label>
        <Input
          id="expense-amount"
          type="number"
          value={expenseAmount}
          onChange={(e) => setExpenseAmount(Number(e.target.value))}
        />
      </div>

      <div className="space-y-2">
        <Label>Payment Status</Label>
        <div className="flex items-center gap-2">
          <PaymentStatusControl
            expenseCode="HIV_EXEC_HOSPITAL_B_B-01_1"
            amount={expenseAmount}
            paymentStatus={paymentStatus}
            amountPaid={amountPaid}
            onChange={handlePaymentChange}
          />
        </div>
      </div>

      <div className="rounded-md border p-4 space-y-2 bg-muted/50">
        <h3 className="font-medium text-sm">Current State</h3>
        <div className="text-sm space-y-1">
          <p>Status: <span className="font-mono">{paymentStatus}</span></p>
          <p>Amount Paid: <span className="font-mono">{amountPaid}</span></p>
          <p>Amount Unpaid: <span className="font-mono">{expenseAmount - amountPaid}</span></p>
        </div>
      </div>
    </div>
  )
}

/**
 * Integration example with expense form row
 */
export function ExpenseRowWithPaymentControl() {
  const [formData, setFormData] = React.useState({
    amount: 18000,
    paymentStatus: "unpaid" as PaymentStatus,
    amountPaid: 0
  })

  const updatePayment = (status: PaymentStatus, amountPaid: number) => {
    setFormData(prev => ({
      ...prev,
      paymentStatus: status,
      amountPaid
    }))
  }

  return (
    <div className="flex items-center gap-2 p-4 border rounded-md">
      <span className="flex-1 text-sm">Laboratory Technician Salary</span>
      
      <Input
        type="number"
        value={formData.amount}
        onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
        className="w-32"
      />
      
      <PaymentStatusControl
        expenseCode="HIV_EXEC_HOSPITAL_B_B-01_1"
        amount={formData.amount}
        paymentStatus={formData.paymentStatus}
        amountPaid={formData.amountPaid}
        onChange={updatePayment}
      />
    </div>
  )
}
