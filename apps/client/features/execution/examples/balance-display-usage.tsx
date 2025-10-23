/**
 * Example usage of BalanceDisplay component
 * This demonstrates how to use the real-time balance display
 */

"use client"

import * as React from "react"
import { BalanceDisplay } from "../components/balance-display"
import { useBalanceDisplay, useBalanceValidation, useBalanceSummary } from "../hooks/use-balance-display"
import type { FinancialBalances, ExpenseEntry } from "../types/expense"

// Example standalone usage
export function StandaloneBalanceDisplay() {
  // Example balance data
  const [balances] = React.useState<FinancialBalances>({
    cashAtBank: 15000,
    payables: {
      salaries: 5000,
      maintenance: 2000,
      supplies: 1500,
      transportation: 800,
      other: 700
    },
    totalExpenses: 25000,
    initialCash: 25000
  })

  // Example previous balances for change tracking
  const [previousBalances] = React.useState<FinancialBalances>({
    cashAtBank: 18000,
    payables: {
      salaries: 3000,
      maintenance: 1500,
      supplies: 1000,
      transportation: 500,
      other: 500
    },
    totalExpenses: 22000,
    initialCash: 25000
  })

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Balance Display Example</h1>
        <p className="text-gray-600">
          Real-time financial balance visualization with change tracking
        </p>
      </div>

      <BalanceDisplay
        balances={balances}
        previousBalances={previousBalances}
        isLoading={false}
        showAnimations={true}
        showBreakdown={true}
      />
    </div>
  )
}

// Example with real-time updates using the hook
export function RealTimeBalanceExample() {
  // Use the balance display hook for real-time updates
  const {
    currentBalances,
    previousBalances,
    isLoading,
    hasChanges,
    enableAnimations,
    forceUpdate
  } = useBalanceDisplay({
    enableAnimations: true,
    updateInterval: 200,
    enablePreviousBalanceTracking: true
  })

  // Get balance validation
  const validation = useBalanceValidation(currentBalances)
  
  // Get balance summary
  const summary = useBalanceSummary(currentBalances)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Real-Time Balance Dashboard</h2>
          <p className="text-sm text-gray-600">
            Connected to expense store with live updates
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            Health Score: <span className={`font-bold ${
              validation.healthScore >= 80 ? 'text-green-600' : 
              validation.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {validation.healthScore}%
            </span>
          </div>
          <button
            onClick={forceUpdate}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Validation Alerts */}
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-800 mb-2">Balance Errors</h3>
          <ul className="text-sm text-red-700 space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Warnings</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            {validation.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Balance Display */}
      <BalanceDisplay
        balances={currentBalances}
        previousBalances={previousBalances}
        isLoading={isLoading}
        showAnimations={enableAnimations}
        showBreakdown={true}
      />

      {/* Additional Summary Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-medium mb-4">Summary Statistics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Payables:</span>
              <span className="font-medium">${summary.totalPayables.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Paid:</span>
              <span className="font-medium">${summary.totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Utilization:</span>
              <span className="font-medium">{summary.cashUtilizationRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-medium mb-4">Top Payable Categories</h3>
          <div className="space-y-2 text-sm">
            {summary.payablesByCategory.slice(0, 3).map((category, index) => (
              <div key={category.category} className="flex justify-between">
                <span>{category.category}:</span>
                <span className="font-medium">
                  ${category.amount.toLocaleString()} ({category.percentage.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Example with custom styling and configuration
export function CustomBalanceDisplay() {
  const balances: FinancialBalances = {
    cashAtBank: 8500,
    payables: {
      salaries: 12000,
      maintenance: 3500,
      supplies: 2200,
      transportation: 1800,
      other: 1000
    },
    totalExpenses: 28500,
    initialCash: 30000
  }

  return (
    <div className="max-w-4xl mx-auto">
      <BalanceDisplay
        balances={balances}
        isLoading={false}
        showAnimations={false} // Disable animations
        showBreakdown={false}  // Hide breakdown
        className="bg-gray-50 p-6 rounded-xl shadow-sm"
      />
    </div>
  )
}

// Example showing loading state
export function LoadingBalanceDisplay() {
  const [isLoading, setIsLoading] = React.useState(true)
  const [balances, setBalances] = React.useState<FinancialBalances>({
    cashAtBank: 0,
    payables: {
      salaries: 0,
      maintenance: 0,
      supplies: 0,
      transportation: 0,
      other: 0
    },
    totalExpenses: 0,
    initialCash: 0
  })

  // Simulate loading data
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setBalances({
        cashAtBank: 12000,
        payables: {
          salaries: 8000,
          maintenance: 2500,
          supplies: 1800,
          transportation: 1200,
          other: 500
        },
        totalExpenses: 26000,
        initialCash: 26000
      })
      setIsLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Loading State Example</h2>
      <BalanceDisplay
        balances={balances}
        isLoading={isLoading}
        showAnimations={true}
        showBreakdown={true}
      />
    </div>
  )
}