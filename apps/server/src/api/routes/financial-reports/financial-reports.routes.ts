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

export type ListRoute = typeof list;
export type GetOneRoute = typeof getOne;
export type RemoveRoute = typeof remove;
export type GenerateStatementRoute = typeof generateStatement;
export type ExportStatementRoute = typeof exportStatement;