/**
 * Example usage of ExpenseRecordingForm component
 * This demonstrates how to integrate the expense recording interface
 */

"use client"

import * as React from "react"
import { ExpenseRecordingForm } from "../components/expense-recording-form"
import type { ExpenseEntry } from "../types/expense"

// Example usage in a page or parent component
export function ExpenseRecordingPage() {
  // Example initial data (could come from API)
  const initialExpenses: ExpenseEntry[] = [
    {
      id: "1",
      categoryId: "salaries",
      activityId: "staff-payment",
      description: "Monthly staff salaries",
      amount: 5000,
      paymentStatus: "paid",
      amountPaid: 5000,
      dateCreated: new Date("2024-01-01"),
      dateModified: new Date("2024-01-01")
    },
    {
      id: "2", 
      categoryId: "maintenance",
      activityId: "equipment-repair",
      description: "Medical equipment maintenance",
      amount: 1200,
      paymentStatus: "partial",
      amountPaid: 600,
      dateCreated: new Date("2024-01-02"),
      dateModified: new Date("2024-01-02")
    },
    {
      id: "3",
      categoryId: "supplies",
      activityId: "medical-supplies",
      description: "Medical supplies procurement",
      amount: 2500,
      paymentStatus: "unpaid",
      amountPaid: 0,
      dateCreated: new Date("2024-01-03"),
      dateModified: new Date("2024-01-03")
    }
  ]

  // Handle save to backend
  const handleSave = async (data: any) => {
    try {
      console.log("Saving expense data:", data)
      
      // Example API call
      // const response = await fetch('/api/expenses', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // })
      
      // if (!response.ok) {
      //   throw new Error('Failed to save expenses')
      // }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log("Expenses saved successfully")
    } catch (error) {
      console.error("Failed to save expenses:", error)
      throw error
    }
  }

  // Handle auto-save
  const handleAutoSave = async (data: any) => {
    try {
      console.log("Auto-saving expense data:", data)
      
      // Example auto-save API call (could be different endpoint)
      // await fetch('/api/expenses/draft', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // })
      
      console.log("Auto-save completed")
    } catch (error) {
      console.error("Auto-save failed:", error)
      // Don't throw error for auto-save failures
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Expense Recording</h1>
        <p className="text-gray-600">
          Record and manage expenses with real-time balance calculations and visual indicators
        </p>
      </div>

      <ExpenseRecordingForm
        initialData={initialExpenses}
        onSave={handleSave}
        onAutoSave={handleAutoSave}
        disabled={false}
      />
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Features Demonstrated:</h2>
        <ul className="text-sm space-y-1 text-blue-800">
          <li>• Real-time balance calculations with visual change indicators</li>
          <li>• Comprehensive payables breakdown by category</li>
          <li>• Financial health status with color-coded alerts</li>
          <li>• Smooth animations for balance changes</li>
          <li>• Auto-save functionality with sync status</li>
          <li>• Integrated payment status controls</li>
        </ul>
      </div>
    </div>
  )
}

// Example integration with existing execution module
export function ExecutionModuleWithExpenses() {
  const [activeTab, setActiveTab] = React.useState<'financial' | 'expenses'>('financial')

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('financial')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'financial'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Financial Reporting
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expenses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expense Recording
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'financial' && (
        <div>
          {/* Existing ExecutionForm component would go here */}
          <p className="text-gray-500">Financial reporting form would be displayed here</p>
        </div>
      )}

      {activeTab === 'expenses' && (
        <ExpenseRecordingForm
          onSave={async (data) => {
            console.log("Saving expenses from execution module:", data)
          }}
          onAutoSave={async (data) => {
            console.log("Auto-saving expenses from execution module:", data)
          }}
        />
      )}
    </div>
  )
}

// Example with custom styling
export function CustomStyledExpenseForm() {
  return (
    <div className="max-w-6xl mx-auto">
      <ExpenseRecordingForm
        className="bg-gray-50 p-6 rounded-lg shadow-sm"
        onSave={async (data) => {
          // Custom save logic
          console.log("Custom save:", data)
        }}
      />
    </div>
  )
}