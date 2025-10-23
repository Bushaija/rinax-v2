import { createRoute, z } from "@hono/zod-openapi"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent } from "stoker/openapi/helpers"

const tags = ["dashboard"]

const errorSchema = z.object({
  message: z.string(),
})

// Accountant Facility Overview Response
const facilityOverviewSchema = z.object({
  currentReportingPeriod: z.object({
    id: z.number(),
    year: z.number(),
    periodType: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    status: z.string(),
  }).nullable(),
  facility: z.object({
    id: z.number(),
    name: z.string(),
    facilityType: z.string(),
  }),
  budgetSummary: z.object({
    totalAllocated: z.number(),
    totalSpent: z.number(),
    totalRemaining: z.number(),
    utilizationPercentage: z.number(),
  }),
  projectBreakdown: z.array(z.object({
    projectId: z.number(),
    projectName: z.string(),
    projectCode: z.string(),
    allocated: z.number(),
    spent: z.number(),
    remaining: z.number(),
    utilizationPercentage: z.number(),
  })),
})

// Accountant Tasks Response
const tasksSchema = z.object({
  pendingPlans: z.array(z.object({
    projectId: z.number(),
    projectName: z.string(),
    projectCode: z.string(),
    reportingPeriodId: z.number(),
    reportingPeriodYear: z.number(),
    deadline: z.string().nullable(),
    status: z.string(),
  })),
  pendingExecutions: z.array(z.object({
    projectId: z.number(),
    projectName: z.string(),
    projectCode: z.string(),
    reportingPeriodId: z.number(),
    reportingPeriodYear: z.number(),
    quarter: z.number().nullable(),
    deadline: z.string().nullable(),
    status: z.string(),
  })),
  correctionsRequired: z.array(z.object({
    id: z.number(),
    entityType: z.enum(['planning', 'execution']),
    projectId: z.number(),
    projectName: z.string(),
    projectCode: z.string(),
    reportingPeriodId: z.number(),
    reportingPeriodYear: z.number(),
    quarter: z.number().nullable(),
    feedback: z.string().nullable(),
    updatedAt: z.string(),
  })),
  upcomingDeadlines: z.array(z.object({
    reportingPeriodId: z.number(),
    year: z.number(),
    periodType: z.string(),
    endDate: z.string(),
    daysRemaining: z.number(),
  })),
})

// Accountant Facility Overview Route
export const getAccountantFacilityOverview = createRoute({
  path: "/dashboard/accountant/facility-overview",
  method: "get",
  tags,
  request: {
    query: z.object({
      facilityId: z.string().optional().describe("Optional facility ID to filter data. If not provided, uses user's facility and accessible facilities based on district."),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      facilityOverviewSchema,
      "Facility overview data"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Accountant Tasks Route
export const getAccountantTasks = createRoute({
  path: "/dashboard/accountant/tasks",
  method: "get",
  tags,
  request: {
    query: z.object({
      facilityId: z.string().optional().describe("Optional facility ID to filter tasks. If not provided, shows tasks for user's facility and accessible facilities based on district."),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      tasksSchema,
      "Tasks and deadlines data"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
  },
})

// Export route types for handlers
export type GetAccountantFacilityOverviewRoute = typeof getAccountantFacilityOverview
export type GetAccountantTasksRoute = typeof getAccountantTasks
