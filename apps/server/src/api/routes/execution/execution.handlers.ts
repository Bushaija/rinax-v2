import { eq, and, sql } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { schemaFormDataEntries, dynamicActivities, schemaActivityCategories, formSchemas, facilities, projects, reportingPeriods } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import { getUserContext, canAccessFacility, hasAdminAccess } from "@/api/lib/utils/get-user-facility";
import { buildFacilityFilter } from "@/api/lib/utils/query-filters";

import { computationService } from "@/api/lib/services/computation.service";
import { validationService } from "@/api/lib/services/validation.service";
import { aggregationService } from "@/lib/services/aggregation.service";
import { resolveExecutionContext, validateActivityCodes, buildCorrectedUIContext } from "@/lib/utils/context-resolution";
import type {
  ListRoute,
  GetOneRoute,
  CreateRoute,
  UpdateRoute,
  RemoveRoute,
  CalculateBalancesRoute,
  ValidateAccountingEquationRoute,
  QuarterlySummaryRoute,
  GetActivitiesRoute,
  GetFormSchemaRoute,
  CheckExistingRoute,
  CompiledRoute,
} from "./execution.routes";
import { BalancesResponse, executionListQuerySchema, compiledExecutionQuerySchema, type CompiledExecutionResponse, type FacilityColumn, type ActivityRow, type SectionSummary, type FacilityTotals, type AppliedFilters } from "./execution.types";
import { toBalances, parseCode, calculateCumulativeBalance } from "./execution.helpers";
import { recalculateExecutionData, validateRecalculation } from "./execution.recalculations";
import { ApprovalError, ApprovalErrorFactory, isApprovalError } from "@/lib/errors/approval.errors";
import { ExecutionErrorHandler } from "@/lib/utils/execution-error-handler";

/**
 * Helper function to validate that there's an approved plan for execution
 * @param facilityId - The facility ID
 * @param projectId - The project ID  
 * @param reportingPeriodId - The reporting period ID
 * @param logger - Logger instance for audit logging
 * @returns Promise with validation result
 * @throws ApprovalError for validation failures
 */
