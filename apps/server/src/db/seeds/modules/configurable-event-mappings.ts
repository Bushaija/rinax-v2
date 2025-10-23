import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql, and, isNull } from "drizzle-orm";

interface EventMappingData {
  projectType: "HIV" | "Malaria" | "TB";
  facilityType?: "hospital" | "health_center";
  activityName?: string;
  categoryCode?: string;
  eventCode: string;
  mappingType: "DIRECT" | "COMPUTED" | "AGGREGATED";
  mappingFormula?: string;
  mappingRatio?: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  metadata?: any;
}

// Define execution mappings (revenue/expense activities)
const executionEventMappings: EventMappingData[] = [
  // Revenue mappings (cross-facility)
  { projectType: 'HIV', activityName: 'Other Incomes', eventCode: 'OTHER_REVENUE', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Transfers from SPIU/RBC', eventCode: 'TRANSFERS_PUBLIC_ENTITIES', mappingType: 'DIRECT' },

  { projectType: 'Malaria', activityName: 'Other Incomes', eventCode: 'OTHER_REVENUE', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Transfers from SPIU/RBC', eventCode: 'TRANSFERS_PUBLIC_ENTITIES', mappingType: 'DIRECT' },

  { projectType: 'TB', activityName: 'Other Incomes', eventCode: 'OTHER_REVENUE', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Transfers from SPIU/RBC', eventCode: 'TRANSFERS_PUBLIC_ENTITIES', mappingType: 'DIRECT' },

  // Expenditure mappings - Transfer to RBC
  { projectType: 'HIV', activityName: 'Transfer to RBC', eventCode: 'GRANTS_TRANSFERS', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Transfer to RBC', eventCode: 'GRANTS_TRANSFERS', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Transfer to RBC', eventCode: 'GRANTS_TRANSFERS', mappingType: 'DIRECT' },

  // Asset mappings
  { projectType: 'HIV', activityName: 'Cash at bank', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Petty cash', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Receivables (VAT refund)', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Other Receivables', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },

  { projectType: 'Malaria', activityName: 'Cash at bank', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Petty cash', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Receivables (VAT refund)', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Other Receivables', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },

  { projectType: 'TB', activityName: 'Cash at bank', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Petty cash', eventCode: 'CASH_EQUIVALENTS_END', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Receivables (VAT refund)', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Other Receivables', eventCode: 'ADVANCE_PAYMENTS', mappingType: 'DIRECT' },

  // Liability mappings
  { projectType: 'HIV', activityName: 'Salaries on borrowed funds (BONUS)', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable - Maintenance & Repairs', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable - Office supplies', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Payable - Transportation fees', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'VAT refund to RBC', eventCode: 'PAYABLES', mappingType: 'DIRECT' },

  { projectType: 'Malaria', activityName: 'Salaries on borrowed funds (BONUS)', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable - Maintenance & Repairs', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable - Office supplies', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Payable - Transportation fees', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'VAT refund to RBC', eventCode: 'PAYABLES', mappingType: 'DIRECT' },

  { projectType: 'TB', activityName: 'Salaries on borrowed funds (BONUS)', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable - Maintenance & Repairs', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable - Office supplies', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Payable - Transportation fees', eventCode: 'PAYABLES', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'VAT refund to RBC', eventCode: 'PAYABLES', mappingType: 'DIRECT' },

  // Equity mappings
  { projectType: 'HIV', activityName: 'Accumulated Surplus/Deficit', eventCode: 'ACCUMULATED_SURPLUS_DEFICITS', mappingType: 'DIRECT' },
  { projectType: 'HIV', activityName: 'Prior Year Adjustment', eventCode: 'PRIOR_YEAR_ADJUSTMENTS', mappingType: 'DIRECT' },

  { projectType: 'Malaria', activityName: 'Accumulated Surplus/Deficit', eventCode: 'ACCUMULATED_SURPLUS_DEFICITS', mappingType: 'DIRECT' },
  { projectType: 'Malaria', activityName: 'Prior Year Adjustment', eventCode: 'PRIOR_YEAR_ADJUSTMENTS', mappingType: 'DIRECT' },

  { projectType: 'TB', activityName: 'Accumulated Surplus/Deficit', eventCode: 'ACCUMULATED_SURPLUS_DEFICITS', mappingType: 'DIRECT' },
  { projectType: 'TB', activityName: 'Prior Year Adjustment', eventCode: 'PRIOR_YEAR_ADJUSTMENTS', mappingType: 'DIRECT' },
];

/**
 * FIXED: Proper execution event mapping that respects activity names
 * and expands cross-facility mappings correctly
 */
export async function seedExecutionEventMappings(
  db: Database,
  projectType?: "HIV" | "Malaria" | "TB"
) {
  console.log(`🔧 FIXED: Seeding execution event mappings${projectType ? ` for ${projectType}` : ''}...`);

  try {
    // Step 1: Get event map
    const events = await db
      .select({ id: schema.events.id, code: schema.events.code })
      .from(schema.events);

    const eventMap = new Map(events.map(e => [e.code, e.id]));

    // Verify critical events exist
    const requiredEvents = ['OTHER_REVENUE', 'TRANSFERS_PUBLIC_ENTITIES', 'GRANTS_TRANSFERS',
      'GOODS_SERVICES', 'CASH_EQUIVALENTS_END', 'ADVANCE_PAYMENTS',
      'PAYABLES', 'ACCUMULATED_SURPLUS_DEFICITS', 'PRIOR_YEAR_ADJUSTMENTS'];

    const missingEvents = requiredEvents.filter(code => !eventMap.has(code));
    if (missingEvents.length > 0) {
      throw new Error(`Missing required events: ${missingEvents.join(', ')}`);
    }

    console.log(`✓ Found ${events.length} events in database`);

    // Step 2: Get all execution activities
    const activities = await db
      .select({
        id: schema.dynamicActivities.id,
        name: schema.dynamicActivities.name,
        projectType: schema.dynamicActivities.projectType,
        facilityType: schema.dynamicActivities.facilityType,
        categoryId: schema.dynamicActivities.categoryId,
        activityType: schema.dynamicActivities.activityType
      })
      .from(schema.dynamicActivities)
      .where(
        and(
          eq(schema.dynamicActivities.moduleType, 'execution'),
          projectType ? eq(schema.dynamicActivities.projectType, projectType) : sql`1=1`
        )
      );

    console.log(`✓ Found ${activities.length} execution activities`);

    // Step 3: Build activity lookup by (projectType, name)
    const activityByProjectAndName = new Map<string, typeof activities>();
    activities.forEach(activity => {
      const key = `${activity.projectType}|${activity.name}`;
      if (!activityByProjectAndName.has(key)) {
        activityByProjectAndName.set(key, []);
      }
      activityByProjectAndName.get(key)!.push(activity);
    });

    // Step 4: Process mappings with cross-facility expansion
    const mappingRows: Array<{
      eventId: number;
      activityId: number;
      categoryId: number;
      projectType: string;
      facilityType: string | null;
      mappingType: string;
      mappingFormula: string | null;
      mappingRatio: string;
      isActive: boolean;
      effectiveFrom: Date | null;
      effectiveTo: Date | null;
      metadata: any;
    }> = [];

    const filterMappings = projectType
      ? executionEventMappings.filter(m => m.projectType === projectType)
      : executionEventMappings;

    console.log(`Processing ${filterMappings.length} mapping definitions...`);

    for (const mapping of filterMappings) {
      const eventId = eventMap.get(mapping.eventCode);
      if (!eventId) {
        console.warn(`⚠ Event ${mapping.eventCode} not found, skipping`);
        continue;
      }

      const key = `${mapping.projectType}|${mapping.activityName}`;
      const matchingActivities = activityByProjectAndName.get(key) || [];

      if (matchingActivities.length === 0) {
        console.warn(`⚠ No activities found for ${key}`);
        continue;
      }

      // CRITICAL: Expand to both facility types
      for (const activity of matchingActivities) {
        mappingRows.push({
          eventId,
          activityId: activity.id,
          categoryId: activity.categoryId,
          projectType: activity.projectType!,
          facilityType: activity.facilityType,
          mappingType: mapping.mappingType,
          mappingFormula: mapping.mappingFormula || null,
          mappingRatio: mapping.mappingRatio?.toString() || '1.0000',
          isActive: true,
          effectiveFrom: mapping.effectiveFrom || null,
          effectiveTo: mapping.effectiveTo || null,
          metadata: {
            ...mapping.metadata,
            activityName: mapping.activityName,
            eventCode: mapping.eventCode,
            crossFacilityMapping: true,
            createdAt: new Date().toISOString()
          }
        });
      }
    }

    console.log(`✓ Prepared ${mappingRows.length} mappings`);

    // Step 5: Map remaining unmapped activities to GOODS_SERVICES
    const mappedActivityIds = new Set(mappingRows.map(r => r.activityId));
    const unmappedActivities = activities.filter(a =>
      !mappedActivityIds.has(a.id) &&
      a.activityType !== 'COMPUTED' && // Skip computed rows
      !a.name.includes('Total') // Skip total rows
    );

    const goodsServicesEventId = eventMap.get('GOODS_SERVICES')!;

    console.log(`✓ Mapping ${unmappedActivities.length} remaining activities to GOODS_SERVICES`);

    for (const activity of unmappedActivities) {
      mappingRows.push({
        eventId: goodsServicesEventId,
        activityId: activity.id,
        categoryId: activity.categoryId,
        projectType: activity.projectType!,
        facilityType: activity.facilityType,
        mappingType: 'DIRECT',
        mappingFormula: null,
        mappingRatio: '1.0000',
        isActive: true,
        effectiveFrom: null,
        effectiveTo: null,
        metadata: {
          autoGenerated: true,
          fallbackMapping: true,
          activityName: activity.name,
          createdAt: new Date().toISOString()
        }
      });
    }

    // Step 6: Insert with conflict handling
    console.log(`Inserting ${mappingRows.length} total mappings...`);

    const result = await db
      .insert(schema.configurableEventMappings)
      .values(mappingRows as any)
      .onConflictDoUpdate({
        target: [
          schema.configurableEventMappings.eventId,
          schema.configurableEventMappings.activityId,
          schema.configurableEventMappings.categoryId,
          schema.configurableEventMappings.projectType,
          schema.configurableEventMappings.facilityType
        ],
        set: {
          mappingType: sql`EXCLUDED.mapping_type`,
          mappingFormula: sql`EXCLUDED.mapping_formula`,
          mappingRatio: sql`EXCLUDED.mapping_ratio`,
          metadata: sql`EXCLUDED.metadata`,
          updatedAt: sql`CURRENT_TIMESTAMP`
        }
      })
      .returning({ id: schema.configurableEventMappings.id });

    console.log(`✓ Successfully inserted/updated ${result.length} mappings`);

    // Step 7: Verification
    const verification = await db.execute(sql`
      SELECT 
        e.code as event_code,
        COUNT(cem.id)::int as mapping_count
      FROM events e
      LEFT JOIN configurable_event_mappings cem ON e.id = cem.event_id
        AND cem.is_active = true
        AND EXISTS (
          SELECT 1 FROM dynamic_activities da 
          WHERE da.id = cem.activity_id 
          AND da.module_type = 'execution'
          ${projectType ? sql`AND da.project_type = ${projectType}` : sql``}
        )
      WHERE e.code IN ('OTHER_REVENUE', 'TRANSFERS_PUBLIC_ENTITIES', 'GRANTS_TRANSFERS', 'GOODS_SERVICES')
      GROUP BY e.code
      ORDER BY e.code
    `);

    console.log('\n📊 Verification Results:');
    (verification as any[]).forEach(row => {
      const status = row.mapping_count > 0 ? '✓' : '✗';
      console.log(`  ${status} ${row.event_code}: ${row.mapping_count} mappings`);
    });

    return {
      success: true,
      totalMappings: result.length,
      verification: verification as any[]
    };

  } catch (error) {
    console.error('❌ Error seeding execution event mappings:', error);
    throw error;
  }
}

export default seedExecutionEventMappings;