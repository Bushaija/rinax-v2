import { z } from "@hono/zod-openapi";

// Base execution data schema
export const insertExecutionDataSchema = z.object({
  schemaId: z.number().int(),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int().optional(),
  formData: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const selectExecutionDataSchema = z.object({
  id: z.number().int(),
  schemaId: z.number().int(),
  entityId: z.number().int().nullable(),
  entityType: z.string(),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int().nullable(),
  formData: z.record(z.string(), z.any()),
  computedValues: z.record(z.string(), z.any()).nullable(),
  validationState: z.record(z.string(), z.any()).nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
  createdBy: z.number().int().nullable(),
  createdAt: z.string(),
  updatedBy: z.number().int().nullable(),
  updatedAt: z.string(),
});

export const patchExecutionDataSchema = insertExecutionDataSchema.partial();

// Balance calculation schemas
export const quarterlyValuesSchema = z.object({
  q1: z.number(),
  q2: z.number(),
  q3: z.number(),
  q4: z.number(),
  cumulativeBalance: z.number(),
});

export const calculateBalancesSchema = z.object({
  executionId: z.number().int(),
  data: z.record(z.string(), z.any()),
});

export const balancesResponseSchema = z.object({
  receipts: quarterlyValuesSchema,
  expenditures: quarterlyValuesSchema,
  surplus: quarterlyValuesSchema,
  financialAssets: quarterlyValuesSchema,
  financialLiabilities: quarterlyValuesSchema,
  netFinancialAssets: quarterlyValuesSchema,
  closingBalance: quarterlyValuesSchema,
  isBalanced: z.boolean(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
  })),
});

// Accounting equation validation schema
export const accountingEquationValidationSchema = z.object({
  data: z.record(z.string(), z.any()),
  tolerance: z.number().default(0.01), // Allow small rounding differences
});

