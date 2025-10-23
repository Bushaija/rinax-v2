import { z } from "@hono/zod-openapi";

export const reportStatusEnum = z.enum(['draft', 'submitted', 'approved', 'rejected']);
export const reportTypeEnum = z.enum([
  'revenue_expenditure', 
  'balance_sheet', 
  'cash_flow', 
  'budget_vs_actual', 
  'net_assets_changes'
]);

// Base schemas
export const insertFinancialReportSchema = z.object({
  reportCode: z.string().min(1).max(50),
  title: z.string().min(1).max(300),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int(),
  version: z.string().default('1.0'),
  fiscalYear: z.string().min(1).max(10),
  status: reportStatusEnum.default('draft'),
  reportData: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
  computedTotals: z.record(z.string(), z.any()).optional(),
  validationResults: z.record(z.string(), z.any()).optional(),
});

export const selectFinancialReportSchema = z.object({
  id: z.number().int(),
  reportCode: z.string(),
  title: z.string(),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int(),
  version: z.string(),
  fiscalYear: z.string(),
  status: reportStatusEnum,
  reportData: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).nullable(),
  computedTotals: z.record(z.string(), z.any()).nullable(),
  validationResults: z.record(z.string(), z.any()).nullable(),
  createdBy: z.number().int().nullable(),
  createdAt: z.string(),
  updatedBy: z.number().int().nullable(),
  updatedAt: z.string(),
  submittedBy: z.number().int().nullable(),
  submittedAt: z.string().nullable(),
  approvedBy: z.number().int().nullable(),
  approvedAt: z.string().nullable(),
});

export const patchFinancialReportSchema = insertFinancialReportSchema.partial();

// Extended schemas with relations
export const financialReportWithRelationsSchema = selectFinancialReportSchema.extend({
  project: z.object({
    id: z.number(),
    name: z.string(),
    code: z.string(),
    projectType: z.string().nullable(),
  }).optional(),
  facility: z.object({
    id: z.number(),
    name: z.string(),
    facilityType: z.string(),
    district: z.object({
      id: z.number(),
      name: z.string(),
    }).optional(),
  }).optional(),
  reportingPeriod: z.object({
    id: z.number(),
    year: z.number(),
    periodType: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  creator: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  submitter: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  approver: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
  }).optional(),
});

// Request/Response schemas
export const financialReportListRequestSchema = z.object({
  projectId: z.number().int().optional(),
  facilityId: z.number().int().optional(),
  fiscalYear: z.string().optional(),
  reportType: reportTypeEnum.optional(),
  createdBy: z.number().int().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.number().int().default(1),
  limit: z.number().int().default(20),
});