async function validateApprovedPlanExists(
  facilityId: number, 
  projectId: number, 
  reportingPeriodId: number,
  logger?: any
): Promise<{ allowed: boolean; reason?: string; planningId?: number }> {
  try {
    // Find the planning entry for the same facility/project/reporting period
    const planningEntry = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.facilityId, facilityId),
        eq(schemaFormDataEntries.projectId, projectId),
        eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
        eq(schemaFormDataEntries.entityType, 'planning')
      ),
    });

    if (!planningEntry) {
      logger?.warn({
        facilityId,
        projectId,
        reportingPeriodId,
        entityType: 'planning'
      }, 'No planning data found for execution validation');

      throw new ApprovalError(
        'PLAN_NOT_FOUND',
        'No planning data found for this facility, project, and reporting period',
        404,
        {
          code: 'PLAN_NOT_FOUND',
          reason: 'A plan must be created and approved before execution can proceed',
          context: {
            facilityId,
            projectId,
            reportingPeriodId,
            entityType: 'planning'
          }
        }
      );
    }

    if (planningEntry.approvalStatus !== 'APPROVED') {
      logger?.warn({
        planningId: planningEntry.id,
        currentStatus: planningEntry.approvalStatus,
        facilityId,
        projectId,
        reportingPeriodId
      }, 'Planning data not approved for execution');

      throw ApprovalErrorFactory.executionBlocked(
        planningEntry.id,
        planningEntry.approvalStatus || 'UNKNOWN',
        `Planning data has not been approved for execution. Current status: ${planningEntry.approvalStatus}. Only approved plans can proceed to execution.`
      );
    }

    logger?.info({
      planningId: planningEntry.id,
      approvalStatus: planningEntry.approvalStatus,
      facilityId,
      projectId,
      reportingPeriodId
    }, 'Planning data validation successful - execution allowed');

    return {
      allowed: true,
      planningId: planningEntry.id
    };

  } catch (error) {
    // Re-throw ApprovalErrors as-is
    if (isApprovalError(error)) {
      throw error;
    }

    // Wrap other errors in ApprovalError
    logger?.error({
      facilityId,
      projectId,
      reportingPeriodId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error validating approved plan');

    throw ApprovalErrorFactory.validationError(
      `Failed to validate plan approval: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}


export const list: AppRouteHandler<ListRoute> = async (c) => {
  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    // Parse and validate query parameters
    const query = executionListQuerySchema.parse(c.req.query());

    const {
      page,
      limit,
      facilityType,
      projectType,
      reportingPeriod,
      quarter,
      year,
      ...filters
    } = query;

    const limit_ = parseInt(limit);
    const offset = (parseInt(page) - 1) * limit_;

    // Base condition - always filter by entityType
    let whereConditions: any[] = [eq(schemaFormDataEntries.entityType, 'execution')];

    // Add district-based facility filter using buildFacilityFilter utility
    try {
      const requestedFacilityId = filters.facilityId ? parseInt(filters.facilityId) : undefined;
      const facilityFilter = buildFacilityFilter(userContext, requestedFacilityId);

      if (facilityFilter) {
        whereConditions.push(facilityFilter);
      }
    } catch (error: any) {
      // buildFacilityFilter throws error if user requests facility outside their district
      if (error.message === "Access denied: facility not in your district") {
        return c.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          message: "Access denied: facility not in your district"
        }, HttpStatusCodes.FORBIDDEN);
      }
      throw error; // Re-throw unexpected errors
    }

    // Direct ID filters (existing functionality)
    if (filters.projectId) {
      whereConditions.push(eq(schemaFormDataEntries.projectId, parseInt(filters.projectId)));
    }
    if (filters.reportingPeriodId) {
      whereConditions.push(eq(schemaFormDataEntries.reportingPeriodId, parseInt(filters.reportingPeriodId)));
    }

    // Build query with joins for filtering by type/period
    const baseQuery = db
      .select({
        entry: schemaFormDataEntries,
        facility: facilities,
        project: projects,
        reportingPeriod: reportingPeriods,
      })
      .from(schemaFormDataEntries)
      .leftJoin(facilities, eq(schemaFormDataEntries.facilityId, facilities.id))
      .leftJoin(projects, eq(schemaFormDataEntries.projectId, projects.id))
      .leftJoin(reportingPeriods, eq(schemaFormDataEntries.reportingPeriodId, reportingPeriods.id))
      .where(and(...whereConditions));

    // Execute query
    const results = await baseQuery;

    // Apply additional filters on the result set
    let filteredResults = results;

    if (facilityType) {
      filteredResults = filteredResults.filter(r =>
        r.facility?.facilityType === facilityType
      );
    }

    if (projectType) {
      filteredResults = filteredResults.filter(r =>
        r.project?.projectType === projectType
      );
    }

    if (reportingPeriod) {
      const yearFilter = parseInt(reportingPeriod);
      if (!isNaN(yearFilter)) {
        filteredResults = filteredResults.filter(r =>
          r.reportingPeriod?.year === yearFilter
        );
      }
    }

    // Additional year filter (alternative to reportingPeriod)
    if (year && !reportingPeriod) {
      const yearFilter = parseInt(year);
      if (!isNaN(yearFilter)) {
        filteredResults = filteredResults.filter(r =>
          r.reportingPeriod?.year === yearFilter
        );
      }
    }

    // Quarter filter - filter by metadata if stored there
    if (quarter) {
      filteredResults = filteredResults.filter(r => {
        const metadata = r.entry.metadata as any;
        return metadata?.quarter === quarter;
      });
    }

    // Calculate pagination after filtering
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(offset, offset + limit_);

    // Fetch full details for paginated results
    const entryIds = paginatedResults.map(r => r.entry.id);

    const data = entryIds.length > 0
      ? await db.query.schemaFormDataEntries.findMany({
        where: (entries, { inArray }) => inArray(entries.id, entryIds),
        with: {
          schema: true,
          project: true,
          facility: true,
          reportingPeriod: true,
          creator: {
            columns: { id: true, name: true, email: true }
          }
        },
        orderBy: (entries, { desc }) => [desc(entries.updatedAt)],
      })
      : [];

    const totalPages = Math.ceil(total / limit_);

    return c.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters: {
        facilityType: facilityType || undefined,
        projectType: projectType || undefined,
        reportingPeriod: reportingPeriod || year || undefined,
        quarter: quarter || undefined,
      },
    });
  } catch (error: any) {
    console.error('List execution error:', error);

    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to fetch execution data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.param();
  const executionId = parseInt(id);

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    const data = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.id, executionId),
        eq(schemaFormDataEntries.entityType, 'execution')
      ),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        }
      },
    });

    if (!data) {
      return c.json(
        { message: "Execution data not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Validate that the user can access this record's facility
    const recordFacilityId = data.facilityId;
    const hasAccess = canAccessFacility(recordFacilityId, userContext);

    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // Build UI-friendly payload
    try {
      const formData: any = (data as any).formData || {};
      const computed: any = (data as any).computedValues || {};

      // Normalize activities: support both array and object storage
      let activitiesArray: Array<any> = [];
      if (Array.isArray(formData.activities)) {
        activitiesArray = formData.activities;
      } else if (formData.activities && typeof formData.activities === 'object') {
        activitiesArray = Object.values(formData.activities);
      }

      // Build a map of existing values keyed by code (so missing items default to 0)
      const valueByCode = new Map<string, { q1: number; q2: number; q3: number; q4: number }>();
      for (const a of activitiesArray) {
        const code = a?.code as string;
        if (!code) continue;
        valueByCode.set(code, {
          q1: Number(a.q1 || 0), q2: Number(a.q2 || 0), q3: Number(a.q3 || 0), q4: Number(a.q4 || 0)
        });
      }

      // Resolve execution context using the context resolution utility
      // This ensures we use database values over potentially incorrect form data context
      const contextResolution = resolveExecutionContext(
        {
          id: data.id,
          project: data.project ? {
            projectType: data.project.projectType || ''
          } : null,
          facility: data.facility ? {
            facilityType: data.facility.facilityType || ''
          } : null,
          formData: formData
        }
      );

      const contextProjectType = contextResolution.context.projectType;
      const contextFacilityType = contextResolution.context.facilityType;

      // Load full activity catalog for this entry's program/facility to hydrate UI
      const acts = await db
        .select({
          code: dynamicActivities.code,
          name: dynamicActivities.name,
          isTotalRow: dynamicActivities.isTotalRow,
          fieldMappings: dynamicActivities.fieldMappings,
          displayOrder: dynamicActivities.displayOrder,
        })
        .from(dynamicActivities)
        .where(
          and(
            eq(dynamicActivities.projectType, contextProjectType as any),
            eq(dynamicActivities.facilityType, contextFacilityType as any),
            eq(dynamicActivities.moduleType, 'execution'),
            eq(dynamicActivities.isActive, true)
          )
        );
      const codeToName = new Map<string, string>();
      for (const a of acts) codeToName.set(a.code as unknown as string, a.name as unknown as string);

      // Validate stored activity codes against resolved context
      const activityValidation = validateActivityCodes(
        activitiesArray,
        contextResolution.context,
        data.id
      );

      // Helpers (removed unused functions)
      // Fetch sub-category labels from database instead of hardcoding
      const subCategories = await db.select({
        code: schemaActivityCategories.subCategoryCode,
        name: schemaActivityCategories.name
      })
        .from(schemaActivityCategories)
        .where(
          and(
            eq(schemaActivityCategories.moduleType, 'execution' as any),
            eq(schemaActivityCategories.projectType, contextProjectType as any),
            eq(schemaActivityCategories.facilityType, contextFacilityType as any),
            eq(schemaActivityCategories.isSubCategory, true),
            eq(schemaActivityCategories.isActive, true)
          )
        );

      const subSectionLabel: Record<string, string> = {};
      for (const sub of subCategories) {
        if (sub.code) {
          subSectionLabel[sub.code] = sub.name;
        }
      }

      // Build A, B, D, E, G from catalog, merging user-entered values
      const A_items: any[] = [];
      const B_groups: Record<string, { code: string; label: string; total: number; items: any[] }> = {};
      const D_items: any[] = [];
      const E_items: any[] = [];
      const G_items: any[] = [];

      // Helper to push an item based on catalog record
      const pushItem = (rec: any, targetArr: any[]) => {
        const code = rec.code as string;
        const label = codeToName.get(code) || code;
        const v = valueByCode.get(code) || { q1: undefined, q2: undefined, q3: undefined, q4: undefined };

        // Calculate cumulative_balance for UI display
        // Pass code and label for Section G intelligent detection
        const { section, subSection } = parseCode(code);
        const cumulativeBalance = calculateCumulativeBalance(
          v.q1, v.q2, v.q3, v.q4, section, subSection, code, label
        );

        const item = {
          code,
          label,
          q1: v.q1,
          q2: v.q2,
          q3: v.q3,
          q4: v.q4,
          total: (v.q1 || 0) + (v.q2 || 0) + (v.q3 || 0) + (v.q4 || 0),
          cumulative_balance: cumulativeBalance
        };
        targetArr.push(item);
        return item.total;
      };

      // Build A
      const aCatalog = acts
        .filter(a => (a.fieldMappings as any)?.category === 'A' && !(a.isTotalRow as any))
        .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
      for (const rec of aCatalog) pushItem(rec, A_items);

      // Build B groups by subcategory
      const bCatalog = acts
        .filter(a => (a.fieldMappings as any)?.category === 'B' && !(a.isTotalRow as any))
        .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
      for (const rec of bCatalog) {
        const sub = (rec.fieldMappings as any)?.subcategory || 'B-OTHER';
        if (!B_groups[sub]) B_groups[sub] = { code: sub, label: subSectionLabel[sub] || sub, total: 0, items: [] };
        B_groups[sub].total += pushItem(rec, B_groups[sub].items);
      }

      // Build D/E/G
      const dCatalog = acts
        .filter(a => (a.fieldMappings as any)?.category === 'D' && !(a.isTotalRow as any))
        .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
      for (const rec of dCatalog) pushItem(rec, D_items);

      const eCatalog = acts
        .filter(a => (a.fieldMappings as any)?.category === 'E' && !(a.isTotalRow as any))
        .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
      for (const rec of eCatalog) pushItem(rec, E_items);

      const gCatalog = acts
        .filter(a => (a.fieldMappings as any)?.category === 'G' && !(a.isTotalRow as any))
        .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
      for (const rec of gCatalog) pushItem(rec, G_items);

      // Calculate totals from actual items (computed values are often 0/incorrect)
      const A_total_calculated = A_items.reduce((s, x) => s + x.total, 0);
      const B_total_calculated = Object.values(B_groups).reduce((s: number, g: any) => s + g.total, 0);
      const D_total_calculated = D_items.reduce((s, x) => s + x.total, 0);
      const E_total_calculated = E_items.reduce((s, x) => s + x.total, 0);

      // Use calculated values if computed values are 0 or missing
      const A_total = (computed?.receipts?.cumulativeBalance && computed.receipts.cumulativeBalance !== 0)
        ? computed.receipts.cumulativeBalance : A_total_calculated;
      const B_total = (computed?.expenditures?.cumulativeBalance && computed.expenditures.cumulativeBalance !== 0)
        ? computed.expenditures.cumulativeBalance : B_total_calculated;
      const D_total = (computed?.financialAssets?.cumulativeBalance && computed.financialAssets.cumulativeBalance !== 0)
        ? computed.financialAssets.cumulativeBalance : D_total_calculated;
      const E_total = (computed?.financialLiabilities?.cumulativeBalance && computed.financialLiabilities.cumulativeBalance !== 0)
        ? computed.financialLiabilities.cumulativeBalance : E_total_calculated;
      const F_total = (computed?.netFinancialAssets?.cumulativeBalance && computed.netFinancialAssets.cumulativeBalance !== 0)
        ? computed.netFinancialAssets.cumulativeBalance : (D_total - E_total);

      // For G section, calculate from items but exclude the computed surplus/deficit
      const G_items_total = G_items.reduce((s, x) => s + x.total, 0);

      // Calculate surplus/deficit
      const surplus_deficit = A_total - B_total;


      // Update G_items to mark the computed surplus/deficit item
      const updatedG_items = G_items.map(item => {
        if (item.code && item.code.includes('G_3') &&
          (item.label.toLowerCase().includes('surplus') && item.label.toLowerCase().includes('deficit'))) {
          return {
            ...item,
            q1: surplus_deficit,
            q2: 0,
            q3: 0,
            q4: 0,
            total: surplus_deficit,
            isComputed: true,
            computationFormula: 'A - B'
          };
        }
        return item;
      });

      // Calculate final G total including the computed surplus/deficit
      const final_G_total = G_items_total + surplus_deficit;

      // Build corrected UI context with resolved context values
      const correctedUIContext = buildCorrectedUIContext(
        formData?.context || {},
        contextResolution.context
      );

      const ui = {
        id: data.id,
        context: correctedUIContext,
        A: { label: 'Receipts', total: A_total, items: A_items },
        B: { label: 'Expenditures', total: B_total, groups: Object.values(B_groups).sort((x: any, y: any) => x.code.localeCompare(y.code)) },
        C: { label: 'Surplus / Deficit', total: surplus_deficit },
        D: { label: 'Financial Assets', total: D_total, items: D_items },
        E: { label: 'Financial Liabilities', total: E_total, items: E_items },
        F: { label: 'Net Financial Assets (D - E)', total: F_total },
        G: { label: 'Closing Balance', total: final_G_total, items: updatedG_items },
      };

      // Prepare response with context correction metadata
      const response: any = { entry: data, ui };

      // Add metadata if there were context corrections or validation issues
      if (contextResolution.warnings.length > 0 || !activityValidation.isValid) {
        response.metadata = {
          contextWarnings: contextResolution.warnings,
          validationResults: activityValidation
        };
      }

      return c.json(response);
    } catch (e) {
      // If UI formatting fails, return the raw entry
      console.error('UI Building failed:', e);
      console.error('Error stack:', (e as any)?.stack);
      return c.json(data);
    }
  } catch (error: any) {
    console.error('GetOne execution error:', error);

    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to fetch execution data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const body = await c.req.json();

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    // Basic validation of required fields (facilityId will be validated/overridden based on user type)
    if (!body.schemaId || !body.projectId || !body.formData) {
      return c.json(
        {
          message: "Missing required fields: schemaId, projectId, formData",
          received: Object.keys(body)
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Determine the facilityId to use based on user type
    let validatedFacilityId: number;

    if (hasAdminAccess(userContext.role, userContext.permissions)) {
      // Admin users: require explicit facilityId and allow any facility
      if (!body.facilityId) {
        return c.json(
          { message: "Admin users must provide an explicit facilityId" },
          HttpStatusCodes.BAD_REQUEST
        );
      }
      validatedFacilityId = body.facilityId;
    } else if (userContext.facilityType === 'hospital') {
      // Hospital accountants: allow any facility in their district
      if (!body.facilityId) {
        return c.json(
          { message: "facilityId is required" },
          HttpStatusCodes.BAD_REQUEST
        );
      }

      // Validate that the requested facility is in the user's district
      if (!userContext.accessibleFacilityIds.includes(body.facilityId)) {
        return c.json(
          { message: "Access denied: facility not in your district" },
          HttpStatusCodes.FORBIDDEN
        );
      }

      validatedFacilityId = body.facilityId;
    } else {
      // Health center users: override facilityId with their own facility
      validatedFacilityId = userContext.facilityId;
    }

    // Extract quarter from form data for duplicate check
    const quarter = body.formData?.quarter;

    if (!quarter) {
      return c.json(
        { message: "Quarter is required in form data" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Validate that there's an approved plan before allowing execution
    try {
      const logger = c.get('logger');
      const approvalValidation = await validateApprovedPlanExists(
        validatedFacilityId,
        body.projectId,
        body.reportingPeriodId,
        logger
      );

      // Log successful validation for audit purposes
      ExecutionErrorHandler.logExecutionAttempt(
        c,
        approvalValidation.planningId!,
        true,
        undefined,
        {
          facilityId: validatedFacilityId,
          projectId: body.projectId,
          reportingPeriodId: body.reportingPeriodId,
          operation: 'create_execution'
        }
      );

    } catch (error) {
      // Handle approval validation errors
      if (isApprovalError(error)) {
        // Log blocked execution attempt
        ExecutionErrorHandler.logExecutionAttempt(
          c,
          error.planningId || 0,
          false,
          error.message,
          {
            facilityId: validatedFacilityId,
            projectId: body.projectId,
            reportingPeriodId: body.reportingPeriodId,
            operation: 'create_execution',
            errorCode: error.code
          }
        );

        const errorResponse = ExecutionErrorHandler.formatErrorResponse(error, {
          facilityId: validatedFacilityId,
          projectId: body.projectId,
          reportingPeriodId: body.reportingPeriodId,
          operation: 'create_execution'
        });

        return c.json(errorResponse, error.statusCode as any);
      }

      // Handle unexpected errors
      throw ExecutionErrorHandler.handleExecutionError(c, error, undefined, 'create_execution');
    }

    // Check if execution already exists for this facility/project/reporting period/quarter
    const existingExecution = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.facilityId, validatedFacilityId),
        eq(schemaFormDataEntries.projectId, body.projectId),
        eq(schemaFormDataEntries.entityType, 'execution'),
        eq(schemaFormDataEntries.reportingPeriodId, body.reportingPeriodId),
        sql`${schemaFormDataEntries.formData}->>'quarter' = ${quarter}`
      ),
    });

    if (existingExecution) {
      return c.json(
        {
          message: `Execution already exists for this facility, program, reporting period, and quarter (${quarter})`,
          existingExecutionId: existingExecution.id
        },
        HttpStatusCodes.CONFLICT
      );
    }

    // Check if schema exists and is for execution
    const schema = await db.query.formSchemas.findFirst({
      where: and(
        eq(formSchemas.id, body.schemaId),
        eq(formSchemas.moduleType, 'execution'), // Ensure it's an execution schema
        eq(formSchemas.isActive, true)
      ),
    });

    if (!schema) {
      return c.json(
        { message: "Execution schema not found or inactive" },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // ============================================================================
    // CRITICAL FIX: Apply recalculation to initial form data
    // ============================================================================

    // Determine context for recalculation
    const context = {
      projectType: (schema as any)?.projectType || 'HIV',
      facilityType: (schema as any)?.facilityType || 'hospital',
      year: undefined as number | undefined,
      quarter: body?.formData?.quarter as string | undefined,
    };


    // Perform complete recalculation (cumulative balances, rollups, metadata)
    const recalculated = recalculateExecutionData(body.formData, context);

    // Validate recalculation results
    const recalcValidation = validateRecalculation(recalculated);
    if (!recalcValidation.isValid) {
      console.warn('Recalculation validation warnings:', recalcValidation.errors);
      // Continue anyway, but log warnings
    }

    // Build normalized form data with recalculated values
    const normalizedFormData = {
      ...body.formData,
      version: '1.0',
      context,
      activities: recalculated.activities,  // Activities with cumulative_balance
      rollups: recalculated.rollups,        // Computed rollups (bySection, bySubSection)
    };

    // ============================================================================
    // End of recalculation fix
    // ============================================================================

    let validationResult: { isValid: boolean; errors: Array<{ field: string; message: string; code: string }>; } = { isValid: true, errors: [] };
    let balances: any = {};
    let accountingValidation: { isValid: boolean; errors: Array<{ field: string; message: string; code: string }>; } = { isValid: true, errors: [] };

    // SKIP form-level validation for execution data
    // Execution data has a nested activities structure, not flat fields
    // We use specialized validation (F = G balance check) instead
    // The validation service expects flat fields like q1_amount, q2_amount
    // but execution data has activities[code].q1, activities[code].q2, etc.

    // Note: If we need field-level validation in the future, we should:
    // 1. Create a specialized execution validation schema
    // 2. Or flatten the activities structure before validation
    // 3. Or extend the validation service to handle nested structures

    // Ensure we have valid rollups data for balance calculation
    if (!normalizedFormData.rollups || !normalizedFormData.rollups.bySubSection) {
      return c.json(
        {
          message: "Invalid form data structure",
          error: "Form data must contain valid rollups for balance calculation",
          errors: [{
            field: "formData",
            message: "Form data is missing required rollups structure for balance validation",
            code: "INVALID_FORM_DATA"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    balances = toBalances(normalizedFormData.rollups);

    // Try accounting validation if available
    try {
      if (validationService && typeof validationService.validateAccountingEquation === 'function') {
        accountingValidation = await validationService.validateAccountingEquation(balances);

        if (!accountingValidation.isValid) {
          return c.json(
            {
              message: "Accounting equation validation failed",
              errors: accountingValidation.errors
            },
            HttpStatusCodes.BAD_REQUEST
          );
        }
      }
    } catch (validationErr) {
      console.warn('Accounting validation service error:', validationErr);
    }

    // CRITICAL: Enforce F = G balance validation QUARTERLY (Net Financial Assets = Closing Balance)
    // Since execution data is entered quarterly, we validate balance at each quarter-end

    if (!balances || typeof balances !== 'object') {
      return c.json(
        {
          message: "Failed to calculate balances",
          error: "Unable to compute financial balances from form data",
          errors: [{
            field: "balances",
            message: "Balance calculation failed - cannot validate F = G equation",
            code: "BALANCE_CALCULATION_FAILED"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const tolerance = 0.01; // Allow small rounding differences
    const quarters = ['q1', 'q2', 'q3', 'q4'] as const;
    const imbalancedQuarters: Array<{ quarter: string; F: number; G: number; difference: number }> = [];

    // Validate each quarter that has data
    for (const quarter of quarters) {
      const F = balances.netFinancialAssets[quarter];
      const G = balances.closingBalance[quarter];

      // Only validate quarters that have data (not undefined/null)
      if (F !== undefined && F !== null && G !== undefined && G !== null) {
        const difference = Math.abs(F - G);

        if (difference > tolerance) {
          imbalancedQuarters.push({
            quarter: quarter.toUpperCase(),
            F: Number(F),
            G: Number(G),
            difference: Number(difference)
          });
        }
      }
    }

    // If any quarter is imbalanced, reject the submission
    if (imbalancedQuarters.length > 0) {
      return c.json(
        {
          message: "Financial statement is not balanced",
          error: "Net Financial Assets (F) must equal Closing Balance (G) for each quarter",
          details: {
            imbalancedQuarters,
            tolerance
          },
          errors: imbalancedQuarters.map(q => ({
            field: `balance_${q.quarter.toLowerCase()}`,
            message: `${q.quarter}: F (${q.F}) ≠ G (${q.G}). Difference: ${q.difference}`,
            code: "QUARTERLY_BALANCE_MISMATCH"
          }))
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Create the execution data entry with recalculated metadata
    const insertData = {
      schemaId: body.schemaId,
      entityType: 'execution',
      projectId: body.projectId,
      facilityId: validatedFacilityId, // Use validated facilityId
      reportingPeriodId: body.reportingPeriodId || null,
      formData: normalizedFormData,
      computedValues: Object.keys(balances).length > 0 ? balances : null,
      validationState: {
        isValid: validationResult.isValid,
        isBalanced: accountingValidation.isValid,
        lastValidated: new Date().toISOString()
      },
      // CRITICAL: Use recalculated metadata for tracking
      metadata: {
        ...(body.metadata || {}),
        quarter: quarter,  // Store the quarter explicitly for filtering
        ...recalculated.metadata  // Add lastQuarterReported and lastReportedAt
      },
      createdBy: userContext.userId,
      updatedBy: userContext.userId,
    };

    const [result] = await db.insert(schemaFormDataEntries)
      .values(insertData)
      .returning();

    // Fetch the created record with relations
    const created = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, result.id),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
      },
    });

    return c.json(created, HttpStatusCodes.CREATED);
  } catch (error: any) {
    console.error('Error creating execution data:', error);
    console.error('Error stack:', (error as any)?.stack);

    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      {
        message: "Failed to create execution data",
        debug: {
          error: (error as any)?.message,
          stack: (error as any)?.stack?.split('\n').slice(0, 3) // First 3 lines of stack
        }
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const update: AppRouteHandler<UpdateRoute> = async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const executionId = parseInt(id);

  const existing = await db.query.schemaFormDataEntries.findFirst({
    where: and(
      eq(schemaFormDataEntries.id, executionId),
      eq(schemaFormDataEntries.entityType, 'execution')
    ),
  });

  if (!existing) {
    return c.json(
      { message: "Execution data not found" },
      HttpStatusCodes.NOT_FOUND
    );
  }

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    // Validate that the user can access this record's facility
    const recordFacilityId = existing.facilityId;
    const hasAccess = canAccessFacility(recordFacilityId, userContext);

    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    // If facilityId is being changed, validate the new facilityId
    if (body.facilityId !== undefined && body.facilityId !== existing.facilityId) {
      if (!hasAdminAccess(userContext.role, userContext.permissions)) {
        // Non-admin users cannot change facilityId to a facility outside their district
        if (!userContext.accessibleFacilityIds.includes(body.facilityId)) {
          return c.json(
            { message: "Access denied: cannot change facility to one outside your district" },
            HttpStatusCodes.FORBIDDEN
          );
        }
      }
    }

    // Validate that there's still an approved plan for execution updates
    const facilityIdToCheck = body.facilityId !== undefined ? body.facilityId : existing.facilityId;
    const projectIdToCheck = body.projectId !== undefined ? body.projectId : existing.projectId;
    const reportingPeriodIdToCheck = body.reportingPeriodId !== undefined ? body.reportingPeriodId : existing.reportingPeriodId;

    try {
      const logger = c.get('logger');
      const approvalValidation = await validateApprovedPlanExists(
        facilityIdToCheck,
        projectIdToCheck,
        reportingPeriodIdToCheck,
        logger
      );

      // Log successful validation for audit purposes
      ExecutionErrorHandler.logExecutionAttempt(
        c,
        approvalValidation.planningId!,
        true,
        undefined,
        {
          facilityId: facilityIdToCheck,
          projectId: projectIdToCheck,
          reportingPeriodId: reportingPeriodIdToCheck,
          operation: 'update_execution',
          executionId: id
        }
      );

    } catch (error) {
      // Handle approval validation errors
      if (isApprovalError(error)) {
        // Log blocked execution attempt
        ExecutionErrorHandler.logExecutionAttempt(
          c,
          error.planningId || 0,
          false,
          error.message,
          {
            facilityId: facilityIdToCheck,
            projectId: projectIdToCheck,
            reportingPeriodId: reportingPeriodIdToCheck,
            operation: 'update_execution',
            executionId: id,
            errorCode: error.code
          }
        );

        const errorResponse = ExecutionErrorHandler.formatErrorResponse(error, {
          facilityId: facilityIdToCheck,
          projectId: projectIdToCheck,
          reportingPeriodId: reportingPeriodIdToCheck,
          operation: 'update_execution',
          executionId: id
        });

        return c.json(errorResponse, error.statusCode as any);
      }

      // Handle unexpected errors
      throw ExecutionErrorHandler.handleExecutionError(c, error, undefined, 'update_execution');
    }

    // ============================================================================
    // CRITICAL FIX: Merge form data and trigger recalculation
    // ============================================================================

    const existingFormData = existing.formData || {};
    const updateFormData = body.formData || {};

    // Step 1: Merge form data (preserves existing quarters, adds new quarters)
    const mergedFormData = {
      ...existingFormData,
      ...updateFormData,
    };

    // Step 2: Determine context for recalculation
    const context = {
      projectType: (existing as any)?.schema?.projectType || (existing as any)?.project?.projectType || 'HIV',
      facilityType: (existing as any)?.schema?.facilityType || (existing as any)?.facility?.facilityType || 'hospital',
      year: undefined as number | undefined,
      quarter: updateFormData?.quarter as string | undefined,
    };

    // Step 3: Perform complete recalculation (cumulative balances, rollups, metadata)
    const recalculated = recalculateExecutionData(mergedFormData, context);

    // Step 4: Validate recalculation results
    const recalcValidation = validateRecalculation(recalculated);
    if (!recalcValidation.isValid) {
      console.warn('Recalculation validation warnings:', recalcValidation.errors);
      // Continue anyway, but log warnings
    }

    // Step 5: Build final form data with recalculated values
    const finalFormData = {
      ...mergedFormData,
      version: '1.0',
      context,
      activities: recalculated.activities,  // Activities with updated cumulative_balance
      rollups: recalculated.rollups,        // Recomputed rollups (bySection, bySubSection)
    };

    // ============================================================================
    // End of recalculation fix
    // ============================================================================

    let validationResult: { isValid: boolean; errors: Array<{ field: string; message: string; code: string }>; } = { isValid: true, errors: [] };
    let balances: any = {};
    let accountingValidation: { isValid: boolean; errors: Array<{ field: string; message: string; code: string }>; } = { isValid: true, errors: [] };

    // SKIP form-level validation for execution data
    // Execution data has a nested activities structure, not flat fields
    // We use specialized validation (F = G balance check) instead
    // The validation service expects flat fields like q1_amount, q2_amount
    // but execution data has activities[code].q1, activities[code].q2, etc.

    // Note: If we need field-level validation in the future, we should:
    // 1. Create a specialized execution validation schema
    // 2. Or flatten the activities structure before validation
    // 3. Or extend the validation service to handle nested structures

    // CRITICAL: Always enforce F = G balance validation using our own calculation
    // Ensure we have valid rollups data for balance calculation
    if (!finalFormData.rollups || !finalFormData.rollups.bySubSection) {
      return c.json(
        {
          message: "Invalid form data structure",
          error: "Form data must contain valid rollups for balance calculation",
          errors: [{
            field: "formData",
            message: "Form data is missing required rollups structure for balance validation",
            code: "INVALID_FORM_DATA"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Calculate balances using our reliable helper function
    const calculatedBalances = toBalances(finalFormData.rollups);

    // Always use our reliable calculated balances for validation
    balances = calculatedBalances;

    // CRITICAL: Enforce F = G balance validation QUARTERLY (Net Financial Assets = Closing Balance)
    // Since execution data is entered quarterly, we validate balance at each quarter-end
    if (!balances || typeof balances !== 'object') {
      return c.json(
        {
          message: "Failed to calculate balances",
          error: "Unable to compute financial balances from form data",
          errors: [{
            field: "balances",
            message: "Balance calculation failed - cannot validate F = G equation",
            code: "BALANCE_CALCULATION_FAILED"
          }]
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const tolerance = 0.01; // Allow small rounding differences
    const quarters = ['q1', 'q2', 'q3', 'q4'] as const;
    const imbalancedQuarters: Array<{ quarter: string; F: number; G: number; difference: number }> = [];

    // Validate each quarter that has data
    for (const quarter of quarters) {
      const F = balances.netFinancialAssets[quarter];
      const G = balances.closingBalance[quarter];

      // Only validate quarters that have data (not undefined/null)
      if (F !== undefined && F !== null && G !== undefined && G !== null) {
        const difference = Math.abs(F - G);

        if (difference > tolerance) {
          imbalancedQuarters.push({
            quarter: quarter.toUpperCase(),
            F: Number(F),
            G: Number(G),
            difference: Number(difference)
          });
        }
      }
    }

    // If any quarter is imbalanced, reject the submission
    if (imbalancedQuarters.length > 0) {
      return c.json(
        {
          message: "Financial statement is not balanced",
          error: "Net Financial Assets (F) must equal Closing Balance (G) for each quarter",
          details: {
            imbalancedQuarters,
            tolerance
          },
          errors: imbalancedQuarters.map(q => ({
            field: `balance_${q.quarter.toLowerCase()}`,
            message: `${q.quarter}: F (${q.F}) ≠ G (${q.G}). Difference: ${q.difference}`,
            code: "QUARTERLY_BALANCE_MISMATCH"
          }))
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Prepare update data - merge metadata properly
    const existingMeta = (existing.metadata as any) || {};
    const incomingMeta = body.metadata || {};

    const updateData: any = {
      formData: finalFormData,  // Use recalculated form data
      computedValues: Object.keys(balances).length > 0 ? balances : existing.computedValues,
      validationState: {
        isValid: validationResult.isValid,
        isBalanced: accountingValidation.isValid,
        lastValidated: new Date().toISOString()
      },
      // CRITICAL: Merge recalculated metadata with existing metadata
      metadata: {
        ...existingMeta,
        ...incomingMeta,
        quarter: updateFormData?.quarter || existingMeta?.quarter,  // Preserve quarter for filtering
        ...recalculated.metadata  // Add lastQuarterReported and lastReportedAt
      },
      updatedBy: userContext.userId,
      updatedAt: new Date(),
    };

    // Only update other fields if explicitly provided
    if (body.schemaId !== undefined) updateData.schemaId = body.schemaId;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.facilityId !== undefined) updateData.facilityId = body.facilityId;
    if (body.reportingPeriodId !== undefined) updateData.reportingPeriodId = body.reportingPeriodId;

    await db.update(schemaFormDataEntries)
      .set(updateData)
      .where(eq(schemaFormDataEntries.id, executionId));

    // Fetch the updated record with relations
    const updated = await db.query.schemaFormDataEntries.findFirst({
      where: eq(schemaFormDataEntries.id, executionId),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        }
      },
    });

    return c.json(updated);
  } catch (error: any) {
    console.error('Error updating execution data:', error);
    console.error('Error stack:', (error as any)?.stack);

    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      {
        message: "Failed to update execution data",
        debug: {
          error: (error as any)?.message,
          stack: (error as any)?.stack?.split('\n').slice(0, 3) // First 3 lines of stack
        }
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.param();
  const executionId = parseInt(id);

  try {
    // Get user context with district information
    const userContext = await getUserContext(c);

    const existing = await db.query.schemaFormDataEntries.findFirst({
      where: and(
        eq(schemaFormDataEntries.id, executionId),
        eq(schemaFormDataEntries.entityType, 'execution')
      ),
    });

    if (!existing) {
      return c.json(
        { message: "Execution data not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    // Validate that the user can access this record's facility
    const recordFacilityId = existing.facilityId;
    const hasAccess = canAccessFacility(recordFacilityId, userContext);

    if (!hasAccess) {
      return c.json(
        { message: "Access denied: facility not in your district" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    await db.delete(schemaFormDataEntries)
      .where(eq(schemaFormDataEntries.id, executionId));

    return c.body(null, HttpStatusCodes.NO_CONTENT);
  } catch (error: any) {
    console.error('Error deleting execution data:', error);

    if (error.message === "Unauthorized") {
      return c.json(
        { message: "Authentication required" },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    if (error.message === "User not associated with a facility") {
      return c.json(
        { message: "User must be associated with a facility" },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      { message: "Failed to delete execution data" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const calculateBalances: AppRouteHandler<CalculateBalancesRoute> = async (c) => {
  const body = await c.req.json();

  try {
    const balances = await computationService.calculateExecutionBalances(
      body.data
    );

    // Validate accounting equation
    const accountingValidation = await validationService.validateAccountingEquation(
      balances
    );

    const response: BalancesResponse = {
      ...balances,
      isBalanced: accountingValidation.isValid,
      validationErrors: accountingValidation.errors,
    };

    return c.json(response);
  } catch (error) {
    return c.json(
      { message: "Failed to calculate balances" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const validateAccountingEquation: AppRouteHandler<ValidateAccountingEquationRoute> = async (c) => {
  const body = await c.req.json();

  try {
    // Calculate balances first
    const balances = await computationService.calculateExecutionBalances(
      body.data
    );

    const result = await validationService.validateAccountingEquation(
      balances,
      body.tolerance
    );

    return c.json({
      isValid: result.isValid,
      netFinancialAssets: balances.netFinancialAssets.cumulativeBalance,
      closingBalance: balances.closingBalance.cumulativeBalance,
      difference: Math.abs(balances.netFinancialAssets.cumulativeBalance - balances.closingBalance.cumulativeBalance),
      errors: result.errors,
    });
  } catch (error) {
    return c.json(
      { message: "Failed to validate accounting equation" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const quarterlySummary: AppRouteHandler<QuarterlySummaryRoute> = async (c) => {
  const query = c.req.query();

  try {
    const executionData = await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schemaFormDataEntries.entityType, 'execution'),
        eq(schemaFormDataEntries.projectId, parseInt(query.projectId)),
        eq(schemaFormDataEntries.facilityId, parseInt(query.facilityId))
      ),
      with: {
        reportingPeriod: true,
      },
    });

    // Filter by year and aggregate by quarter
    const yearData = executionData.filter(entry =>
      entry.reportingPeriod?.year === parseInt(query.year)
    );

    const quarterlyResults: Record<string, any> = {};
    let yearToDateTotals = {
      totalReceipts: 0,
      totalExpenditures: 0,
      cumulativeSurplus: 0,
      finalClosingBalance: 0,
    };

    for (const entry of yearData) {
      const balances = entry.computedValues as any;
      if (balances) {
        ['Q1', 'Q2', 'Q3', 'Q4'].forEach(quarter => {
          const quarterKey = quarter.toLowerCase();
          if (!quarterlyResults[quarter]) {
            quarterlyResults[quarter] = {
              totalReceipts: 0,
              totalExpenditures: 0,
              surplus: 0,
              netFinancialAssets: 0,
              closingBalance: 0,
              isBalanced: true,
            };
          }

          quarterlyResults[quarter].totalReceipts += balances.receipts?.[quarterKey] || 0;
          quarterlyResults[quarter].totalExpenditures += balances.expenditures?.[quarterKey] || 0;
          quarterlyResults[quarter].surplus += balances.surplus?.[quarterKey] || 0;
          quarterlyResults[quarter].netFinancialAssets += balances.netFinancialAssets?.[quarterKey] || 0;
          quarterlyResults[quarter].closingBalance += balances.closingBalance?.[quarterKey] || 0;

          // Check if balanced (within tolerance)
          const diff = Math.abs(
            quarterlyResults[quarter].netFinancialAssets -
            quarterlyResults[quarter].closingBalance
          );
          quarterlyResults[quarter].isBalanced = diff < 0.01;
        });

        // Accumulate year-to-date totals
        yearToDateTotals.totalReceipts += balances.receipts?.cumulativeBalance || 0;
        yearToDateTotals.totalExpenditures += balances.expenditures?.cumulativeBalance || 0;
        yearToDateTotals.cumulativeSurplus += balances.surplus?.cumulativeBalance || 0;
        yearToDateTotals.finalClosingBalance = balances.closingBalance?.cumulativeBalance || 0;
      }
    }

    return c.json({
      quarters: quarterlyResults,
      yearToDate: yearToDateTotals,
    });
  } catch (error) {
    return c.json(
      { message: "Failed to generate quarterly summary" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getActivities: AppRouteHandler<GetActivitiesRoute> = async (c) => {
  const { projectType, facilityType } = c.req.query();


  // Validate inputs
  const validProjectTypes = ['HIV', 'Malaria', 'TB'];
  const validFacilityTypes = ['hospital', 'health_center'];

  const finalProjectType = projectType && validProjectTypes.includes(projectType)
    ? projectType as 'HIV' | 'Malaria' | 'TB'
    : 'HIV';

  const finalFacilityType = facilityType && validFacilityTypes.includes(facilityType)
    ? facilityType as 'hospital' | 'health_center'
    : 'hospital';

  try {
    // Query execution activities with strict module filtering
    const activities = await db
      .select({
        id: dynamicActivities.id,
        name: dynamicActivities.name,
        code: dynamicActivities.code,
        activityType: dynamicActivities.activityType,
        displayOrder: dynamicActivities.displayOrder,
        isAnnualOnly: dynamicActivities.isAnnualOnly,
        isTotalRow: dynamicActivities.isTotalRow,
        categoryId: dynamicActivities.categoryId,
        categoryName: schemaActivityCategories.name,
        categoryCode: schemaActivityCategories.code,
        categoryDisplayOrder: schemaActivityCategories.displayOrder,
        fieldMappings: dynamicActivities.fieldMappings,
        isComputed: schemaActivityCategories.isComputed,
        computationFormula: schemaActivityCategories.computationFormula,
      })
      .from(dynamicActivities)
      .innerJoin(
        schemaActivityCategories,
        eq(dynamicActivities.categoryId, schemaActivityCategories.id)
      )
      .where(
        and(
          eq(dynamicActivities.projectType, finalProjectType as any),
          eq(dynamicActivities.facilityType, finalFacilityType),
          eq(dynamicActivities.moduleType, 'execution'), // Critical: execution only
          eq(dynamicActivities.isActive, true),
          eq(schemaActivityCategories.isActive, true),
          eq(schemaActivityCategories.moduleType, 'execution') // Double-check category
        )
      )
      .orderBy(
        schemaActivityCategories.displayOrder,
        dynamicActivities.displayOrder
      );


    // Verify no planning activities leaked through
    if (activities.length > 0) {
      const hasInvalidModule = activities.some(a => {
        const code = (a as any)?.code as string | undefined;
        return !!code && (code.includes('PLANNING') || !code.includes('EXEC'));
      });

      if (hasInvalidModule) {
        // Warning: Invalid activities detected in execution query
      }
    }

    // Get subcategories for B section
    const subCategories = await db.select({
      code: schemaActivityCategories.subCategoryCode,
      name: schemaActivityCategories.name,
      displayOrder: schemaActivityCategories.displayOrder
    })
      .from(schemaActivityCategories)
      .where(
        and(
          eq(schemaActivityCategories.moduleType, 'execution' as any),
          eq(schemaActivityCategories.projectType, finalProjectType as any),
          eq(schemaActivityCategories.facilityType, finalFacilityType as any),
          eq(schemaActivityCategories.isSubCategory, true),
          eq(schemaActivityCategories.isActive, true)
        )
      )
      .orderBy(schemaActivityCategories.displayOrder);

    // Build hierarchical structure
    const structure = {
      A: {
        label: 'A. Receipts',
        code: 'A',
        displayOrder: 1,
        isComputed: false,
        items: [] as any[],
      },
      B: {
        label: 'B. Expenditures',
        code: 'B',
        displayOrder: 2,
        isComputed: false,
        subCategories: {} as Record<string, any>,
      },
      C: {
        label: 'C. Surplus / Deficit',
        code: 'C',
        displayOrder: 3,
        isComputed: true,
        computationFormula: 'A - B',
      },
      D: {
        label: 'D. Financial Assets',
        code: 'D',
        displayOrder: 4,
        isComputed: false,
        items: [] as any[],
      },
      E: {
        label: 'E. Financial Liabilities',
        code: 'E',
        displayOrder: 5,
        isComputed: false,
        items: [] as any[],
      },
      F: {
        label: 'F. Net Financial Assets',
        code: 'F',
        displayOrder: 6,
        isComputed: true,
        computationFormula: 'D - E',
      },
      G: {
        label: 'G. Closing Balance',
        code: 'G',
        displayOrder: 7,
        isComputed: false,
        items: [] as any[],
      },
    };

    // Initialize B subcategories
    const bSubCategoryLabels: Record<string, string> = {
      'B-01': 'Human Resources + Bonus',
      'B-02': 'Monitoring & Evaluation',
      'B-03': 'Living Support to Clients/Target Populations',
      'B-04': 'Overheads (Use of goods & services)',
      'B-05': 'Transfer to other reporting entities',
    };

    // Initialize subcategories from database or use defaults
    for (const sub of subCategories) {
      if (sub.code && sub.code.startsWith('B-')) {
        structure.B.subCategories[sub.code] = {
          label: sub.name || bSubCategoryLabels[sub.code] || sub.code,
          code: sub.code,
          displayOrder: sub.displayOrder || parseInt(sub.code.split('-')[1]) || 0,
          items: [],
        };
      }
    }

    // Add default subcategories if not found in database
    Object.entries(bSubCategoryLabels).forEach(([code, label], index) => {
      if (!structure.B.subCategories[code]) {
        structure.B.subCategories[code] = {
          label,
          code,
          displayOrder: index + 1,
          items: [],
        };
      }
    });

    // Categorize activities
    for (const activity of activities) {
      const fieldMappings = activity.fieldMappings as any;
      const category = fieldMappings?.category || activity.categoryCode;

      // Check if this is the computed "Surplus/Deficit of the Period" item
      const isComputedSurplus = activity.name.toLowerCase().includes('surplus') &&
        activity.name.toLowerCase().includes('deficit') &&
        activity.name.toLowerCase().includes('period');

      const activityItem = {
        id: activity.id,
        name: activity.name,
        code: activity.code,
        displayOrder: activity.displayOrder,
        isTotalRow: activity.isTotalRow,
        ...(isComputedSurplus && {
          isComputed: true,
          computationFormula: 'A - B'
        })
      };

      switch (category) {
        case 'A':
          if (!activity.isTotalRow) {
            structure.A.items.push(activityItem);
          }
          break;
        case 'B':
          const subcategory = fieldMappings?.subcategory;
          if (subcategory && structure.B.subCategories[subcategory] && !activity.isTotalRow) {
            structure.B.subCategories[subcategory].items.push(activityItem);
          }
          break;
        case 'D':
          if (!activity.isTotalRow) {
            structure.D.items.push(activityItem);
          }
          break;
        case 'E':
          if (!activity.isTotalRow) {
            structure.E.items.push(activityItem);
          }
          break;
        case 'G':
          if (!activity.isTotalRow) {
            structure.G.items.push(activityItem);
          }
          break;
      }
    }

    // Sort items within each section
    structure.A.items.sort((a, b) => a.displayOrder - b.displayOrder);
    structure.D.items.sort((a, b) => a.displayOrder - b.displayOrder);
    structure.E.items.sort((a, b) => a.displayOrder - b.displayOrder);
    structure.G.items.sort((a, b) => a.displayOrder - b.displayOrder);

    // Sort subcategories and their items
    Object.values(structure.B.subCategories).forEach(sub => {
      sub.items.sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    });

    return c.json({
      data: structure,
      meta: {
        projectType: finalProjectType,
        facilityType: finalFacilityType,
        moduleType: 'execution',
        count: activities.length
      }
    });

  } catch (error: any) {
    console.error('Error in getActivities (execution):', error);
    console.error('Error stack:', (error as any)?.stack);

    return c.json(
      {
        message: "Failed to fetch execution activities",
        debug: {
          projectType: finalProjectType,
          facilityType: finalFacilityType,
          error: (error as any)?.message
        }
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const getFormSchema: AppRouteHandler<GetFormSchemaRoute> = async (c) => {
  const { projectType, facilityType } = c.req.query();

  try {
    const formSchema = await db
      .select({
        id: formSchemas.id,
        name: formSchemas.name,
        version: formSchemas.version,
        schema: formSchemas.schema,
        metadata: formSchemas.metadata
      })
      .from(formSchemas)
      .where(
        and(
          eq(formSchemas.projectType, projectType ? projectType as any : 'HIV'),
          eq(formSchemas.facilityType, facilityType ? facilityType as any : 'hospital'),
          eq(formSchemas.moduleType, 'execution'), // Key difference from planning
          eq(formSchemas.isActive, true)
        )
      )
      .limit(1);

    if (!formSchema[0]) {
      return c.json(
        { message: "Execution form schema not found" },
        HttpStatusCodes.NOT_FOUND
      );
    }

    return c.json({ data: formSchema[0] });
  } catch (error) {
    return c.json(
      { message: "Failed to fetch execution form schema" },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const checkExisting: AppRouteHandler<CheckExistingRoute> = async (c) => {
  const query = c.req.query();
  const { projectId, facilityId, reportingPeriodId, schemaId } = query;

  try {
    // Build where conditions based on provided parameters
    let whereConditions: any[] = [
      eq(schemaFormDataEntries.entityType, 'execution'),
      eq(schemaFormDataEntries.projectId, parseInt(projectId)),
      eq(schemaFormDataEntries.facilityId, parseInt(facilityId))
    ];

    // Add optional filters
    if (reportingPeriodId) {
      whereConditions.push(eq(schemaFormDataEntries.reportingPeriodId, parseInt(reportingPeriodId)));
    }

    if (schemaId) {
      whereConditions.push(eq(schemaFormDataEntries.schemaId, parseInt(schemaId)));
    }

    // Query for existing execution data
    const existingData = await db.query.schemaFormDataEntries.findFirst({
      where: and(...whereConditions),
      with: {
        schema: true,
        project: true,
        facility: true,
        reportingPeriod: true,
        creator: {
          columns: { id: true, name: true, email: true }
        }
      },
      orderBy: (entries, { desc }) => [desc(entries.updatedAt)], // Get most recent if multiple
    });

    if (existingData) {
      // Build UI-friendly payload similar to getOne handler
      try {
        const formData: any = (existingData as any).formData || {};
        const computed: any = (existingData as any).computedValues || {};

        // Normalize activities: support both array and object storage
        let activitiesArray: Array<any> = [];
        if (Array.isArray(formData.activities)) {
          activitiesArray = formData.activities;
        } else if (formData.activities && typeof formData.activities === 'object') {
          activitiesArray = Object.values(formData.activities);
        }

        // Build a map of existing values keyed by code (so missing items default to 0)
        const valueByCode = new Map<string, { q1: number; q2: number; q3: number; q4: number }>();
        for (const a of activitiesArray) {
          const code = a?.code as string;
          if (!code) continue;
          valueByCode.set(code, {
            q1: Number(a.q1 || 0), q2: Number(a.q2 || 0), q3: Number(a.q3 || 0), q4: Number(a.q4 || 0)
          });
        }

        // Resolve execution context using the context resolution utility
        // This ensures we use database values over potentially incorrect form data context
        const contextResolution = resolveExecutionContext(
          {
            id: existingData.id,
            project: existingData.project ? {
              projectType: existingData.project.projectType || ''
            } : null,
            facility: existingData.facility ? {
              facilityType: existingData.facility.facilityType || ''
            } : null,
            formData: formData
          }
        );

        const contextProjectType = contextResolution.context.projectType;
        const contextFacilityType = contextResolution.context.facilityType;

        // Load full activity catalog for this entry's program/facility to hydrate UI
        const acts = await db
          .select({
            code: dynamicActivities.code,
            name: dynamicActivities.name,
            isTotalRow: dynamicActivities.isTotalRow,
            fieldMappings: dynamicActivities.fieldMappings,
            displayOrder: dynamicActivities.displayOrder,
          })
          .from(dynamicActivities)
          .where(
            and(
              eq(dynamicActivities.projectType, contextProjectType as any),
              eq(dynamicActivities.facilityType, contextFacilityType as any),
              eq(dynamicActivities.moduleType, 'execution'),
              eq(dynamicActivities.isActive, true)
            )
          );
        const codeToName = new Map<string, string>();
        for (const a of acts) codeToName.set(a.code as unknown as string, a.name as unknown as string);

        // Validate stored activity codes against resolved context
        const activityValidation = validateActivityCodes(
          activitiesArray,
          contextResolution.context,
          existingData.id
        );

        // Fetch sub-category labels from database instead of hardcoding
        const subCategories = await db.select({
          code: schemaActivityCategories.subCategoryCode,
          name: schemaActivityCategories.name
        })
          .from(schemaActivityCategories)
          .where(
            and(
              eq(schemaActivityCategories.moduleType, 'execution' as any),
              eq(schemaActivityCategories.projectType, contextProjectType as any),
              eq(schemaActivityCategories.facilityType, contextFacilityType as any),
              eq(schemaActivityCategories.isSubCategory, true),
              eq(schemaActivityCategories.isActive, true)
            )
          );

        const subSectionLabel: Record<string, string> = {};
        for (const sub of subCategories) {
          if (sub.code) {
            subSectionLabel[sub.code] = sub.name;
          }
        }

        // Build A, B, D, E, G from catalog, merging user-entered values
        const A_items: any[] = [];
        const B_groups: Record<string, { code: string; label: string; total: number; items: any[] }> = {};
        const D_items: any[] = [];
        const E_items: any[] = [];
        const G_items: any[] = [];

        // Helper to push an item based on catalog record
        const pushItem = (rec: any, targetArr: any[]) => {
          const code = rec.code as string;
          const label = codeToName.get(code) || code;
          const v = valueByCode.get(code) || { q1: undefined, q2: undefined, q3: undefined, q4: undefined };

          // Calculate cumulative_balance for UI display
          // Pass code and label for Section G intelligent detection
          const { section, subSection } = parseCode(code);
          const cumulativeBalance = calculateCumulativeBalance(
            v.q1, v.q2, v.q3, v.q4, section, subSection, code, label
          );

          const item = {
            code,
            label,
            q1: v.q1,
            q2: v.q2,
            q3: v.q3,
            q4: v.q4,
            total: (v.q1 || 0) + (v.q2 || 0) + (v.q3 || 0) + (v.q4 || 0),
            cumulative_balance: cumulativeBalance
          };
          targetArr.push(item);
          return item.total;
        };

        // Build A
        const aCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'A' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
        for (const rec of aCatalog) pushItem(rec, A_items);

        // Build B groups by subcategory
        const bCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'B' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
        for (const rec of bCatalog) {
          const sub = (rec.fieldMappings as any)?.subcategory || 'B-OTHER';
          if (!B_groups[sub]) B_groups[sub] = { code: sub, label: subSectionLabel[sub] || sub, total: 0, items: [] };
          B_groups[sub].total += pushItem(rec, B_groups[sub].items);
        }

        // Build D/E/G
        const dCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'D' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
        for (const rec of dCatalog) pushItem(rec, D_items);

        const eCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'E' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
        for (const rec of eCatalog) pushItem(rec, E_items);

        const gCatalog = acts
          .filter(a => (a.fieldMappings as any)?.category === 'G' && !(a.isTotalRow as any))
          .sort((x: any, y: any) => (x.displayOrder || 0) - (y.displayOrder || 0));
        for (const rec of gCatalog) pushItem(rec, G_items);

        // Calculate totals from actual items (computed values are often 0/incorrect)
        const A_total_calculated = A_items.reduce((s, x) => s + x.total, 0);
        const B_total_calculated = Object.values(B_groups).reduce((s: number, g: any) => s + g.total, 0);
        const D_total_calculated = D_items.reduce((s, x) => s + x.total, 0);
        const E_total_calculated = E_items.reduce((s, x) => s + x.total, 0);

        // Use calculated values if computed values are 0 or missing
        const A_total = (computed?.receipts?.cumulativeBalance && computed.receipts.cumulativeBalance !== 0)
          ? computed.receipts.cumulativeBalance : A_total_calculated;
        const B_total = (computed?.expenditures?.cumulativeBalance && computed.expenditures.cumulativeBalance !== 0)
          ? computed.expenditures.cumulativeBalance : B_total_calculated;
        const D_total = (computed?.financialAssets?.cumulativeBalance && computed.financialAssets.cumulativeBalance !== 0)
          ? computed.financialAssets.cumulativeBalance : D_total_calculated;
        const E_total = (computed?.financialLiabilities?.cumulativeBalance && computed.financialLiabilities.cumulativeBalance !== 0)
          ? computed.financialLiabilities.cumulativeBalance : E_total_calculated;
        const F_total = (computed?.netFinancialAssets?.cumulativeBalance && computed.netFinancialAssets.cumulativeBalance !== 0)
          ? computed.netFinancialAssets.cumulativeBalance : (D_total - E_total);

        // For G section, calculate from items but exclude the computed surplus/deficit
        const G_items_total = G_items.reduce((s, x) => s + x.total, 0);

        // Calculate surplus/deficit
        const surplus_deficit = A_total - B_total;


        // Update G_items to mark the computed surplus/deficit item
        const updatedG_items = G_items.map(item => {
          if (item.code && item.code.includes('G_3') &&
            (item.label.toLowerCase().includes('surplus') && item.label.toLowerCase().includes('deficit'))) {
            return {
              ...item,
              q1: surplus_deficit,
              q2: 0,
              q3: 0,
              q4: 0,
              total: surplus_deficit,
              isComputed: true,
              computationFormula: 'A - B'
            };
          }
          return item;
        });

        // Calculate final G total including the computed surplus/deficit
        const final_G_total = G_items_total + surplus_deficit;

        // Build corrected UI context with resolved context values
        const correctedUIContext = buildCorrectedUIContext(
          formData?.context || {},
          contextResolution.context
        );

        const ui = {
          id: existingData.id,
          context: correctedUIContext,
          A: { label: 'Receipts', total: A_total, items: A_items },
          B: { label: 'Expenditures', total: B_total, groups: Object.values(B_groups).sort((x: any, y: any) => x.code.localeCompare(y.code)) },
          C: { label: 'Surplus / Deficit', total: surplus_deficit },
          D: { label: 'Financial Assets', total: D_total, items: D_items },
          E: { label: 'Financial Liabilities', total: E_total, items: E_items },
          F: { label: 'Net Financial Assets (D - E)', total: F_total },
          G: { label: 'Closing Balance', total: final_G_total, items: updatedG_items },
        };

        // Prepare response with context correction metadata
        const response: any = {
          exists: true,
          entry: existingData,
          ui,
          message: "Execution data found for the specified parameters"
        };

        // Add metadata if there were context corrections or validation issues
        if (contextResolution.warnings.length > 0 || !activityValidation.isValid) {
          response.metadata = {
            contextWarnings: contextResolution.warnings,
            validationResults: activityValidation
          };
        }

        return c.json(response);
      } catch (e) {
        // If UI formatting fails, return the raw entry similar to getOne fallback
        console.error('UI Building (checkExisting) failed:', e);
        console.error('Error stack:', (e as any)?.stack);
        return c.json({
          exists: true,
          data: existingData,
          message: "Execution data found for the specified parameters"
        });
      }
    } else {
      return c.json({
        exists: false,
        data: null,
        message: "No execution data found for the specified parameters"
      });
    }

  } catch (error: any) {
    console.error('Error checking existing execution data:', error);
    return c.json(
      {
        message: "Failed to check existing execution data",
        debug: {
          error: error?.message,
          projectId,
          facilityId,
          reportingPeriodId,
          schemaId
        }
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

export const compiled: AppRouteHandler<CompiledRoute> = async (c) => {
  try {
    // Task 3.1: Add query parameter validation and filtering
    const userContext = await getUserContext(c);
    const query = compiledExecutionQuerySchema.parse(c.req.query());

    const {
      projectType,
      facilityType,
      reportingPeriodId,
      year,
      quarter,
      districtId
    } = query;

    // Build database query conditions based on provided filters
    let whereConditions: any[] = [
      eq(schemaFormDataEntries.entityType, 'execution')
    ];

    // Add district-based facility filter using buildFacilityFilter utility
    try {
      const facilityFilter = buildFacilityFilter(userContext, undefined);

      if (facilityFilter) {
        whereConditions.push(facilityFilter);
      }
    } catch (error: any) {
      // buildFacilityFilter throws error if user requests facility outside their district
      if (error.message === "Access denied: facility not in your district") {
        return c.json({
          data: {
            facilities: [],
            activities: [],
            sections: [],
            totals: { byFacility: {}, grandTotal: 0 }
          },
          meta: {
            filters: {
              projectType,
              facilityType,
              reportingPeriodId,
              year,
              quarter,
              districtId
            },
            aggregationDate: new Date().toISOString(),
            facilityCount: 0,
            reportingPeriod: year ? year.toString() : 'All periods'
          },
          message: "Access denied: facility not in your district"
        }, HttpStatusCodes.FORBIDDEN);
      }
      throw error; // Re-throw unexpected errors
    }

    // Apply direct ID filters
    if (reportingPeriodId) {
      whereConditions.push(eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId));
    }

    // Task 3.2: Create database query logic
    // Write optimized query to fetch execution data with facility and project joins
    const baseQuery = db
      .select({
        entry: schemaFormDataEntries,
        facility: facilities,
        project: projects,
        reportingPeriod: reportingPeriods,
      })
      .from(schemaFormDataEntries)
      .leftJoin(facilities, eq(schemaFormDataEntries.facilityId, facilities.id))
      .leftJoin(projects, eq(schemaFormDataEntries.projectId, projects.id))
      .leftJoin(reportingPeriods, eq(schemaFormDataEntries.reportingPeriodId, reportingPeriods.id))
      .where(and(...whereConditions));

    // Execute query with error handling for database connection and query failures
    let results;
    try {
      results = await baseQuery;
    } catch (dbError: any) {
      console.error('Database query failed:', dbError);
      return c.json(
        {
          message: "Database query failed",
          error: "Unable to fetch execution data"
        },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Apply additional filters on the result set
    let filteredResults = results;

    // Filter by facility type
    if (facilityType) {
      filteredResults = filteredResults.filter((r: any) =>
        r.facility?.facilityType === facilityType
      );
    }

    // Filter by project type
    if (projectType) {
      filteredResults = filteredResults.filter((r: any) =>
        r.project?.projectType === projectType
      );
    }

    // Filter by year
    if (year) {
      filteredResults = filteredResults.filter((r: any) =>
        r.reportingPeriod?.year === year
      );
    }

    // Filter by quarter (stored in metadata)
    if (quarter) {
      filteredResults = filteredResults.filter((r: any) => {
        const metadata = r.entry.metadata as any;
        return metadata?.quarter === quarter;
      });
    }

    // Additional district filter validation (for admin users who may specify districtId)
    if (districtId && !hasAdminAccess(userContext.role, userContext.permissions)) {
      // Non-admin users cannot request data from other districts
      if (userContext.districtId && districtId !== userContext.districtId) {
        return c.json({
          data: {
            facilities: [],
            activities: [],
            sections: [],
            totals: { byFacility: {}, grandTotal: 0 }
          },
          meta: {
            filters: {
              projectType,
              facilityType,
              reportingPeriodId,
              year,
              quarter,
              districtId
            },
            aggregationDate: new Date().toISOString(),
            facilityCount: 0,
            reportingPeriod: year ? year.toString() : 'All periods'
          },
          message: "Access denied: cannot access data from other districts"
        }, HttpStatusCodes.FORBIDDEN);
      }
    }

    // Check if no execution data exists for given filters
    if (filteredResults.length === 0) {
      return c.json({
        data: {
          facilities: [],
          activities: [],
          sections: [],
          totals: { byFacility: {}, grandTotal: 0 }
        },
        meta: {
          filters: {
            projectType,
            facilityType,
            reportingPeriodId,
            year,
            quarter,
            districtId
          },
          aggregationDate: new Date().toISOString(),
          facilityCount: 0,
          reportingPeriod: year ? year.toString() : 'All periods'
        }
      }, HttpStatusCodes.OK);
    }


    // Transform results into ExecutionEntry format for aggregation service
    const executionData = filteredResults.map((r: any) => ({
      id: r.entry.id,
      formData: r.entry.formData,
      computedValues: r.entry.computedValues,
      facilityId: r.facility?.id || 0,
      facilityName: r.facility?.name || 'Unknown',
      facilityType: r.facility?.facilityType || 'unknown',
      projectType: r.project?.projectType || 'unknown',
      year: r.reportingPeriod?.year,
      quarter: (r.entry.metadata as any)?.quarter
    }));

    // Implement activity catalog loading with proper filtering
    const contextProjectType = projectType || executionData[0]?.projectType;
    const contextFacilityType = facilityType || executionData[0]?.facilityType;

    if (!contextProjectType || !contextFacilityType) {
      return c.json(
        {
          message: "Unable to determine project type or facility type for activity catalog",
          error: "Missing context for activity catalog loading"
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    let activityCatalog;
    try {
      // Load activity catalog with proper filtering
      const activities = await db
        .select({
          code: dynamicActivities.code,
          name: dynamicActivities.name,
          displayOrder: dynamicActivities.displayOrder,
          isTotalRow: dynamicActivities.isTotalRow,
          fieldMappings: dynamicActivities.fieldMappings,
        })
        .from(dynamicActivities)
        .leftJoin(schemaActivityCategories, eq(dynamicActivities.categoryId, schemaActivityCategories.id))
        .where(
          and(
            eq(dynamicActivities.projectType, contextProjectType as any),
            eq(dynamicActivities.facilityType, contextFacilityType as any),
            eq(dynamicActivities.moduleType, 'execution'),
            eq(dynamicActivities.isActive, true),
            eq(schemaActivityCategories.isActive, true)
          )
        );

      const categories = await db
        .select({
          id: schemaActivityCategories.id,
          code: schemaActivityCategories.code,
          name: schemaActivityCategories.name,
          subCategoryCode: schemaActivityCategories.subCategoryCode,
          isComputed: schemaActivityCategories.isComputed,
          computationFormula: schemaActivityCategories.computationFormula,
          displayOrder: schemaActivityCategories.displayOrder,
          isSubCategory: schemaActivityCategories.isSubCategory,
        })
        .from(schemaActivityCategories)
        .where(
          and(
            eq(schemaActivityCategories.moduleType, 'execution' as any),
            eq(schemaActivityCategories.projectType, contextProjectType as any),
            eq(schemaActivityCategories.facilityType, contextFacilityType as any),
            eq(schemaActivityCategories.isActive, true)
          )
        );

      // Transform to ActivityDefinition format
      activityCatalog = activities.map(activity => {
        const fieldMappings = activity.fieldMappings as any;
        const category = fieldMappings?.category || 'A';
        const subcategory = fieldMappings?.subcategory;

        const categoryInfo = categories.find(c => c.code === category);

        return {
          code: activity.code as string,
          name: activity.name as string,
          category,
          subcategory,
          displayOrder: activity.displayOrder as number,
          isSection: false,
          isSubcategory: false,
          isComputed: categoryInfo?.isComputed || false,
          computationFormula: categoryInfo?.computationFormula || undefined,
          level: subcategory ? 2 : 1
        };
      });

      // Build subcategory names mapping from database
      const subcategoryNames: Record<string, string> = {};
      categories.forEach(cat => {
        if (cat.subCategoryCode && cat.isSubCategory) {
          subcategoryNames[cat.subCategoryCode] = cat.name;
        }
      });

      // Use aggregation service to process the data
      const { cleanedData, warnings } = aggregationService.handleMissingActivityData(executionData);

      if (warnings.length > 0) {
        console.warn('Data cleaning warnings:', warnings);
      }

      // Aggregate data by activity
      const aggregatedData = aggregationService.aggregateByActivity(cleanedData, activityCatalog);

      // Calculate computed values
      const computedValues = aggregationService.calculateComputedValues(aggregatedData, activityCatalog);

      // Build hierarchical structure
      const activityRows = aggregationService.buildHierarchicalStructure(
        aggregatedData,
        computedValues,
        activityCatalog,
        subcategoryNames
      );

      // Task 3.3: Build response formatting
      // Structure aggregated data into facilities-as-columns format
      const facilityColumns: FacilityColumn[] = cleanedData.map(entry => ({
        id: entry.facilityId,
        name: entry.facilityName,
        facilityType: entry.facilityType,
        projectType: entry.projectType,
        hasData: true
      }));

      // Create activity rows with proper hierarchy and computed value indicators
      const activityRowsForResponse: ActivityRow[] = activityRows;

      // Create section summaries
      const sections: SectionSummary[] = activityRows
        .filter(row => row.isSection)
        .map(row => ({
          code: row.code,
          name: row.name,
          total: row.total,
          isComputed: row.isComputed,
          computationFormula: row.computationFormula
        }));

      // Calculate facility totals
      const facilityTotals: FacilityTotals = {
        byFacility: {},
        grandTotal: 0
      };

      facilityColumns.forEach(facility => {
        const facilityId = facility.id.toString();
        let facilityTotal = 0;

        // Sum all section totals for this facility
        sections.forEach(section => {
          const sectionRow = activityRows.find(row => row.code === section.code);
          if (sectionRow && sectionRow.values[facilityId]) {
            facilityTotal += sectionRow.values[facilityId];
          }
        });

        facilityTotals.byFacility[facilityId] = facilityTotal;
        facilityTotals.grandTotal += facilityTotal;
      });

      // Add metadata about filters, facility count, and aggregation parameters
      const appliedFilters: AppliedFilters = {
        projectType,
        facilityType,
        reportingPeriodId,
        year,
        quarter,
        districtId
      };

      const response: CompiledExecutionResponse = {
        data: {
          facilities: facilityColumns,
          activities: activityRowsForResponse,
          sections,
          totals: facilityTotals
        },
        meta: {
          filters: appliedFilters,
          aggregationDate: new Date().toISOString(),
          facilityCount: facilityColumns.length,
          reportingPeriod: year ? year.toString() : reportingPeriodId ? `Period ${reportingPeriodId}` : 'All periods'
        }
      };

      return c.json(response, HttpStatusCodes.OK);

    } catch (catalogError: any) {
      console.error('Activity catalog loading failed:', catalogError);
      return c.json(
        {
          message: "Failed to load activity catalog",
          error: "Unable to load activity definitions"
        },
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }

  } catch (error: any) {
    console.error('Error in compiled execution handler:', error);
    console.error('Error stack:', error?.stack);

    // Handle validation errors
    if (error?.name === 'ZodError') {
      return c.json(
        {
          message: "Invalid query parameters",
          errors: error.errors?.map((e: any) => ({
            field: e.path?.join('.') || 'unknown',
            message: e.message,
            code: 'VALIDATION_ERROR'
          })) || []
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    return c.json(
      {
        message: "Failed to generate compiled execution report",
        error: error?.message || "Unknown error occurred"
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};