// Query parameters
export const executionListQuerySchema = z.object({
  // Direct ID filters
  projectId: z.string().optional(),
  facilityId: z.string().optional(),
  reportingPeriodId: z.string().optional(),
  categoryId: z.string().optional(),

  // Type-based filters
  facilityType: z.enum(['hospital', 'health_center']).optional(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
  reportingPeriod: z.string().optional(), // Year (e.g., "2024")
  year: z.string().optional(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),

  // Pagination
  page: z.string().default('1'),
  limit: z.string().default('20'),
});

export type InsertExecutionData = z.infer<typeof insertExecutionDataSchema>;
export type SelectExecutionData = z.infer<typeof selectExecutionDataSchema>;
export type PatchExecutionData = z.infer<typeof patchExecutionDataSchema>;
export type ExecutionListQuery = z.infer<typeof executionListQuerySchema>;
export type CalculateBalances = z.infer<typeof calculateBalancesSchema>;
export type BalancesResponse = z.infer<typeof balancesResponseSchema>;
export type QuarterlyValues = z.infer<typeof quarterlyValuesSchema>;

// Compiled execution aggregation schemas
export const compiledExecutionQuerySchema = z.object({
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional()
    .describe("Filter by project type (HIV, Malaria, or TB)"),
  facilityType: z.enum(['hospital', 'health_center']).optional()
    .describe("Filter by facility type (hospital or health_center)"),
  reportingPeriodId: z.coerce.number().int().optional()
    .describe("Filter by specific reporting period ID"),
  year: z.coerce.number().int().optional()
    .describe("Filter by year (e.g., 2024)"),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional()
    .describe("Filter by quarter (Q1, Q2, Q3, or Q4)"),
  districtId: z.coerce.number().int().optional()
    .describe("Filter by district ID (future enhancement)"),
});

export const facilityColumnSchema = z.object({
  id: z.number().int().describe("Unique facility identifier"),
  name: z.string().describe("Facility name"),
  facilityType: z.string().describe("Type of facility (hospital, health_center)"),
  projectType: z.string().describe("Project type (HIV, Malaria, TB)"),
  hasData: z.boolean().describe("Whether this facility has execution data"),
});

// Define ActivityRow interface first for recursive reference
export interface ActivityRow {
  code: string;
  name: string;
  category: string;
  subcategory?: string;
  displayOrder: number;
  isSection: boolean;
  isSubcategory: boolean;
  isComputed: boolean;
  computationFormula?: string;
  values: Record<string, number>; // facilityId -> value
  total: number;
  level: number; // 0=section, 1=subcategory, 2=activity
  items?: ActivityRow[]; // nested items for hierarchical structure
}

// Base schema without recursion for OpenAPI compatibility
const baseActivityRowSchema = z.object({
  code: z.string().describe("Activity code identifier"),
  name: z.string().describe("Human-readable activity name"),
  category: z.string().describe("Activity category (A-G)"),
  subcategory: z.string().optional().describe("Subcategory code if applicable"),
  displayOrder: z.number().describe("Order for display purposes"),
  isSection: z.boolean().describe("Whether this is a section header"),
  isSubcategory: z.boolean().describe("Whether this is a subcategory header"),
  isComputed: z.boolean().describe("Whether values are computed vs. entered"),
  computationFormula: z.string().optional().describe("Formula used for computed values"),
  values: z.record(z.string(), z.number()).describe("Values by facility ID"),
  total: z.number().describe("Total value across all facilities"),
  level: z.number().describe("Hierarchy level: 0=section, 1=subcategory, 2=activity"),
});

// OpenAPI-friendly schema (flattened, no recursion)
export const activityRowSchema = baseActivityRowSchema.extend({
  items: z.array(baseActivityRowSchema).optional()
    .describe("Nested child activities (one level deep for OpenAPI compatibility)"),
});

// Runtime schema with full recursion for actual validation
// Note: Use this for runtime validation, not for OpenAPI schemas
export const activityRowSchemaRecursive: z.ZodType<ActivityRow> = z.lazy(() => 
  baseActivityRowSchema.extend({
    items: z.array(activityRowSchemaRecursive).optional(),
  })
);

// Note: The activityRowSchema (non-recursive) is used in OpenAPI schemas to avoid
// circular reference issues that can cause OpenAPI generators to fail or produce
// incorrect documentation. The recursive version is available for runtime validation
// if needed, but the flattened version should be sufficient for most use cases.

export const sectionSummarySchema = z.object({
  code: z.string(),
  name: z.string(),
  total: z.number(),
  isComputed: z.boolean(),
  computationFormula: z.string().optional(),
});

export const facilityTotalsSchema = z.object({
  byFacility: z.record(z.string(), z.number()),
  grandTotal: z.number(),
});

export const appliedFiltersSchema = z.object({
  projectType: z.string().optional(),
  facilityType: z.string().optional(),
  reportingPeriodId: z.number().optional(),
  year: z.number().optional(),
  quarter: z.string().optional(),
  districtId: z.number().optional(),
});

export const compiledExecutionResponseSchema = z.object({
  data: z.object({
    facilities: z.array(facilityColumnSchema),
    activities: z.array(activityRowSchema),
    sections: z.array(sectionSummarySchema),
    totals: facilityTotalsSchema,
  }),
  meta: z.object({
    filters: appliedFiltersSchema,
    aggregationDate: z.string(),
    facilityCount: z.number(),
    reportingPeriod: z.string(),
  }),
});

export type CompiledExecutionQuery = z.infer<typeof compiledExecutionQuerySchema>;
export type FacilityColumn = z.infer<typeof facilityColumnSchema>;
// ActivityRow interface is defined above
export type SectionSummary = z.infer<typeof sectionSummarySchema>;
export type FacilityTotals = z.infer<typeof facilityTotalsSchema>;
export type AppliedFilters = z.infer<typeof appliedFiltersSchema>;
export type CompiledExecutionResponse = z.infer<typeof compiledExecutionResponseSchema>;
