"use client"

import { ExpenseModule } from '@/features/execution/components'
import { useExpenseExecutionIntegration } from '@/features/execution/hooks'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TestExpenseModule() {
  const [savedData, setSavedData] = useState<any>(null)
  const [saveCount, setSaveCount] = useState(0)
  const [autoSaveCount, setAutoSaveCount] = useState(0)

  // Test integration hook
  const integration = useExpenseExecutionIntegration({
    facilityId: 1,
    reportingPeriodId: 1,
    programId: 1,
    enableAutoSync: true
  })

  const handleSave = async (data: any) => {
    console.log('💾 Saving expense data:', data)
    setSavedData(data)
    setSaveCount(prev => prev + 1)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    alert('✅ Expenses saved successfully!')
  }

  const handleAutoSave = async (data: any) => {
    console.log('🔄 Auto-saving:', data)
    setAutoSaveCount(prev => prev + 1)
  }

  const summary = integration.getExpenseSummary

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Expense Module Test Page</h1>
        <p className="text-muted-foreground">
          Test all features of the expense recording module
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Save Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{saveCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Auto-Save Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoSaveCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalExpenses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Data Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={integration.isExpenseDataReady ? "default" : "secondary"}>
              {integration.isExpenseDataReady ? "✅ Ready" : "⏳ Not Ready"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Compatible with Execution:</span>
            <Badge variant={integration.isCompatibleWithExecution ? "default" : "destructive"}>
              {integration.isCompatibleWithExecution ? "✅ Yes" : "❌ No"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Online Status:</span>
            <Badge variant={integration.syncStatus.isOnline ? "default" : "secondary"}>
              {integration.syncStatus.isOnline ? "🟢 Online" : "🔴 Offline"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Syncing:</span>
            <Badge variant={integration.syncStatus.isSyncing ? "default" : "secondary"}>
              {integration.syncStatus.isSyncing ? "🔄 Syncing..." : "✅ Synced"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Pending Changes:</span>
            <Badge variant={integration.syncStatus.hasPendingChanges ? "destructive" : "default"}>
              {integration.syncStatus.hasPendingChanges ? "⚠️ Yes" : "✅ No"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Expense Summary */}
      {summary.totalExpenses > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Amount</div>
                <div className="text-lg font-bold">{summary.totalAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Paid ({summary.paidCount})</div>
                <div className="text-lg font-bold text-green-600">{summary.paidAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Unpaid ({summary.unpaidCount})</div>
                <div className="text-lg font-bold text-red-600">{summary.unpaidAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Partial ({summary.partialCount})</div>
                <div className="text-lg font-bold text-orange-600">{summary.partialAmount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Cash at Bank</div>
                <div className="text-lg font-bold">{summary.cashAtBank.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Payables</div>
                <div className="text-lg font-bold">{summary.totalPayables.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Expense Module */}
      <ExpenseModule
        onSave={handleSave}
        onAutoSave={handleAutoSave}
        facilityInfo={{
          id: 1,
          name: "Test Health Center",
          type: "Health Center",
          district: "Test District"
        }}
        reportingPeriod={{
          id: 1,
          name: "Q1 2024",
          fiscalYear: "2024"
        }}
        programInfo={{
          id: 1,
          name: "HIV Program"
        }}
        showExecutionIntegration={false}
      />

      {/* Last Saved Data */}
      {savedData && (
        <Card>
          <CardHeader>
            <CardTitle>Last Saved Data (Check Console for Full Details)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Expenses Count:</span> {savedData.expenses?.length || 0}
              </div>
              <div>
                <span className="font-medium">Total Expenses:</span> {savedData.balances?.totalExpenses?.toLocaleString() || 0}
              </div>
              <div>
                <span className="font-medium">Cash at Bank:</span> {savedData.balances?.cashAtBank?.toLocaleString() || 0}
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">View Full JSON</summary>
                <pre className="mt-2 text-xs overflow-auto bg-gray-50 p-4 rounded">
                  {JSON.stringify(savedData, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Testing Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Quick Tests:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Set initial cash at bank (e.g., 20000)</li>
              <li>Add a paid expense (e.g., Salaries - 5000)</li>
              <li>Add an unpaid expense (e.g., Equipment - 2000)</li>
              <li>Add a partial expense (e.g., Supplies - 3000, paid 1500)</li>
              <li>Verify balances update in real-time</li>
              <li>Edit an expense and verify changes</li>
              <li>Delete an expense and verify recalculation</li>
              <li>Change payment status and verify balance updates</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Keyboard Navigation:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Tab through form fields</li>
              <li>Use ↑↓ to navigate expense list</li>
              <li>Press E or Enter to edit</li>
              <li>Press Ctrl+Delete to delete</li>
              <li>Press Escape to cancel</li>
              <li>Press Ctrl+Enter to save</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Accessibility:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Test with screen reader (NVDA/VoiceOver)</li>
              <li>Verify all ARIA labels</li>
              <li>Check focus indicators</li>
              <li>Test at 200% zoom</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Performance:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Add 50+ expenses and test scrolling</li>
              <li>Monitor balance calculation speed</li>
              <li>Check memory usage in DevTools</li>
              <li>Verify auto-save works (30s interval)</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              📖 For detailed testing instructions, see: 
              <code className="ml-1 px-2 py-1 bg-gray-100 rounded">
                apps/client/features/execution/docs/testing-guide.md
              </code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
