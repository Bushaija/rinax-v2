"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useExecutionFormContext } from "@/features/execution/execution-form-context";
import { Lock, Calculator } from "lucide-react";
import { PaymentStatusControl, PaymentStatus } from "@/features/execution/components/payment-status-control";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const QUARTERS = ["Q1","Q2","Q3","Q4"] as const;

// Helper function to format values professionally
function formatValue(value: number | undefined | null): string {
  if (value === undefined || value === null || value === 0) {
    return "—";
  }
  return value.toLocaleString();
}

// Helper function to extract section code from activity ID
// Example: "MAL_EXEC_HEALTH_CENTER_D_1" -> "D"
function extractSectionCode(activityId: string): string | null {
  const parts = activityId.split('_');
  // Look for single letter sections (A, B, C, D, E, F, G)
  for (const part of parts) {
    if (part.length === 1 && /[A-G]/.test(part)) {
      return part;
    }
  }
  return null;
}

// Helper function to check if an activity is in Section B (Expenditures)
function isSectionBExpense(activityId: string): boolean {
  return activityId.includes('_B_');
}

// Helper function to check if an activity is auto-calculated (Section D or E)
function isAutoCalculatedField(activityId: string): boolean {
  // Cash at Bank (D_1) and all Payables (E_*) are auto-calculated
  return activityId.includes('_D_1') || activityId.includes('_E_');
}

// Helper function to format cumulative balance based on section type
function formatCumulativeBalance(value: number | undefined | null, activityId: string): string {
  const sectionCode = extractSectionCode(activityId);
  const stockSections = ['D', 'E'];
  const isStockSection = sectionCode && stockSections.includes(sectionCode);
  
  if (isStockSection) {
    // Stock sections: distinguish between 0 and undefined
    if (value === undefined || value === null) {
      return "—"; // No data entered
    }
    if (value === 0) {
      return "0"; // Explicit zero = no balance remaining
    }
    return value.toLocaleString(); // Format number
  } else {
    // Flow sections: 0 and undefined both show as dash
    if (value === undefined || value === null || value === 0) {
      return "—"; // No activity or no data
    }
    return value.toLocaleString(); // Format number
  }
}

