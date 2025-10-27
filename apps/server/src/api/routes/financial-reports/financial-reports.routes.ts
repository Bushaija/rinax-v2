import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { IdParamsSchema } from "stoker/openapi/schemas";
import {
  financialReportWithRelationsSchema,
  financialReportListRequestSchema,
  financialReportListResponseSchema,
  generateStatementRequestSchema,
  generateStatementResponseSchema,
  exportStatementRequestSchema,
  submitForApprovalRequestSchema,
  approvalActionRequestSchema,
  rejectionActionRequestSchema,
  approvalActionResponseSchema,
  workflowLogsResponseSchema,
  patchFinancialReportSchema,
} from "./financial-reports.types";
import { notFoundSchema } from "@/api/lib/constants";

const tags = ["financial-reports"];

export const list = createRoute({
  path: "/financial-reports",
  method: "get",
  tags,
  request: {
    query: financialReportListRequestSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      financialReportListResponseSchema,
      "Financial reports retrieved successfully"
    ),
  },
});

export const getOne = createRoute({
  path: "/financial-reports/{id}",
  method: "get",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      financialReportWithRelationsSchema,
      "Financial report retrieved successfully"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const patch = createRoute({
  path: "/financial-reports/{id}",
  method: "patch",
  tags,
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      patchFinancialReportSchema,
      "Financial report update data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      financialReportWithRelationsSchema,
      "Financial report updated successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request or report is locked"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Cannot edit locked report"
    ),
  },
});

export const remove = createRoute({
  path: "/financial-reports/{id}",
  method: "delete",
  tags,
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.NO_CONTENT]: {
      description: "Financial report deleted successfully",
    },
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const generateStatement = createRoute({
  path: "/financial-reports/generate-statement",
  method: "post",
  tags,
  summary: "Generate financial statement using template-driven approach",
  description: "Generate standardized financial statements (Revenue & Expenditure, Balance Sheet, Cash Flow, Net Assets Changes, Budget vs Actual) from planning and execution data using predefined templates",
  request: {
    body: jsonContent(
      generateStatementRequestSchema,
      "Statement generation parameters"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      generateStatementResponseSchema,
      "Financial statement generated successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        errors: z.array(z.string()).optional(),
      }),
      "Invalid request parameters"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({
        message: z.string(),
        details: z.string().optional(),
      }),
      "Template or data not found"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Statement generation failed"
    ),
  },
});

export const exportStatement = createRoute({
  path: "/financial-reports/export-statement",
  method: "post",
  tags,
  summary: "Export financial statement to various formats",
  description: "Export a generated financial statement to PDF, Excel, or CSV format with customizable formatting options",
  request: {
    body: jsonContent(
      exportStatementRequestSchema,
      "Statement export parameters"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Financial statement exported successfully",
      content: {
        'application/pdf': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
        'text/csv': {
          schema: {
            type: 'string',
          },
        },
      },
    },
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        errors: z.array(z.string()).optional(),
      }),
      "Invalid export parameters"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      z.object({
        message: z.string(),
        details: z.string().optional(),
      }),
      "Statement data not found"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Export failed"
    ),
  },
});

// ============================================================================
// APPROVAL WORKFLOW ROUTES
// ============================================================================

export const submitForApproval = createRoute({
  path: "/financial-reports/{id}/submit",
  method: "post",
  tags,
  summary: "Submit financial report for DAF approval",
  description: "Accountant submits a draft or rejected report for DAF approval. Report will be locked during approval process.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      submitForApprovalRequestSchema,
      "Submit for approval (no body required)"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report submitted successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request or report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have permission to submit this report"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const dafApprove = createRoute({
  path: "/financial-reports/{id}/daf-approve",
  method: "post",
  tags,
  summary: "DAF approves financial report",
  description: "Director of Administration and Finance approves a report pending DAF review. Report proceeds to DG approval stage.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      approvalActionRequestSchema,
      "Optional approval comment"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report approved by DAF"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request or report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DAF role"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const dafReject = createRoute({
  path: "/financial-reports/{id}/daf-reject",
  method: "post",
  tags,
  summary: "DAF rejects financial report",
  description: "Director of Administration and Finance rejects a report. Report is unlocked and returned to accountant for revision.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      rejectionActionRequestSchema,
      "Rejection comment (required)"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report rejected by DAF"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request, missing comment, or invalid report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DAF role"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const dgApprove = createRoute({
  path: "/financial-reports/{id}/dg-approve",
  method: "post",
  tags,
  summary: "DG provides final approval for financial report",
  description: "Director General provides final approval. Report is permanently locked and PDF snapshot is generated.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      approvalActionRequestSchema,
      "Optional approval comment"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report fully approved by DG"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request or report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DG role"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const dgReject = createRoute({
  path: "/financial-reports/{id}/dg-reject",
  method: "post",
  tags,
  summary: "DG rejects financial report",
  description: "Director General rejects a report. Report is unlocked and returned to accountant for revision.",
  request: {
    params: IdParamsSchema,
    body: jsonContent(
      rejectionActionRequestSchema,
      "Rejection comment (required)"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      approvalActionResponseSchema,
      "Report rejected by DG"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({
        message: z.string(),
        error: z.string().optional(),
      }),
      "Invalid request, missing comment, or invalid report state"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have DG role"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export const getWorkflowLogs = createRoute({
  path: "/financial-reports/{id}/workflow-logs",
  method: "get",
  tags,
  summary: "Get workflow logs for financial report",
  description: "Retrieves the complete approval history and audit trail for a financial report.",
  request: {
    params: IdParamsSchema,
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      workflowLogsResponseSchema,
      "Workflow logs retrieved successfully"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "User does not have access to this report"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      notFoundSchema,
      "Financial report not found"
    ),
  },
});

export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GenerateStatementRoute = typeof generateStatement;
export type ExportStatementRoute = typeof exportStatement;
export type SubmitForApprovalRoute = typeof submitForApproval;
export type DafApproveRoute = typeof dafApprove;
export type DafRejectRoute = typeof dafReject;
export type DgApproveRoute = typeof dgApprove;
export type DgRejectRoute = typeof dgReject;
export type GetWorkflowLogsRoute = typeof getWorkflowLogs;