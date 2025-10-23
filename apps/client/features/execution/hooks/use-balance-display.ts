/**
 * Custom hook for real-time balance display integration
 * Requirements: 3.4, 5.1, 5.2
 */

import * as React from "react"
import type { FinancialBalances } from "../types/expense"
import { useExpenseState } from "../stores/expense-store"
import { createBalanceCalculator } from "../utils/balance-calculation-engine"

interface BalanceDisplayHookOptions {
  enableAnimations?: boolean
  updateInterval?: number
  enablePreviousBalanceTracking?: boolean
}

interface BalanceDisplayState {
  currentBalances: FinancialBalances
  previousBalances?: FinancialBalances
  isLoading: boolean
  hasChanges: boolean
  lastUpdated: Date
}

/**
 * Hook for managing balance display state with real-time updates
 */
export function useBalanceDisplay(options: BalanceDisplayHookOptions = {}) {
  const {
    enableAnimations = true,
    updateInterval = 100, // 100ms for smooth real-time updates
    enablePreviousBalanceTracking = true
  } = options

  // Get expense state from store
  const { expenses, balances: storeBalances, syncStatus } = useExpenseState()

  // Local state for balance display
  const [displayState, setDisplayState] = React.useState<BalanceDisplayState>({
    currentBalances: storeBalances,
    previousBalances: undefined,
    isLoading: false,
    hasChanges: false,
    lastUpdated: new Date()
  })

  // Create balance calculator instance
  const balanceCalculator = React.useMemo(() => {
    return createBalanceCalculator(storeBalances.initialCash)
  }, [storeBalances.initialCash])

  // Track previous balances for change detection
  const previousBalancesRef = React.useRef<FinancialBalances>(storeBalances)

  // Debounced update function to prevent excessive re-renders
  const debouncedUpdateRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  // Update balance display state
  const updateBalanceDisplay = React.useCallback(() => {
    // Clear existing timeout
    if (debouncedUpdateRef.current) {
      clearTimeout(debouncedUpdateRef.current)
    }

    // Set loading state
    setDisplayState(prev => ({ ...prev, isLoading: true }))

    // Debounce the actual update
    debouncedUpdateRef.current = setTimeout(() => {
      // Recalculate balances from current expenses
      const calculatedBalances = balanceCalculator.calculate(expenses)

      // Check if balances have actually changed
      const hasChanges = JSON.stringify(calculatedBalances) !== JSON.stringify(previousBalancesRef.current)

      setDisplayState(prev => ({
        currentBalances: calculatedBalances,
        previousBalances: enablePreviousBalanceTracking ? previousBalancesRef.current : undefined,
        isLoading: false,
        hasChanges,
        lastUpdated: new Date()
      }))

      // Update previous balances reference
      if (hasChanges) {
        previousBalancesRef.current = calculatedBalances
      }
    }, updateInterval)
  }, [expenses, balanceCalculator, updateInterval, enablePreviousBalanceTracking])

  // Update when expenses change
  React.useEffect(() => {
    updateBalanceDisplay()

    // Cleanup timeout on unmount
    return () => {
      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current)
      }
    }
  }, [updateBalanceDisplay])

  // Update calculator when initial cash changes
  React.useEffect(() => {
    balanceCalculator.setInitialCash(storeBalances.initialCash)
    updateBalanceDisplay()
  }, [storeBalances.initialCash, balanceCalculator, updateBalanceDisplay])

  // Handle sync status changes
  React.useEffect(() => {
    if (syncStatus.syncInProgress) {
      setDisplayState(prev => ({ ...prev, isLoading: true }))
    } else {
      // Trigger update after sync completes
      updateBalanceDisplay()
    }
  }, [syncStatus.syncInProgress, updateBalanceDisplay])

  return {
    // Balance data
    currentBalances: displayState.currentBalances,
    previousBalances: displayState.previousBalances,
    
    // State indicators
    isLoading: displayState.isLoading || syncStatus.syncInProgress,
    hasChanges: displayState.hasChanges,
    lastUpdated: displayState.lastUpdated,
    
    // Sync status
    syncStatus,
    
    // Configuration
    enableAnimations,
    
    // Utility functions
    forceUpdate: updateBalanceDisplay,
    
    // Balance calculator access
    calculator: balanceCalculator
  }
}