export const financialReportListResponseSchema = z.object({
  reports: z.array(financialReportWithRelationsSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  summary: z.object({
    totalReports: z.number(),
    byType: z.record(z.string(), z.number()),
    byFiscalYear: z.record(z.string(), z.number()),
    byProject: z.record(z.string(), z.number()),
  }).optional(),
});

// Report generation schemas
export const generateReportRequestSchema = z.object({
  templateType: reportTypeEnum,
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int(),
  fiscalYear: z.string(),
  title: z.string().optional(),
  includeComparatives: z.boolean().default(false),
  customMappings: z.record(z.string(), z.any()).optional(),
  generateFromPlanning: z.boolean().default(false),
  generateFromExecution: z.boolean().default(true),
});

export const generateReportResponseSchema = z.object({
  report: selectFinancialReportSchema,
  generationSummary: z.object({
    linesProcessed: z.number(),
    valuesComputed: z.number(),
    validationErrors: z.array(z.string()),
    warnings: z.array(z.string()),
  }),
});

export const calculateReportTotalsRequestSchema = z.object({
  recalculateAll: z.boolean().default(false),
});


// Report calculation schemas
export const calculateReportTotalsResponseSchema = z.object({
  reportId: z.number().int(),
  computedTotals: z.record(z.string(), z.any()),
  validationResults: z.record(z.string(), z.any()),
  calculationSummary: z.object({
    linesCalculated: z.number(),
    totalValue: z.number(),
    balanceValidation: z.boolean(),
    errors: z.array(z.string()),
  }),
});

// Report validation schemas
export const validateReportRequestSchema = z.object({
  reportId: z.number().int(),
  validationType: z.enum(['accounting_equation', 'completeness', 'business_rules', 'all']).default('all'),
});

export const validateReportResponseSchema = z.object({
  reportId: z.number().int(),
  isValid: z.boolean(),
  validationResults: z.object({
    accountingEquation: z.object({
      isValid: z.boolean(),
      leftSide: z.number(),
      rightSide: z.number(),
      difference: z.number(),
    }),
    completeness: z.object({
      isValid: z.boolean(),
      missingFields: z.array(z.string()),
      completionPercentage: z.number(),
    }),
    businessRules: z.object({
      isValid: z.boolean(),
      violations: z.array(z.object({
        rule: z.string(),
        field: z.string(),
        message: z.string(),
      })),
    }),
  }),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

// ============================================================================
// STATEMENT GENERATION SCHEMAS
// ============================================================================

export const statementCodeEnum = z.enum([
  'REV_EXP',
  'ASSETS_LIAB', 
  'CASH_FLOW',
  'NET_ASSETS_CHANGES',
  'BUDGET_VS_ACTUAL'
]);

export const projectTypeEnum = z.enum(['HIV', 'Malaria', 'TB']);

// Statement generation request schema
export const generateStatementRequestSchema = z.object({
  statementCode: statementCodeEnum,
  reportingPeriodId: z.number().int().positive(),
  projectType: projectTypeEnum,
  facilityId: z.number().int().positive().optional(),
  includeComparatives: z.boolean().default(true),
  customMappings: z.record(z.string(), z.any()).optional(),
});

// Standard statement line schema (for existing statements)
export const statementLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  note: z.number().int().optional(),
  currentPeriodValue: z.number(),
  previousPeriodValue: z.number(),
  variance: z.object({
    absolute: z.number(),
    percentage: z.number(),
  }).optional(),
  formatting: z.object({
    bold: z.boolean(),
    italic: z.boolean(),
    indentLevel: z.number().int().min(0),
    isSection: z.boolean(),
    isSubtotal: z.boolean(),
    isTotal: z.boolean(),
  }),
  metadata: z.object({
    lineCode: z.string(),
    eventCodes: z.array(z.string()),
    formula: z.string().optional(),
    isComputed: z.boolean(),
    displayOrder: z.number().int(),
  }),
});

// Budget vs Actual mapping interface
export const budgetVsActualMappingSchema = z.object({
  lineCode: z.string(),
  budgetEvents: z.array(z.string()),
  actualEvents: z.array(z.string()),
  note: z.number().int().optional(),
});

// Budget vs Actual line schema - six column structure
export const budgetVsActualLineSchema = z.object({
  id: z.string(),
  description: z.string(),
  note: z.number().int().optional(),
  revisedBudget: z.number(), // Column A
  actual: z.number(), // Column B
  variance: z.number(), // A - B
  performancePercentage: z.number().optional(), // (B / A) * 100, null when budget is zero
  formatting: z.object({
    bold: z.boolean(),
    italic: z.boolean(),
    indentLevel: z.number().int().min(0),
    isSection: z.boolean(),
    isSubtotal: z.boolean(),
    isTotal: z.boolean(),
  }),
  metadata: z.object({
    lineCode: z.string(),
    eventCodes: z.array(z.string()),
    formula: z.string().optional(),
    isComputed: z.boolean(),
    displayOrder: z.number().int(),
    budgetVsActualMapping: z.object({
      budgetEvents: z.array(z.string()),
      actualEvents: z.array(z.string()),
    }).optional(),
  }),
});

// Base statement schema for standard two-column statements
export const standardStatementSchema = z.object({
  statementCode: z.string(),
  statementName: z.string(),
  reportingPeriod: z.object({
    id: z.number().int(),
    year: z.number().int(),
    type: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  previousPeriod: z.object({
    id: z.number().int(),
    year: z.number().int(),
    type: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  hasPreviousPeriodData: z.boolean(),
  facility: z.object({
    id: z.number().int(),
    name: z.string(),
    type: z.string(),
    district: z.string().optional(),
  }).optional(),
  generatedAt: z.string(),
  lines: z.array(statementLineSchema),
  totals: z.record(z.string(), z.number()),
  metadata: z.object({
    templateVersion: z.string(),
    calculationFormulas: z.record(z.string(), z.string()),
    validationResults: z.object({
      totalRules: z.number().int(),
      passedRules: z.number().int(),
      failedRules: z.number().int(),
      warningCount: z.number().int(),
      errorCount: z.number().int(),
    }),
    footnotes: z.array(z.object({
      number: z.number().int(),
      text: z.string(),
      relatedLines: z.array(z.string()),
    })),
  }),
});

// Budget vs Actual statement schema - four+ column structure
export const budgetVsActualStatementSchema = z.object({
  statementCode: z.literal('BUDGET_VS_ACTUAL'),
  statementName: z.string(),
  reportingPeriod: z.object({
    id: z.number().int(),
    year: z.number().int(),
    type: z.string(),
    startDate: z.string(),
    endDate: z.string(),
  }),
  facility: z.object({
    id: z.number().int(),
    name: z.string(),
    type: z.string(),
    district: z.string().optional(),
  }).optional(),
  generatedAt: z.string(),
  lines: z.array(budgetVsActualLineSchema),
  totals: z.record(z.string(), z.object({
    budget: z.number(),
    actual: z.number(),
    variance: z.number(),
  })),
  metadata: z.object({
    templateVersion: z.string(),
    calculationFormulas: z.record(z.string(), z.string()),
    validationResults: z.object({
      totalRules: z.number().int(),
      passedRules: z.number().int(),
      failedRules: z.number().int(),
      warningCount: z.number().int(),
      errorCount: z.number().int(),
    }),
    footnotes: z.array(z.object({
      number: z.number().int(),
      text: z.string(),
      relatedLines: z.array(z.string()),
    })),
    customEventMappings: z.array(budgetVsActualMappingSchema).optional(),
  }),
});

// Statement generation response schema with union types for backward compatibility
export const generateStatementResponseSchema = z.object({
  statement: z.union([
    standardStatementSchema,
    budgetVsActualStatementSchema,
  ]),
  validation: z.object({
    isValid: z.boolean(),
    accountingEquation: z.object({
      isValid: z.boolean(),
      leftSide: z.number(),
      rightSide: z.number(),
      difference: z.number(),
      equation: z.string(),
    }),
    businessRules: z.array(z.object({
      ruleId: z.string(),
      ruleName: z.string(),
      isValid: z.boolean(),
      message: z.string(),
      affectedFields: z.array(z.string()),
    })),
    warnings: z.array(z.string()),
    errors: z.array(z.string()),
    formattedMessages: z.object({
      critical: z.array(z.object({
        type: z.string(),
        message: z.string(),
        severity: z.string(),
        actionRequired: z.boolean(),
        ruleId: z.string().optional(),
        ruleName: z.string().optional(),
        affectedFields: z.array(z.string()).optional(),
      })),
      warnings: z.array(z.object({
        type: z.string(),
        message: z.string(),
        severity: z.string(),
        actionRequired: z.boolean(),
        ruleId: z.string().optional(),
        ruleName: z.string().optional(),
        affectedFields: z.array(z.string()).optional(),
      })),
      info: z.array(z.object({
        type: z.string(),
        message: z.string(),
        severity: z.string(),
        actionRequired: z.boolean(),
        ruleId: z.string().optional(),
        ruleName: z.string().optional(),
      })),
    }),
    summary: z.object({
      totalChecks: z.number().int(),
      passedChecks: z.number().int(),
      criticalErrors: z.number().int(),
      warnings: z.number().int(),
      overallStatus: z.enum(['VALID', 'INVALID']),
    }),
  }),
  performance: z.object({
    processingTimeMs: z.number(),
    linesProcessed: z.number().int(),
    eventsProcessed: z.number().int(),
    formulasCalculated: z.number().int(),
  }),
});

// ============================================================================
// STATEMENT EXPORT SCHEMAS
// ============================================================================

export const exportFormatEnum = z.enum(['pdf', 'excel', 'csv']);
export const pageOrientationEnum = z.enum(['portrait', 'landscape']);
export const fontSizeEnum = z.enum(['small', 'medium', 'large']);

export const exportStatementRequestSchema = z.object({
  statementCode: statementCodeEnum,
  reportingPeriodId: z.number().int().positive(),
  projectType: projectTypeEnum,
  facilityId: z.number().int().positive().optional(),
  includeComparatives: z.boolean().default(true),
  exportFormat: exportFormatEnum.default('pdf'),
  exportOptions: z.object({
    includeMetadata: z.boolean().default(true),
    includeFootnotes: z.boolean().default(true),
    includeValidation: z.boolean().default(false),
    pageOrientation: pageOrientationEnum.default('portrait'),
    fontSize: fontSizeEnum.default('medium'),
    showZeroValues: z.boolean().default(true),
    highlightNegatives: z.boolean().default(true),
    includeCharts: z.boolean().default(false),
  }).optional(),
});

export type ExportStatementRequest = z.infer<typeof exportStatementRequestSchema>;
export type ExportFormat = z.infer<typeof exportFormatEnum>;
export type ExportOptions = z.infer<typeof exportStatementRequestSchema>['exportOptions'];

// ============================================================================
// BUDGET VS ACTUAL TYPE DEFINITIONS
// ============================================================================

export type BudgetVsActualLine = z.infer<typeof budgetVsActualLineSchema>;
export type BudgetVsActualStatement = z.infer<typeof budgetVsActualStatementSchema>;
export type BudgetVsActualMapping = z.infer<typeof budgetVsActualMappingSchema>;
export type StandardStatement = z.infer<typeof standardStatementSchema>;
export type GenerateStatementResponse = z.infer<typeof generateStatementResponseSchema>;

// ============================================================================
// TYPE GUARDS FOR STATEMENT RESPONSE TYPES
// ============================================================================

/**
 * Type guard to check if a statement is a Budget vs Actual statement
 */
export function isBudgetVsActualStatement(
  statement: StandardStatement | BudgetVsActualStatement
): statement is BudgetVsActualStatement {
  return statement.statementCode === 'BUDGET_VS_ACTUAL';
}

/**
 * Type guard to check if a statement is a standard two-column statement
 */
export function isStandardStatement(
  statement: StandardStatement | BudgetVsActualStatement
): statement is StandardStatement {
  return statement.statementCode !== 'BUDGET_VS_ACTUAL';
}

/**
 * Type guard to check if a line is a Budget vs Actual line
 */
export function isBudgetVsActualLine(
  line: any
): line is BudgetVsActualLine {
  return (
    typeof line === 'object' &&
    line !== null &&
    'revisedBudget' in line &&
    'actual' in line &&
    'variance' in line &&
    typeof line.revisedBudget === 'number' &&
    typeof line.actual === 'number' &&
    typeof line.variance === 'number'
  );
}
