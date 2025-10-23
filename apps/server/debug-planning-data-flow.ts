/**
 * Debug script to trace why GOODS_SERVICES_PLANNING data is missing from budget column
 * This script follows the exact data flow from database to budget vs actual processor
 */

import { Database } from "@/db";
import { 
  events, 
  configurableEventMappings, 
  schemaFormDataEntries,
  dynamicActivities
} from "./src/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// Test parameters (matching the API request)
const TEST_PARAMS = {
  facilityId: 20,
  reportingPeriodId: 2,
  projectType: "Malaria",
  projectId: 1, // Assuming Malaria project ID is 1
  entityTypes: ['planning'] as const
};

async function debugPlanningDataFlow() {
  console.log("🔍 DEBUGGING PLANNING DATA FLOW FOR GOODS_SERVICES_PLANNING");
  console.log("=" .repeat(80));
  
  const db = new Database();
  
  // Step 1: Verify GOODS_SERVICES_PLANNING event exists
  console.log("\n📋 STEP 1: Verify GOODS_SERVICES_PLANNING event exists");
  const goodsServicesEvent = await db.query.events.findFirst({
    where: eq(events.code, 'GOODS_SERVICES_PLANNING')
  });
  
  if (!goodsServicesEvent) {
    console.log("❌ GOODS_SERVICES_PLANNING event not found!");
    return;
  }
  
  console.log("✅ GOODS_SERVICES_PLANNING event found:", {
    id: goodsServicesEvent.id,
    code: goodsServicesEvent.code,
    name: goodsServicesEvent.name
  });
  
  // Step 2: Check planning activities mapped to GOODS_SERVICES_PLANNING
  console.log("\n📋 STEP 2: Check planning activities mapped to GOODS_SERVICES_PLANNING");
  const planningMappings = await db
    .select({
      activityId: configurableEventMappings.activityId,
      eventId: configurableEventMappings.eventId,
      eventCode: events.code,
      activityName: dynamicActivities.name,
      activityCode: dynamicActivities.code,
      projectType: dynamicActivities.projectType,
      moduleType: dynamicActivities.moduleType
    })
    .from(configurableEventMappings)
    .innerJoin(events, eq(configurableEventMappings.eventId, events.id))
    .innerJoin(dynamicActivities, eq(configurableEventMappings.activityId, dynamicActivities.id))
    .where(and(
      eq(events.code, 'GOODS_SERVICES_PLANNING'),
      eq(configurableEventMappings.isActive, true),
      eq(dynamicActivities.projectType, TEST_PARAMS.projectType),
      eq(dynamicActivities.moduleType, 'planning')
    ));
  
  console.log(`✅ Found ${planningMappings.length} planning activities mapped to GOODS_SERVICES_PLANNING:`);
  planningMappings.forEach((mapping, index) => {
    console.log(`  ${index + 1}. Activity ID ${mapping.activityId}: ${mapping.activityName} (${mapping.activityCode})`);
  });
  
  if (planningMappings.length === 0) {
    console.log("❌ No planning activities mapped to GOODS_SERVICES_PLANNING!");
    return;
  }
  
  // Step 3: Check planning data in schema_form_data_entries
  console.log("\n📋 STEP 3: Check planning data in schema_form_data_entries");
  const activityIds = planningMappings.map(m => m.activityId);
  
  const planningDataQuery = db
    .select({
      id: schemaFormDataEntries.id,
      entityId: schemaFormDataEntries.entityId,
      facilityId: schemaFormDataEntries.facilityId,
      projectId: schemaFormDataEntries.projectId,
      reportingPeriodId: schemaFormDataEntries.reportingPeriodId,
      entityType: schemaFormDataEntries.entityType,
      formData: schemaFormDataEntries.formData,
      amount: sql<number>`COALESCE(CAST(form_data->>'amount' AS NUMERIC), 0)`
    })
    .from(schemaFormDataEntries)
    .where(and(
      eq(schemaFormDataEntries.facilityId, TEST_PARAMS.facilityId),
      eq(schemaFormDataEntries.reportingPeriodId, TEST_PARAMS.reportingPeriodId),
      eq(schemaFormDataEntries.projectId, TEST_PARAMS.projectId),
      eq(schemaFormDataEntries.entityType, 'planning'),
      inArray(schemaFormDataEntries.entityId, activityIds)
    ));
  
  const planningDataEntries = await planningDataQuery;
  
  console.log(`✅ Found ${planningDataEntries.length} planning data entries:`);
  let totalPlanningAmount = 0;
  planningDataEntries.forEach((entry, index) => {
    console.log(`  ${index + 1}. Entry ID ${entry.id}: Activity ${entry.entityId}, Amount: $${entry.amount}`);
    totalPlanningAmount += entry.amount;
  });
  console.log(`📊 Total planning amount: $${totalPlanningAmount}`);
  
  if (planningDataEntries.length === 0) {
    console.log("❌ No planning data found for the specified parameters!");
    
    // Debug: Check what planning data exists for this facility/period
    console.log("\n🔍 DEBUG: Checking all planning data for facility 20, period 2:");
    const allPlanningData = await db
      .select({
        entityId: schemaFormDataEntries.entityId,
        entityType: schemaFormDataEntries.entityType,
        amount: sql<number>`COALESCE(CAST(form_data->>'amount' AS NUMERIC), 0)`
      })
      .from(schemaFormDataEntries)
      .where(and(
        eq(schemaFormDataEntries.facilityId, TEST_PARAMS.facilityId),
        eq(schemaFormDataEntries.reportingPeriodId, TEST_PARAMS.reportingPeriodId),
        eq(schemaFormDataEntries.entityType, 'planning')
      ));
    
    console.log(`Found ${allPlanningData.length} total planning entries for facility 20, period 2:`);
    allPlanningData.forEach((entry, index) => {
      console.log(`  ${index + 1}. Entity ID ${entry.entityId}, Type: ${entry.entityType}, Amount: $${entry.amount}`);
    });
    
    return;
  }
  
  // Step 4: Simulate the data aggregation engine collection
  console.log("\n📋 STEP 4: Simulate data aggregation engine collection");
  
  // This simulates the collectTraditionalData method
  const aggregationQuery = db
    .select({
      eventCode: events.code,
      facilityId: schemaFormDataEntries.facilityId,
      amount: sql<number>`COALESCE(CAST(form_data->>'amount' AS NUMERIC), 0)`,
      entityType: schemaFormDataEntries.entityType,
      reportingPeriodId: schemaFormDataEntries.reportingPeriodId
    })
    .from(schemaFormDataEntries)
    .innerJoin(configurableEventMappings, 
      eq(schemaFormDataEntries.entityId, configurableEventMappings.activityId))
    .innerJoin(events, 
      eq(configurableEventMappings.eventId, events.id))
    .where(and(
      eq(schemaFormDataEntries.projectId, TEST_PARAMS.projectId),
      eq(schemaFormDataEntries.facilityId, TEST_PARAMS.facilityId),
      eq(schemaFormDataEntries.reportingPeriodId, TEST_PARAMS.reportingPeriodId),
      inArray(schemaFormDataEntries.entityType, TEST_PARAMS.entityTypes),
      eq(events.code, 'GOODS_SERVICES_PLANNING'),
      sql`${schemaFormDataEntries.entityId} IS NOT NULL` // Only traditional data
    ));
  
  const aggregationResults = await aggregationQuery;
  
  console.log(`✅ Aggregation query returned ${aggregationResults.length} results:`);
  let totalAggregatedAmount = 0;
  aggregationResults.forEach((result, index) => {
    console.log(`  ${index + 1}. Event: ${result.eventCode}, Facility: ${result.facilityId}, Amount: $${result.amount}`);
    totalAggregatedAmount += result.amount;
  });
  console.log(`📊 Total aggregated amount for GOODS_SERVICES_PLANNING: $${totalAggregatedAmount}`);
  
  if (aggregationResults.length === 0) {
    console.log("❌ CRITICAL: Aggregation query returned no results!");
    console.log("🔍 This is likely where the data is being lost!");
    
    // Debug the aggregation query step by step
    console.log("\n🔍 DEBUG: Breaking down the aggregation query:");
    
    // Check schema_form_data_entries alone
    const step1 = await db
      .select({
        id: schemaFormDataEntries.id,
        entityId: schemaFormDataEntries.entityId,
        entityType: schemaFormDataEntries.entityType
      })
      .from(schemaFormDataEntries)
      .where(and(
        eq(schemaFormDataEntries.projectId, TEST_PARAMS.projectId),
        eq(schemaFormDataEntries.facilityId, TEST_PARAMS.facilityId),
        eq(schemaFormDataEntries.reportingPeriodId, TEST_PARAMS.reportingPeriodId),
        inArray(schemaFormDataEntries.entityType, TEST_PARAMS.entityTypes)
      ));
    
    console.log(`Step 1 - schema_form_data_entries: ${step1.length} entries`);
    
    // Check the join with configurable_event_mappings
    const step2 = await db
      .select({
        entryId: schemaFormDataEntries.id,
        entityId: schemaFormDataEntries.entityId,
        activityId: configurableEventMappings.activityId,
        eventId: configurableEventMappings.eventId
      })
      .from(schemaFormDataEntries)
      .innerJoin(configurableEventMappings, 
        eq(schemaFormDataEntries.entityId, configurableEventMappings.activityId))
      .where(and(
        eq(schemaFormDataEntries.projectId, TEST_PARAMS.projectId),
        eq(schemaFormDataEntries.facilityId, TEST_PARAMS.facilityId),
        eq(schemaFormDataEntries.reportingPeriodId, TEST_PARAMS.reportingPeriodId),
        inArray(schemaFormDataEntries.entityType, TEST_PARAMS.entityTypes)
      ));
    
    console.log(`Step 2 - after configurable_event_mappings join: ${step2.length} entries`);
    
    // Check the final join with events
    const step3 = await db
      .select({
        entryId: schemaFormDataEntries.id,
        entityId: schemaFormDataEntries.entityId,
        eventCode: events.code,
        eventId: events.id
      })
      .from(schemaFormDataEntries)
      .innerJoin(configurableEventMappings, 
        eq(schemaFormDataEntries.entityId, configurableEventMappings.activityId))
      .innerJoin(events, 
        eq(configurableEventMappings.eventId, events.id))
      .where(and(
        eq(schemaFormDataEntries.projectId, TEST_PARAMS.projectId),
        eq(schemaFormDataEntries.facilityId, TEST_PARAMS.facilityId),
        eq(schemaFormDataEntries.reportingPeriodId, TEST_PARAMS.reportingPeriodId),
        inArray(schemaFormDataEntries.entityType, TEST_PARAMS.entityTypes)
      ));
    
    console.log(`Step 3 - after events join: ${step3.length} entries`);
    step3.forEach((entry, index) => {
      console.log(`  ${index + 1}. Entry ${entry.entryId}, Entity ${entry.entityId}, Event: ${entry.eventCode}`);
    });
    
    return;
  }
  
  // Step 5: Check how this data flows to the budget vs actual processor
  console.log("\n📋 STEP 5: Check budget vs actual processor mapping");
  
  // Simulate the custom event mapper
  const customMapping = {
    lineCode: 'GOODS_SERVICES',
    budgetEvents: ['GOODS_SERVICES_PLANNING'],
    actualEvents: ['GOODS_SERVICES']
  };
  
  console.log("✅ Custom mapping for GOODS_SERVICES line:");
  console.log(`  Budget events: ${customMapping.budgetEvents.join(', ')}`);
  console.log(`  Actual events: ${customMapping.actualEvents.join(', ')}`);
  
  // Simulate the planning data map that would be passed to the processor
  const planningDataMap = new Map<string, number>();
  aggregationResults.forEach(result => {
    const currentAmount = planningDataMap.get(result.eventCode) || 0;
    planningDataMap.set(result.eventCode, currentAmount + result.amount);
  });
  
  console.log("\n📊 Planning data map that would be passed to processor:");
  for (const [eventCode, amount] of planningDataMap.entries()) {
    console.log(`  ${eventCode}: $${amount}`);
  }
  
  // Simulate the budget amount calculation
  const budgetAmount = customMapping.budgetEvents.reduce((sum, eventCode) => {
    const amount = planningDataMap.get(eventCode) || 0;
    console.log(`  Adding ${eventCode}: $${amount}`);
    return sum + amount;
  }, 0);
  
  console.log(`\n📊 Final budget amount for GOODS_SERVICES line: $${budgetAmount}`);
  
  if (budgetAmount === 0) {
    console.log("❌ CRITICAL: Budget amount is 0 despite having planning data!");
    console.log("🔍 The issue is in the data flow between aggregation and processor!");
  } else {
    console.log("✅ Budget amount calculation looks correct!");
    console.log("🔍 The issue might be elsewhere in the processor or API response generation!");
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("🎯 DEBUGGING COMPLETE");
}

// Run the debug function
debugPlanningDataFlow().catch(console.error);