/**
 * Hook for balance change animations and transitions
 */
export function useBalanceAnimations(
  currentBalances: FinancialBalances,
  previousBalances?: FinancialBalances,
  enabled: boolean = true
) {
  const [animationState, setAnimationState] = React.useState<{
    cashAtBankAnimation: 'none' | 'increase' | 'decrease'
    payablesAnimation: 'none' | 'increase' | 'decrease'
    expensesAnimation: 'none' | 'increase' | 'decrease'
  }>({
    cashAtBankAnimation: 'none',
    payablesAnimation: 'none',
    expensesAnimation: 'none'
  })

  React.useEffect(() => {
    if (!enabled || !previousBalances) return

    const cashChange = currentBalances.cashAtBank - previousBalances.cashAtBank
    const payablesChange = (
      currentBalances.payables.salaries + 
      currentBalances.payables.maintenance + 
      currentBalances.payables.supplies + 
      currentBalances.payables.transportation + 
      currentBalances.payables.other
    ) - (
      previousBalances.payables.salaries + 
      previousBalances.payables.maintenance + 
      previousBalances.payables.supplies + 
      previousBalances.payables.transportation + 
      previousBalances.payables.other
    )
    const expensesChange = currentBalances.totalExpenses - previousBalances.totalExpenses

    setAnimationState({
      cashAtBankAnimation: cashChange > 0 ? 'increase' : cashChange < 0 ? 'decrease' : 'none',
      payablesAnimation: payablesChange > 0 ? 'increase' : payablesChange < 0 ? 'decrease' : 'none',
      expensesAnimation: expensesChange > 0 ? 'increase' : expensesChange < 0 ? 'decrease' : 'none'
    })

    // Reset animations after a delay
    const timeout = setTimeout(() => {
      setAnimationState({
        cashAtBankAnimation: 'none',
        payablesAnimation: 'none',
        expensesAnimation: 'none'
      })
    }, 2000)

    return () => clearTimeout(timeout)
  }, [currentBalances, previousBalances, enabled])

  return animationState
}

/**
 * Hook for balance validation and health checks
 */
export function useBalanceValidation(
  balances: FinancialBalances,
  expenses: any[] = []
) {
  const [validationState, setValidationState] = React.useState<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    healthScore: number
  }>({
    isValid: true,
    errors: [],
    warnings: [],
    healthScore: 100
  })

  const balanceCalculator = React.useMemo(() => {
    return createBalanceCalculator(balances.initialCash)
  }, [balances.initialCash])

  React.useEffect(() => {
    // Validate balance integrity
    const validation = balanceCalculator.validate(expenses, balances)
    
    const warnings: string[] = []
    let healthScore = 100

    // Check for potential issues
    if (balances.cashAtBank < 0) {
      warnings.push("Negative cash balance detected")
      healthScore -= 30
    }

    const totalPayables = balances.payables.salaries + 
                         balances.payables.maintenance + 
                         balances.payables.supplies + 
                         balances.payables.transportation + 
                         balances.payables.other

    if (balances.initialCash > 0) {
      const cashUtilization = (balances.initialCash - balances.cashAtBank) / balances.initialCash
      
      if (cashUtilization > 0.9) {
        warnings.push("High cash utilization (>90%)")
        healthScore -= 15
      }
      
      if (totalPayables > balances.cashAtBank) {
        warnings.push("Payables exceed available cash")
        healthScore -= 20
      }
    }

    setValidationState({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings,
      healthScore: Math.max(0, healthScore)
    })
  }, [balances, expenses, balanceCalculator])

  return validationState
}

/**
 * Hook for balance summary statistics
 */
export function useBalanceSummary(balances: FinancialBalances) {
  return React.useMemo(() => {
    const balanceCalculator = createBalanceCalculator(balances.initialCash)
    return balanceCalculator.getSummary(balances)
  }, [balances])
}