export function ExecutionTable() {
  const ctx = useExecutionFormContext();

  // Debug: Log payment tracking data in formData
  React.useEffect(() => {
    const sectionBExpenses = Object.entries(ctx.formData)
      .filter(([code]) => code.includes('_B_'))
      .map(([code, data]) => ({
        code,
        paymentStatus: data?.paymentStatus,
        amountPaid: data?.amountPaid,
      }));
    
    console.log('🔍 [Table] Section B Payment Status Data:', {
      totalExpenses: sectionBExpenses.length,
      sampleExpenses: sectionBExpenses.slice(0, 5),
      allExpenses: sectionBExpenses,
    });
  }, [ctx.formData]);

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-background">Activity Details</TableHead>
            {QUARTERS.map((q) => (
              <TableHead key={q} className="text-center">
              <div className={cn(
                ctx.isQuarterVisible(q as any) && !ctx.isQuarterEditable(q as any) && "text-gray-400 flex items-center justify-center gap-1",
                ctx.isQuarterVisible(q as any) && ctx.isQuarterEditable(q as any) && "flex items-center justify-center gap-1"
              )}>
                {q}
                {ctx.isQuarterVisible(q as any) && !ctx.isQuarterEditable(q as any) && <Lock className="h-3 w-3" />}
              </div>
            </TableHead>
            ))}
            <TableHead className="text-center">Cumulative Balance</TableHead>
            <TableHead className="text-center">Comment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ctx.table.map(section => (
            <React.Fragment key={section.id}>
              <TableRow className="bg-muted/50">
                <TableCell className="sticky left-0 z-10 bg-muted/50 font-bold">
                  <button
                    type="button"
                    className="mr-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
                    onClick={() => ctx.onToggleSection(section.id)}
                    aria-expanded={Boolean(ctx.expandState[section.id])}
                  >
                    {ctx.expandState[section.id] ? "▾" : "▸"}
                  </button>
                  {section.title}
                </TableCell>
                {QUARTERS.map((q) => {
                  const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                  const local = (section as any)[key] as number | undefined;
                  const fallback = (ctx.getSectionTotals(section.id) as any)[key] as number | undefined;
                  const val = typeof local === "number" ? local : fallback;
                  return (
                    <TableCell key={`${section.id}-${q}`} className="text-center">
                      {ctx.isQuarterVisible(q as any) ? (
                        ctx.isQuarterEditable(q as any) ? (
                          <span>{formatValue(val)}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-gray-600">{formatValue(val)}</span>
                            <Lock className="h-3 w-3 text-gray-400" />
                          </div>
                        )
                      ) : (
                        <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  {(() => {
                    const local = (section as any).cumulativeBalance as number | undefined;
                    const fallback = ctx.getSectionTotals(section.id).cumulativeBalance as number | undefined;
                    const val = typeof local === "number" ? local : fallback;
                    return formatCumulativeBalance(val, section.id);
                  })()}
                </TableCell>
                <TableCell />
              </TableRow>
              {ctx.expandState[section.id] !== false && section.children?.map((item: any) => {
                // Subcategory header row with expand/collapse
                if (item.isSubcategory) {
                  return (
                    <React.Fragment key={item.id}>
                      <TableRow className="bg-muted/30">
                        <TableCell className="sticky left-0 z-10 bg-muted/30 font-medium">
                          <button
                            type="button"
                            className="mr-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
                            onClick={() => ctx.onToggleSection(item.id)}
                            aria-expanded={Boolean(ctx.expandState[item.id])}
                          >
                            {ctx.expandState[item.id] ? "▾" : "▸"}
                          </button>
                          {item.title}
                        </TableCell>
                        {QUARTERS.map((q) => {
                          const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                          const val = (item as any)[key] as number | undefined;
                          return (
                            <TableCell key={`${item.id}-${q}`} className="text-center">
                              {ctx.isQuarterVisible(q as any) ? (
                                ctx.isQuarterEditable(q as any) ? (
                                  <span>{formatValue(val)}</span>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="text-gray-600">{formatValue(val)}</span>
                                    <Lock className="h-3 w-3 text-gray-400" />
                                  </div>
                                )
                              ) : (
                                <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">{formatCumulativeBalance(item.cumulativeBalance, item.id)}</TableCell>
                        <TableCell className="text-center" />
                      </TableRow>

                      {ctx.expandState[item.id] !== false && item.children?.map((leaf: any) => {
                        const rowState = ctx.getRowState(leaf.id);
                        const editable = rowState.isEditable && (leaf.isEditable !== false) && !leaf.isCalculated;
                        const isSectionB = isSectionBExpense(leaf.id);
                        const isAutoCalc = isAutoCalculatedField(leaf.id);
                        return (
                          <TableRow key={leaf.id}>
                            <TableCell className="sticky left-0 z-10 bg-background">{leaf.title}</TableCell>
                            {QUARTERS.map((q) => {
                              const isComputed = leaf.isCalculated === true || isAutoCalc;
                              const locked = ctx.isRowLocked(leaf.id, q as any);
                              const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                              const value = (leaf.isCalculated === true || isAutoCalc)
                                ? ((leaf as any)[key] as number | undefined) ?? (ctx.formData[leaf.id]?.[key] as number | undefined)
                                : ((ctx.formData[leaf.id]?.[key] ?? (leaf as any)[key]) as number | undefined);
                              
                              // Determine tooltip text for auto-calculated fields
                              const getTooltipText = () => {
                                if (leaf.id.includes('_D_1')) {
                                  return "Auto-calculated: Opening Balance - Total Paid Expenses";
                                } else if (leaf.id.includes('_E_')) {
                                  // Get payable name from leaf title for more specific tooltip
                                  const payableName = leaf.title.toLowerCase();
                                  if (payableName.includes('salaries')) {
                                    return "Auto-calculated: Unpaid Human Resources expenses";
                                  } else if (payableName.includes('supervision')) {
                                    return "Auto-calculated: Unpaid M&E supervision expenses";
                                  } else if (payableName.includes('meetings')) {
                                    return "Auto-calculated: Unpaid M&E meeting expenses";
                                  } else if (payableName.includes('sample transport')) {
                                    return "Auto-calculated: Unpaid sample transport expenses";
                                  } else if (payableName.includes('home visits')) {
                                    return "Auto-calculated: Unpaid home visit expenses";
                                  } else if (payableName.includes('travel') || payableName.includes('survellance') || payableName.includes('surveillance')) {
                                    return "Auto-calculated: Unpaid travel surveillance expenses";
                                  } else if (payableName.includes('infrastructure')) {
                                    return "Auto-calculated: Unpaid infrastructure expenses";
                                  } else if (payableName.includes('supplies')) {
                                    return "Auto-calculated: Unpaid office supplies expenses";
                                  } else if (payableName.includes('transport reporting')) {
                                    return "Auto-calculated: Unpaid transport reporting expenses";
                                  } else if (payableName.includes('bank charges')) {
                                    return "Auto-calculated: Unpaid bank charges";
                                  } else if (payableName.includes('vat')) {
                                    return "Auto-calculated: VAT refund payable";
                                  } else {
                                    return "Auto-calculated: Sum of unpaid expenses in this category";
                                  }
                                }
                                return "";
                              };
                              
                              return (
                                <TableCell key={`${leaf.id}-${q}`} className="text-center">
                                  {isComputed ? (
                                    isAutoCalc && ctx.isQuarterEditable(q as any) ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="flex items-center justify-center gap-1">
                                              <Input
                                                className="h-8 w-32 text-center bg-blue-50 cursor-not-allowed"
                                                value={formatValue(value)}
                                                disabled
                                                readOnly
                                                aria-label={`${leaf.title} for ${q}: ${formatValue(value)}. Auto-calculated field.`}
                                                aria-describedby={`${leaf.id}-${q}-calc-hint`}
                                              />
                                              <Calculator className="h-4 w-4 text-blue-500" aria-hidden="true" />
                                              <span id={`${leaf.id}-${q}-calc-hint`} className="sr-only">
                                                {getTooltipText()}
                                              </span>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-xs">{getTooltipText()}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <span>{formatValue(value)}</span>
                                    )
                                  ) : locked ? (
                                    // Show existing data with lock icon for previous quarters
                                    value !== undefined && value !== 0 ? (
                                      <div 
                                        className="flex items-center justify-center gap-1"
                                        role="status"
                                        aria-label={`${leaf.title} for ${q}: ${formatValue(value)}. This quarter is locked and cannot be edited.`}
                                      >
                                        <span className="text-gray-600">{formatValue(value)}</span>
                                        <Lock className="h-3 w-3 text-gray-400" aria-hidden="true" />
                                      </div>
                                    ) : (
                                      <div
                                        role="status"
                                        aria-label={`${leaf.title} for ${q}: No data. This quarter is locked.`}
                                      >
                                        <Lock className="h-3 w-3 mx-auto text-muted-foreground" aria-hidden="true" />
                                      </div>
                                    )
                                  ) : editable ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <Input
                                        key={`${leaf.id}-${key}-${value ?? 0}`}
                                        className="h-8 w-32 text-center"
                                        defaultValue={value ?? 0}
                                        type="number"
                                        step="0.01"
                                        inputMode="decimal"
                                        onBlur={(e: React.FocusEvent<HTMLInputElement>) => ctx.onFieldChange(leaf.id, Number(e.target.value || 0))}
                                      />
                                      {isSectionB && (
                                        <PaymentStatusControl
                                          expenseCode={leaf.id}
                                          amount={value ?? 0}
                                          paymentStatus={(ctx.formData[leaf.id]?.paymentStatus as PaymentStatus) ?? "unpaid"}
                                          amountPaid={ctx.formData[leaf.id]?.amountPaid ?? 0}
                                          onChange={(status, amountPaid) => ctx.updateExpensePayment(leaf.id, status, amountPaid)}
                                          disabled={!editable}
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <span className={cn(locked && "text-gray-400")}>{formatValue(value)}</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">{formatCumulativeBalance(leaf.cumulativeBalance, leaf.id)}</TableCell>
                            <TableCell className="text-center">
                              {!rowState.isCalculated && (
                                <input
                                  className="h-8 w-52 border rounded px-2"
                                  defaultValue={ctx.formData[leaf.id]?.comment ?? ""}
                                  onBlur={(e) => ctx.onCommentChange(leaf.id, e.target.value)}
                                  disabled={!editable}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                }

                // Leaf row directly under section
                const rowState = ctx.getRowState(item.id);
                const editable = rowState.isEditable && (item.isEditable !== false) && !item.isCalculated;
                const isSectionB = isSectionBExpense(item.id);
                const isAutoCalc = isAutoCalculatedField(item.id);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="sticky left-0 z-10 bg-background">{item.title}</TableCell>
                    {QUARTERS.map((q) => {
                      const isComputed = item.isCalculated === true || isAutoCalc;
                      const locked = ctx.isRowLocked(item.id, q as any);
                      const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                      const value = (item.isCalculated === true || isAutoCalc)
                        ? ((item as any)[key] as number | undefined) ?? (ctx.formData[item.id]?.[key] as number | undefined)
                        : ((ctx.formData[item.id]?.[key] ?? (item as any)[key]) as number | undefined);
                      
                      // Determine tooltip text for auto-calculated fields
                      const getTooltipText = () => {
                        if (item.id.includes('_D_1')) {
                          return "Auto-calculated: Opening Balance - Total Paid Expenses";
                        } else if (item.id.includes('_E_')) {
                          // Get payable name from item title for more specific tooltip
                          const payableName = item.title.toLowerCase();
                          if (payableName.includes('salaries')) {
                            return "Auto-calculated: Unpaid Human Resources expenses";
                          } else if (payableName.includes('supervision')) {
                            return "Auto-calculated: Unpaid M&E supervision expenses";
                          } else if (payableName.includes('meetings')) {
                            return "Auto-calculated: Unpaid M&E meeting expenses";
                          } else if (payableName.includes('sample transport')) {
                            return "Auto-calculated: Unpaid sample transport expenses";
                          } else if (payableName.includes('home visits')) {
                            return "Auto-calculated: Unpaid home visit expenses";
                          } else if (payableName.includes('travel') || payableName.includes('survellance') || payableName.includes('surveillance')) {
                            return "Auto-calculated: Unpaid travel surveillance expenses";
                          } else if (payableName.includes('infrastructure')) {
                            return "Auto-calculated: Unpaid infrastructure expenses";
                          } else if (payableName.includes('supplies')) {
                            return "Auto-calculated: Unpaid office supplies expenses";
                          } else if (payableName.includes('transport reporting')) {
                            return "Auto-calculated: Unpaid transport reporting expenses";
                          } else if (payableName.includes('bank charges')) {
                            return "Auto-calculated: Unpaid bank charges";
                          } else if (payableName.includes('vat')) {
                            return "Auto-calculated: VAT refund payable";
                          } else {
                            return "Auto-calculated: Sum of unpaid expenses in this category";
                          }
                        }
                        return "";
                      };
                      
                      return (
                        <TableCell key={`${item.id}-${q}`} className="text-center">
                          {isComputed ? (
                            isAutoCalc && ctx.isQuarterEditable(q as any) ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center gap-1">
                                      <Input
                                        className="h-8 w-32 text-center bg-blue-50 cursor-not-allowed"
                                        value={formatValue(value)}
                                        disabled
                                        readOnly
                                        aria-label={`${item.title} for ${q}: ${formatValue(value)}. Auto-calculated field.`}
                                        aria-describedby={`${item.id}-${q}-calc-hint`}
                                      />
                                      <Calculator className="h-4 w-4 text-blue-500" aria-hidden="true" />
                                      <span id={`${item.id}-${q}-calc-hint`} className="sr-only">
                                        {getTooltipText()}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">{getTooltipText()}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span>{formatValue(value)}</span>
                            )
                          ) : locked ? (
                            // Show existing data with lock icon for previous quarters
                            value !== undefined && value !== 0 ? (
                              <div 
                                className="flex items-center justify-center gap-1"
                                role="status"
                                aria-label={`${item.title} for ${q}: ${formatValue(value)}. This quarter is locked and cannot be edited.`}
                              >
                                <span className="text-gray-600">{formatValue(value)}</span>
                                <Lock className="h-3 w-3 text-gray-400" aria-hidden="true" />
                              </div>
                            ) : (
                              <div
                                role="status"
                                aria-label={`${item.title} for ${q}: No data. This quarter is locked.`}
                              >
                                <Lock className="h-3 w-3 mx-auto text-muted-foreground" aria-hidden="true" />
                              </div>
                            )
                          ) : editable ? (
                            <div className="flex items-center justify-center gap-2">
                              <Input
                                key={`${item.id}-${key}-${value ?? 0}`}
                                className="h-8 w-32 text-center"
                                defaultValue={value ?? 0}
                                type="number"
                                step="0.01"
                                inputMode="decimal"
                                onBlur={(e: React.FocusEvent<HTMLInputElement>) => ctx.onFieldChange(item.id, Number(e.target.value || 0))}
                              />
                              {isSectionB && (
                                <PaymentStatusControl
                                  expenseCode={item.id}
                                  amount={value ?? 0}
                                  paymentStatus={(ctx.formData[item.id]?.paymentStatus as PaymentStatus) ?? "unpaid"}
                                  amountPaid={ctx.formData[item.id]?.amountPaid ?? 0}
                                  onChange={(status, amountPaid) => ctx.updateExpensePayment(item.id, status, amountPaid)}
                                  disabled={!editable}
                                />
                              )}
                            </div>
                          ) : (
                            <span className={cn(locked && "text-gray-400")}>{formatValue(value)}</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">{formatCumulativeBalance(item.cumulativeBalance, item.id)}</TableCell>
                    <TableCell className="text-center">
                      {!rowState.isCalculated && (
                        <input
                          className="h-8 w-52 border rounded px-2"
                          defaultValue={ctx.formData[item.id]?.comment ?? ""}
                          onBlur={(e) => ctx.onCommentChange(item.id, e.target.value)}
                          disabled={!editable}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default ExecutionTable;


