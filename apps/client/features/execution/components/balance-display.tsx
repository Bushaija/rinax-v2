/**
 * BalanceDisplay component for real-time financial balance visualization
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Wallet,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react"
import { cn } from "@/lib/utils"

import type { FinancialBalances, PayableBreakdown } from "../types/expense"
import { calculateTotalPayables } from "../utils/expense-helpers"

interface BalanceDisplayProps {
  balances: FinancialBalances
  previousBalances?: FinancialBalances
  isLoading?: boolean
  showAnimations?: boolean
  showBreakdown?: boolean
  className?: string
}

interface BalanceChangeIndicator {
  value: number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  changePercentage: number
}

export function BalanceDisplay({
  balances,
  previousBalances,
  isLoading = false,
  showAnimations = true,
  showBreakdown = true,
  className
}: BalanceDisplayProps) {
  // Calculate changes from previous balances
  const balanceChanges = React.useMemo(() => {
    if (!previousBalances) {
      return {
        cashAtBank: { value: balances.cashAtBank, change: 0, changeType: 'neutral' as const, changePercentage: 0 },
        totalPayables: { value: calculateTotalPayables(balances.payables), change: 0, changeType: 'neutral' as const, changePercentage: 0 },
        totalExpenses: { value: balances.totalExpenses, change: 0, changeType: 'neutral' as const, changePercentage: 0 }
      }
    }

    const currentTotalPayables = calculateTotalPayables(balances.payables)
    const previousTotalPayables = calculateTotalPayables(previousBalances.payables)

    const calculateChange = (current: number, previous: number): BalanceChangeIndicator => {
      const change = current - previous
      const changeType = change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral'
      const changePercentage = previous !== 0 ? Math.abs((change / previous) * 100) : 0

      return {
        value: current,
        change,
        changeType,
        changePercentage
      }
    }

    return {
      cashAtBank: calculateChange(balances.cashAtBank, previousBalances.cashAtBank),
      totalPayables: calculateChange(currentTotalPayables, previousTotalPayables),
      totalExpenses: calculateChange(balances.totalExpenses, previousBalances.totalExpenses)
    }
  }, [balances, previousBalances])

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Format change amount with sign
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${formatCurrency(change)}`
  }

  // Get status color based on balance health
  const getBalanceStatus = () => {
    const totalPayables = calculateTotalPayables(balances.payables)
    const cashUtilization = balances.initialCash > 0 ? (balances.initialCash - balances.cashAtBank) / balances.initialCash : 0

    if (balances.cashAtBank < 0) {
      return { status: 'critical', color: 'destructive', icon: AlertTriangle }
    } else if (cashUtilization > 0.9) {
      return { status: 'warning', color: 'warning', icon: Clock }
    } else if (totalPayables === 0) {
      return { status: 'excellent', color: 'success', icon: CheckCircle }
    } else {
      return { status: 'good', color: 'default', icon: BarChart3 }
    }
  }

  const balanceStatus = getBalanceStatus()

  // Payable breakdown with percentages
  const payableBreakdown = React.useMemo(() => {
    const totalPayables = calculateTotalPayables(balances.payables)
    
    return Object.entries(balances.payables)
      .map(([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount,
        percentage: totalPayables > 0 ? (amount / totalPayables) * 100 : 0
      }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
  }, [balances.payables])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cash at Bank */}
        <Card className={cn(
          "transition-all duration-300",
          showAnimations && "hover:shadow-md",
          balances.cashAtBank < 0 && "border-destructive bg-destructive/5"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash at Bank
            </CardTitle>
            <Wallet className={cn(
              "h-4 w-4",
              balances.cashAtBank < 0 ? "text-destructive" : "text-blue-600"
            )} />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className={cn(
                "text-2xl font-bold",
                balances.cashAtBank < 0 ? "text-destructive" : "text-blue-800"
              )}>
                {formatCurrency(balances.cashAtBank)}
              </div>
              {balanceChanges.cashAtBank.change !== 0 && (
                <div className={cn(
                  "flex items-center text-xs",
                  balanceChanges.cashAtBank.changeType === 'increase' ? "text-green-600" : "text-red-600"
                )}>
                  {balanceChanges.cashAtBank.changeType === 'increase' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {formatChange(balanceChanges.cashAtBank.change)}
                </div>
              )}
            </div>
            {balances.initialCash > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {((balances.cashAtBank / balances.initialCash) * 100).toFixed(1)}% of initial cash
              </p>
            )}
            {isLoading && (
              <div className="mt-2 h-1 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Payables */}
        <Card className={cn(
          "transition-all duration-300",
          showAnimations && "hover:shadow-md"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payables
            </CardTitle>
            <CreditCard className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold text-orange-800">
                {formatCurrency(balanceChanges.totalPayables.value)}
              </div>
              {balanceChanges.totalPayables.change !== 0 && (
                <div className={cn(
                  "flex items-center text-xs",
                  balanceChanges.totalPayables.changeType === 'increase' ? "text-red-600" : "text-green-600"
                )}>
                  {balanceChanges.totalPayables.changeType === 'increase' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {formatChange(balanceChanges.totalPayables.change)}
                </div>
              )}
            </div>
            {balances.totalExpenses > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {((balanceChanges.totalPayables.value / balances.totalExpenses) * 100).toFixed(1)}% of total expenses
              </p>
            )}
            {isLoading && (
              <div className="mt-2 h-1 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-orange-500 animate-pulse" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className={cn(
          "transition-all duration-300",
          showAnimations && "hover:shadow-md"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold text-green-800">
                {formatCurrency(balanceChanges.totalExpenses.value)}
              </div>
              {balanceChanges.totalExpenses.change !== 0 && (
                <div className={cn(
                  "flex items-center text-xs",
                  balanceChanges.totalExpenses.changeType === 'increase' ? "text-orange-600" : "text-green-600"
                )}>
                  {balanceChanges.totalExpenses.changeType === 'increase' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {formatChange(balanceChanges.totalExpenses.change)}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Paid: {formatCurrency(balances.initialCash - balances.cashAtBank)}
            </p>
            {isLoading && (
              <div className="mt-2 h-1 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-green-500 animate-pulse" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Balance Status Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <balanceStatus.icon className={cn(
                "h-5 w-5",
                balanceStatus.color === 'destructive' && "text-destructive",
                balanceStatus.color === 'warning' && "text-yellow-600",
                balanceStatus.color === 'success' && "text-green-600",
                balanceStatus.color === 'default' && "text-blue-600"
              )} />
              <div>
                <p className="font-medium">
                  Financial Status: {balanceStatus.status.charAt(0).toUpperCase() + balanceStatus.status.slice(1)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {balanceStatus.status === 'critical' && "Negative cash balance - immediate attention required"}
                  {balanceStatus.status === 'warning' && "High cash utilization - monitor closely"}
                  {balanceStatus.status === 'excellent' && "All expenses paid - excellent financial position"}
                  {balanceStatus.status === 'good' && "Healthy balance with manageable payables"}
                </p>
              </div>
            </div>
            <Badge variant={
              balanceStatus.color === 'destructive' ? 'destructive' :
              balanceStatus.color === 'warning' ? 'secondary' :
              balanceStatus.color === 'success' ? 'default' : 'outline'
            }>
              {balanceStatus.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Payables Breakdown */}
      {showBreakdown && payableBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Payables Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payableBreakdown.map((item, index) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.category}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {item.percentage.toFixed(1)}%
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all duration-500",
                        index === 0 && "bg-orange-500",
                        index === 1 && "bg-blue-500",
                        index === 2 && "bg-green-500",
                        index === 3 && "bg-purple-500",
                        index >= 4 && "bg-gray-500"
                      )}
                      style={{ 
                        width: `${item.percentage}%`,
                        ...(showAnimations && {
                          animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                        })
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {balances.initialCash > 0 ? 
                  (((balances.initialCash - balances.cashAtBank) / balances.initialCash) * 100).toFixed(1) : 
                  '0.0'
                }%
              </p>
              <p className="text-xs text-muted-foreground">Cash Utilized</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {balances.totalExpenses > 0 ? 
                  (((balances.totalExpenses - balanceChanges.totalPayables.value) / balances.totalExpenses) * 100).toFixed(1) : 
                  '0.0'
                }%
              </p>
              <p className="text-xs text-muted-foreground">Expenses Paid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {payableBreakdown.length}
              </p>
              <p className="text-xs text-muted-foreground">Active Categories</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(balances.initialCash)}
              </p>
              <p className="text-xs text-muted-foreground">Initial Cash</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animation Styles */}
      {showAnimations && (
        <style jsx>{`
          @keyframes slideIn {
            from {
              width: 0%;
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}</style>
      )}
    </div>
  )
}