import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from "stoker/http-status-codes"
import { db } from '@/api/db'
import * as schema from '@/api/db/schema'
import { eq, and } from 'drizzle-orm'
import type { AppRouteHandler } from "@/api/lib/types"
import { getUserContext } from '@/lib/utils/get-user-facility'
import type {
  GetAccountantFacilityOverviewRoute,
  GetAccountantTasksRoute,
} from "./dashboard.routes"

// Helper to calculate budget totals from form data
function calculateBudgetFromFormData(formData: any, entityType?: string): number {
  let total = 0;
  
  // Handle execution data structure (different from planning)
  if (entityType === 'execution' && formData.rollups && formData.rollups.bySection) {
    const bySection = formData.rollups.bySection;
    
    // Sum up all section totals
    Object.values(bySection).forEach((section: any) => {
      if (section && typeof section === 'object' && typeof section.total === 'number') {
        total += section.total;
      }
    });
  }
  
  // Handle planning data structure (activities with total_budget)
  else if (formData.activities && typeof formData.activities === 'object') {
    Object.values(formData.activities).forEach((activity: any, index: number) => {
      if (activity && typeof activity === 'object') {
        // Check for total_budget first (most common in planning)
        if (activity.total_budget && typeof activity.total_budget === 'number') {
          total += activity.total_budget;
        }
        // Fallback to other budget fields
        else if (activity.budget && typeof activity.budget === 'number') {
          total += activity.budget;
        }
        else if (activity.amount && typeof activity.amount === 'number') {
          total += activity.amount;
        }
        // For execution activities, check cumulative_balance
        else if (activity.cumulative_balance && typeof activity.cumulative_balance === 'number') {
          total += activity.cumulative_balance;
        }
        else {
          console.log('No budget field found in activity');
        }
      }
    });
  }
  
  // Handle activities as an array (fallback for different form structures)
  else if (formData.activities && Array.isArray(formData.activities)) {
    formData.activities.forEach((activity: any, index: number) => {
      if (activity && typeof activity === 'object') {
        if (activity.total_budget && typeof activity.total_budget === 'number') {
          total += activity.total_budget;
        }
        else if (activity.budget && typeof activity.budget === 'number') {
          total += activity.budget;
        }
        else if (activity.amount && typeof activity.amount === 'number') {
          total += activity.amount;
        }
        else if (activity.cumulative_balance && typeof activity.cumulative_balance === 'number') {
          total += activity.cumulative_balance;
        }
        else {
          console.log('No budget field found in activity');
        }
      }
    });
  }
  else {
    console.log('No activities or rollups found, or activities is neither object nor array');
  }
  
  return total;
}

