import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface BudgetSummaryCardsProps {
  budgetSummary: {
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    utilizationPercentage: number;
  };
}

export function BudgetSummaryCards({ budgetSummary }: BudgetSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "Rwf",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const utilizationColor =
    budgetSummary.utilizationPercentage > 90
      ? "text-red-600"
      : budgetSummary.utilizationPercentage > 75
      ? "text-yellow-600"
      : "text-green-600";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Allocated */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(budgetSummary.totalAllocated)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Budget allocated for FY
          </p>
        </CardContent>
      </Card>

      {/* Total Spent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(budgetSummary.totalSpent)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Executed to date
          </p>
        </CardContent>
      </Card>

      {/* Remaining Budget */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(budgetSummary.totalRemaining)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Available to spend
          </p>
        </CardContent>
      </Card>

      {/* Utilization */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Utilization</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${utilizationColor}`}>
            {budgetSummary.utilizationPercentage.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Of allocated budget
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
