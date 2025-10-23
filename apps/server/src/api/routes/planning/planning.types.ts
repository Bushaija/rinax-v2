import { z } from "@hono/zod-openapi";
export const approvalStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'DRAFT']);

// Base planning data schema
export const insertPlanningDataSchema = z.object({
  schemaId: z.number().int(),
  // For planning entries, activityId maps to entityId in the DB
  activityId: z.number().int().optional(),
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int().optional(),
  formData: z.record(z.string(), z.any()),
  metadata: z.record(z.string(), z.any()).optional(),
  
  // File upload fields
  sourceFileName: z.string().optional(),
  sourceFileUrl: z.string().optional(),
});

export const selectPlanningDataSchema = z.object({
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
  
  // Approval fields
  approvalStatus: approvalStatusEnum,
  reviewedBy: z.number().int().nullable(),
  reviewedAt: z.string().nullable(),
  reviewComments: z.string().nullable(),
  sourceFileName: z.string().nullable(),
  sourceFileUrl: z.string().nullable(),
});

export const patchPlanningDataSchema = insertPlanningDataSchema.partial();

// File upload schema
export const uploadPlanningFileSchema = z.object({
  projectId: z.number().int(),
  facilityId: z.number().int(),
  reportingPeriodId: z.number().int(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']),
  facilityType: z.enum(['hospital', 'health_center']),
  fileName: z.string(),
  fileData: z.string(), // Base64 encoded file content
});

// Approval action schemas
export const submitForApprovalSchema = z.object({
  planningIds: z.array(z.number().int()).min(1),
  comments: z.string().optional(),
});

export const reviewPlanningSchema = z.object({
  planningId: z.number().int(),
  action: z.enum(['APPROVE', 'REJECT']),
  comments: z.string().optional(),
});

export const bulkReviewPlanningSchema = z.object({
  planningIds: z.array(z.number().int()).min(1),
  action: z.enum(['APPROVE', 'REJECT']),
  comments: z.string().optional(),
});

// Planning calculation schemas
export const calculatePlanningTotalsSchema = z.object({
  planningId: z.number().int(),
  data: z.record(z.string(), z.any()),
});

export const planningTotalsResponseSchema = z.object({
  quarterlyTotals: z.object({
    q1: z.number(),
    q2: z.number(),
    q3: z.number(),
    q4: z.number(),
  }),
  annualTotal: z.number(),
  categoryTotals: z.record(z.string(), z.number()),
  computedValues: z.record(z.string(), z.any()),
});

// Validation schemas
export const validatePlanningDataSchema = z.object({
  schemaId: z.number().int(),
  data: z.record(z.string(), z.any()),
  context: z.object({
    projectType: z.enum(['HIV', 'Malaria', 'TB']),
    facilityType: z.enum(['hospital', 'health_center']),
    reportingPeriod: z.string().optional(),
  }).optional(),
});

// Query parameters with approval status filter
export const planningListQuerySchema = z.object({
  projectId: z.string().optional(),
  facilityId: z.string().optional(),
  reportingPeriodId: z.string().optional(),
  facilityType: z.enum(['hospital', 'health_center']).optional(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
  reportingPeriod: z.string().optional(),
  categoryId: z.string().optional(),
  year: z.string().optional(),
  // New approval filter
  approvalStatus: approvalStatusEnum.optional(),
  // Pagination
  page: z.string().default('1'),
  limit: z.string().default('20'),
});

// File parsing result
export const fileParsedDataSchema = z.object({
  activities: z.record(z.string(), z.object({
    unit_cost: z.number(),
    frequency: z.number(),
    q1_count: z.number(),
    q2_count: z.number(),
    q3_count: z.number(),
    q4_count: z.number(),
    comments: z.string().optional(),
  })),
  metadata: z.object({
    parsedAt: z.string(),
    rowCount: z.number(),
    fileName: z.string(),
  }).optional(),
});

export type InsertPlanningData = z.infer<typeof insertPlanningDataSchema>;
export type SelectPlanningData = z.infer<typeof selectPlanningDataSchema>;
export type PatchPlanningData = z.infer<typeof patchPlanningDataSchema>;
export type PlanningListQuery = z.infer<typeof planningListQuerySchema>;
export type CalculatePlanningTotals = z.infer<typeof calculatePlanningTotalsSchema>;
export type PlanningTotalsResponse = z.infer<typeof planningTotalsResponseSchema>;
export type UploadPlanningFile = z.infer<typeof uploadPlanningFileSchema>;
export type SubmitForApproval = z.infer<typeof submitForApprovalSchema>;
export type ReviewPlanning = z.infer<typeof reviewPlanningSchema>;
export type BulkReviewPlanning = z.infer<typeof bulkReviewPlanningSchema>;
export type FileParsedData = z.infer<typeof fileParsedDataSchema>;