// Get Accountant Facility Overview
export const getAccountantFacilityOverview: AppRouteHandler<GetAccountantFacilityOverviewRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    const { facilityId: queryFacilityId } = c.req.query();
    
    // Determine which facility/facilities to query
    let targetFacilityId: number;
    let facilityIds: number[];
    
    if (queryFacilityId) {
      // Validate that user has access to the requested facility
      const requestedFacilityId = parseInt(queryFacilityId);
      if (!userContext.accessibleFacilityIds.includes(requestedFacilityId)) {
        throw new HTTPException(403, { message: 'Access denied to this facility' });
      }
      targetFacilityId = requestedFacilityId;
      facilityIds = [requestedFacilityId];
    } else {
      // Use user's facility and all accessible facilities (district-based)
      targetFacilityId = userContext.facilityId;
      facilityIds = userContext.accessibleFacilityIds;
    }
    
    // Get current reporting period
    const currentPeriod = await db.query.reportingPeriods.findFirst({
      where: eq(schema.reportingPeriods.status, 'ACTIVE'),
      orderBy: (reportingPeriods, { desc }) => [desc(reportingPeriods.year)],
    });

    // Get facility details (primary facility for display)
    const facility = await db.query.facilities.findFirst({
      where: eq(schema.facilities.id, targetFacilityId),
    });

    if (!facility) {
      throw new HTTPException(404, { message: 'Facility not found' });
    }

    // Get planning and execution data for budget calculations (all accessible facilities)
    const planningData = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schema.schemaFormDataEntries.entityType, 'planning'),
        currentPeriod ? eq(schema.schemaFormDataEntries.reportingPeriodId, currentPeriod.id) : undefined
      ),
    });

    const executionData = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schema.schemaFormDataEntries.entityType, 'execution'),
        currentPeriod ? eq(schema.schemaFormDataEntries.reportingPeriodId, currentPeriod.id) : undefined
      ),
    });

    // Filter by accessible facilities
    const accessiblePlanningData = planningData.filter(p => facilityIds.includes(p.facilityId));
    const accessibleExecutionData = executionData.filter(e => facilityIds.includes(e.facilityId));
    
    // Get all projects for accessible facilities in the current reporting period
    // First, let's see what projects exist without filtering by status
    const allProjects = await db.query.projects.findMany({
      where: currentPeriod ? eq(schema.projects.reportingPeriodId, currentPeriod.id) : undefined,
    });
    
    // Now filter by status
    const projects = allProjects.filter(p => p.status === 'ACTIVE');

    // If no active projects found, but we have planning data, let's include projects that have planning data
    let finalProjects = projects;
    if (projects.length === 0 && accessiblePlanningData.length > 0) {
      const projectIdsWithPlanning = [...new Set(accessiblePlanningData.map(p => p.projectId))];

      // Try to match from allProjects if any (same reporting period)
      finalProjects = allProjects.filter(p => projectIdsWithPlanning.includes(p.id));

      // If still empty, fetch projects by IDs regardless of reporting period
      if (finalProjects.length === 0) {
        const projectsByIds = await db.query.projects.findMany({
          where: (projects, { inArray }) => inArray(projects.id, projectIdsWithPlanning)
        });
        finalProjects = projectsByIds;
      }

    }

    // Derive project IDs to report on from planning data for requested facilities
    const projectIdsWithPlanning = [...new Set(accessiblePlanningData.map(p => p.projectId))];

    // Ensure we have project definitions for those IDs (finalProjects may be empty for this period)
    let projectsForIds = finalProjects.filter(p => projectIdsWithPlanning.includes(p.id));
    if (projectsForIds.length !== projectIdsWithPlanning.length) {
      const missingIds = projectIdsWithPlanning.filter(id => !projectsForIds.some(p => p.id === id));
      if (missingIds.length > 0) {
        const fetched = await db.query.projects.findMany({
          where: (projects, { inArray }) => inArray(projects.id, missingIds)
        });
        projectsForIds = [...projectsForIds, ...fetched];
      }
    }

    const projectIdToProject = new Map(projectsForIds.map(p => [p.id, p]));

    // Calculate budget by project (using planning/execution entries for facility and project definitions for names)
    const projectBreakdown = projectIdsWithPlanning.map(projectId => {
      const project = projectIdToProject.get(projectId);
      const projectPlanning = accessiblePlanningData.filter(p => p.projectId === projectId);
      const projectExecution = accessibleExecutionData.filter(e => e.projectId === projectId);

      const allocated = projectPlanning.reduce((sum, entry) => {
        const budget = calculateBudgetFromFormData(entry.formData, 'planning');
        return sum + budget;
      }, 0);

      const spent = projectExecution.reduce((sum, entry) => {
        const budget = calculateBudgetFromFormData(entry.formData, 'execution');
        return sum + budget;
      }, 0);

      const remaining = allocated - spent;
      const utilizationPercentage = allocated > 0 ? (spent / allocated) * 100 : 0;

      return {
        projectId,
        projectName: project?.name ?? `Project ${projectId}`,
        projectCode: project?.code ?? undefined,
        allocated,
        spent,
        remaining,
        utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      };
    });

    // Calculate totals
    const budgetSummary = projectBreakdown.reduce(
      (summary, project) => ({
        totalAllocated: summary.totalAllocated + project.allocated,
        totalSpent: summary.totalSpent + project.spent,
        totalRemaining: summary.totalRemaining + project.remaining,
        utilizationPercentage: 0, // Will calculate after
      }),
      { totalAllocated: 0, totalSpent: 0, totalRemaining: 0, utilizationPercentage: 0 }
    );

    budgetSummary.utilizationPercentage = 
      budgetSummary.totalAllocated > 0 
        ? Math.round((budgetSummary.totalSpent / budgetSummary.totalAllocated) * 100 * 100) / 100
        : 0;

    return c.json({
      currentReportingPeriod: currentPeriod ? {
        id: currentPeriod.id,
        year: currentPeriod.year,
        periodType: currentPeriod.periodType || 'ANNUAL',
        startDate: new Date(currentPeriod.startDate).toISOString(),
        endDate: new Date(currentPeriod.endDate).toISOString(),
        status: currentPeriod.status || 'ACTIVE',
      } : null,
      facility: {
        id: facility.id,
        name: facility.name,
        facilityType: facility.facilityType,
      },
      budgetSummary,
      projectBreakdown,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Get facility overview error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve facility overview' });
  }
};

