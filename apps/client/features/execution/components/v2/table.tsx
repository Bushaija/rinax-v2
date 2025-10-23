"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useExecutionFormContext } from "@/features/execution/execution-form-context";
import { Lock } from "lucide-react";

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
                        return (
                          <TableRow key={leaf.id}>
                            <TableCell className="sticky left-0 z-10 bg-background">{leaf.title}</TableCell>
                            {QUARTERS.map((q) => {
                              const isComputed = leaf.isCalculated === true;
                              const locked = ctx.isRowLocked(leaf.id, q as any);
                              const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                              const value = (leaf.isCalculated === true)
                                ? ((leaf as any)[key] as number | undefined)
                                : ((ctx.formData[leaf.id]?.[key] ?? (leaf as any)[key]) as number | undefined);
                              return (
                                <TableCell key={`${leaf.id}-${q}`} className="text-center">
                                  {isComputed ? (
                                    <span>{formatValue(value)}</span>
                                  ) : locked ? (
                                    // Show existing data with lock icon for previous quarters
                                    value !== undefined && value !== 0 ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="text-gray-600">{formatValue(value)}</span>
                                        <Lock className="h-3 w-3 text-gray-400" />
                                      </div>
                                    ) : (
                                      <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                                    )
                                  ) : editable ? (
                                    <Input
                                      key={`${leaf.id}-${key}-${value ?? 0}`}
                                      className="h-8 w-32 text-center"
                                      defaultValue={value ?? 0}
                                      type="number"
                                      step="0.01"
                                      inputMode="decimal"
                                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => ctx.onFieldChange(leaf.id, Number(e.target.value || 0))}
                                    />
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
                return (
                  <TableRow key={item.id}>
                    <TableCell className="sticky left-0 z-10 bg-background">{item.title}</TableCell>
                    {QUARTERS.map((q) => {
                      const isComputed = item.isCalculated === true;
                      const locked = ctx.isRowLocked(item.id, q as any);
                      const key = q.toLowerCase() as "q1" | "q2" | "q3" | "q4";
                      const value = (item.isCalculated === true)
                        ? ((item as any)[key] as number | undefined)
                        : ((ctx.formData[item.id]?.[key] ?? (item as any)[key]) as number | undefined);
                      return (
                        <TableCell key={`${item.id}-${q}`} className="text-center">
                          {isComputed ? (
                            <span>{formatValue(value)}</span>
                          ) : locked ? (
                            // Show existing data with lock icon for previous quarters
                            value !== undefined && value !== 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-gray-600">{formatValue(value)}</span>
                                <Lock className="h-3 w-3 text-gray-400" />
                              </div>
                            ) : (
                              <Lock className="h-3 w-3 mx-auto text-muted-foreground" />
                            )
                          ) : editable ? (
                            <Input
                              key={`${item.id}-${key}-${value ?? 0}`}
                              className="h-8 w-32 text-center"
                              defaultValue={value ?? 0}
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              onBlur={(e: React.FocusEvent<HTMLInputElement>) => ctx.onFieldChange(item.id, Number(e.target.value || 0))}
                            />
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