// Get Accountant Tasks
export const getAccountantTasks: AppRouteHandler<GetAccountantTasksRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    const { facilityId: queryFacilityId } = c.req.query();
    
    // Determine which facilities to query
    let facilityIds: number[];
    
    if (queryFacilityId) {
      // Validate that user has access to the requested facility
      const requestedFacilityId = parseInt(queryFacilityId);
      if (!userContext.accessibleFacilityIds.includes(requestedFacilityId)) {
        throw new HTTPException(403, { message: 'Access denied to this facility' });
      }
      facilityIds = [requestedFacilityId];
    } else {
      // Use all accessible facilities (district-based)
      facilityIds = userContext.accessibleFacilityIds;
    }
    
    // Get current reporting period
    const currentPeriod = await db.query.reportingPeriods.findFirst({
      where: eq(schema.reportingPeriods.status, 'ACTIVE'),
      orderBy: (reportingPeriods, { desc }) => [desc(reportingPeriods.year)],
    });

    if (!currentPeriod) {
      return c.json({
        pendingPlans: [],
        pendingExecutions: [],
        correctionsRequired: [],
        upcomingDeadlines: [],
      }, HttpStatusCodes.OK);
    }

    // Get all active projects for accessible facilities
    const projects = await db.query.projects.findMany({
      where: and(
        eq(schema.projects.reportingPeriodId, currentPeriod.id),
        eq(schema.projects.status, 'ACTIVE')
      ),
    });

    // Filter by accessible facilities
    const accessibleProjects = projects.filter(p => p.facilityId && facilityIds.includes(p.facilityId));

    // Get existing planning entries for accessible facilities
    const existingPlans = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schema.schemaFormDataEntries.entityType, 'planning'),
        eq(schema.schemaFormDataEntries.reportingPeriodId, currentPeriod.id)
      ),
    });

    const accessiblePlans = existingPlans.filter(p => facilityIds.includes(p.facilityId));

    // Get existing execution entries for accessible facilities
    const existingExecutions = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schema.schemaFormDataEntries.entityType, 'execution'),
        eq(schema.schemaFormDataEntries.reportingPeriodId, currentPeriod.id)
      ),
    });

    const accessibleExecutions = existingExecutions.filter(e => facilityIds.includes(e.facilityId));

    // Determine pending plans (projects without planning entries)
    const projectsWithPlans = new Set(accessiblePlans.map(p => p.projectId));
    const pendingPlans = accessibleProjects
      .filter(project => !projectsWithPlans.has(project.id))
      .map(project => ({
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        reportingPeriodId: currentPeriod.id,
        reportingPeriodYear: currentPeriod.year,
        deadline: new Date(currentPeriod.endDate).toISOString(),
        status: 'PENDING',
      }));

    // Determine pending executions (projects with plans but missing execution for quarters)
    // Simplified: assuming quarterly execution, need at least 4 execution entries
    const executionsByProject = accessibleExecutions.reduce((acc, exec) => {
      if (!acc[exec.projectId]) acc[exec.projectId] = [];
      acc[exec.projectId].push(exec);
      return acc;
    }, {} as Record<number, any[]>);

    const pendingExecutions = accessibleProjects
      .filter(project => projectsWithPlans.has(project.id))
      .filter(project => {
        const executions = executionsByProject[project.id] || [];
        return executions.length < 4; // Assuming 4 quarters
      })
      .map(project => {
        const executions = executionsByProject[project.id] || [];
        const completedQuarters = executions.map(e => e.metadata?.quarter).filter(Boolean);
        const nextQuarter = [1, 2, 3, 4].find(q => !completedQuarters.includes(q)) || 1;
        
        return {
          projectId: project.id,
          projectName: project.name,
          projectCode: project.code,
          reportingPeriodId: currentPeriod.id,
          reportingPeriodYear: currentPeriod.year,
          quarter: nextQuarter,
          deadline: new Date(currentPeriod.endDate).toISOString(),
          status: 'PENDING',
        };
      });

    // Get entries requiring corrections (you might have a status field for this)
    // For now, returning empty array - implement based on your validation/approval workflow
    const correctionsRequired: any[] = [];

    // Calculate upcoming deadlines
    const now = new Date();
    const endDate = new Date(currentPeriod.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const upcomingDeadlines = [{
      reportingPeriodId: currentPeriod.id,
      year: currentPeriod.year,
      periodType: currentPeriod.periodType || 'ANNUAL',
      endDate: new Date(currentPeriod.endDate).toISOString(),
      daysRemaining: Math.max(0, daysRemaining),
    }];

    return c.json({
      pendingPlans,
      pendingExecutions,
      correctionsRequired,
      upcomingDeadlines,
    }, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Get accountant tasks error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve tasks' });
  }
};
