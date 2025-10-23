#!/usr/bin/env tsx

/**
 * Phase 4: Debug Budget vs Actual Processor
 * Test the processor logic to identify where GOODS_SERVICES_PLANNING data is lost
 */

import db from "./apps/server/src/db";
import * as schema from "./apps/server/src/db/schema";
import { eq, and } from "drizzle-orm";

// Import the processor components
import { BudgetVsActualProcessor } from "./apps/server/src/api/routes/financial-reports/budget-vs-actual-processor";
import { CustomEventMapper, DEFAULT_BUDGET_VS_ACTUAL_MAPPINGS } from "./apps/server/src/api/routes/financial-reports/custom-event-mapper";
import { TemplateEngine } from "./apps/server/src/lib/statement-engine/engines/template-engine";
import { DataAggregationEngine } from "./apps/server/src/lib/statement-engine/engines/data-aggregation-engine";

async function debugBudgetVsActualProcessor() {
  console.log("=== Phase 4: Budget vs Actual Processor Debug ===\n");

  try {
    // Test parameters
    const facilityId = 20;
    const reportingPeriodId = 2;
    const projectType = 'Malaria';

    console.log(`Testing with: Facility ${facilityId}, Period ${reportingPeriodId}, Project ${projectType}\n`);

    // 1. Test Template Engine
    console.log("1. Testing Template Engine...");
    const templateEngine = new TemplateEngine(db);
    const template = await templateEngine.loadTemplate('BUDGET_VS_ACTUAL');
    
    console.log(`✅ Template loaded: ${template.statementName}`);
    console.log(`   Lines: ${template.lines.length}`);
    
    // Check for custom mappings in template
    const customMappingLines = template.lines.filter(line => 
      line.metadata && line.metadata.budgetVsActualMapping
    );
    console.log(`   Lines with custom mappings: ${customMappingLines.length}`);
    
    customMappingLines.forEach(line => {
      const mapping = line.metadata.budgetVsActualMapping;
      console.log(`   - ${line.lineCode}: Budget[${mapping.budgetEvents.join(',')}] → Actual[${mapping.actualEvents.join(',')}]`);
    });

    // 2. Test Custom Event Mapper
    console.log("\n2. Testing Custom Event Mapper...");
    const customMapper = new CustomEventMapper(DEFAULT_BUDGET_VS_ACTUAL_MAPPINGS);
    
    console.log(`   Default mappings loaded: ${DEFAULT_BUDGET_VS_ACTUAL_MAPPINGS.length}`);
    DEFAULT_BUDGET_VS_ACTUAL_MAPPINGS.forEach(mapping => {
      console.log(`   - ${mapping.lineCode}: Budget[${mapping.budgetEvents.join(',')}] → Actual[${mapping.actualEvents.join(',')}]`);
    });

    // Test if custom mapper can read template metadata
    const goodsServicesLine = template.lines.find(line => line.lineCode === 'GOODS_SERVICES');
    if (goodsServicesLine && goodsServicesLine.metadata?.budgetVsActualMapping) {
      console.log(`   ✅ GOODS_SERVICES custom mapping found in template`);
      const templateMapping = goodsServicesLine.metadata.budgetVsActualMapping;
      console.log(`      Budget Events: ${templateMapping.budgetEvents.join(', ')}`);
      console.log(`      Actual Events: ${templateMapping.actualEvents.join(', ')}`);
    } else {
      console.log(`   ❌ GOODS_SERVICES custom mapping NOT found in template`);
    }

    // 3. Test Data Aggregation Engine
    console.log("\n3. Testing Data Aggregation Engine...");
    const dataEngine = new DataAggregationEngine(db);
    
    // Get project ID
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.projectType, projectType)
    });
    
    if (!project) {
      throw new Error(`Project not found for type: ${projectType}`);
    }
    
    console.log(`   Project found: ${project.name} (ID: ${project.id})`);

    // Test data collection for planning
    const planningFilters = {
      projectId: project.id,
      facilityId: facilityId,
      reportingPeriodId: reportingPeriodId,
      projectType: projectType,
      entityTypes: ['planning' as const]
    };

    console.log(`   Testing planning data collection...`);
    const eventCodes = ['GOODS_SERVICES_PLANNING', 'GOODS_SERVICES', 'TRANSFERS_PUBLIC_ENTITIES'];
    const planningEventData = await dataEngine.collectEventData(planningFilters, eventCodes);
    
    console.log(`   Planning data collected:`);
    console.log(`     Current period records: ${planningEventData.currentPeriod.length}`);
    console.log(`     Facilities included: ${planningEventData.metadata.facilitiesIncluded.join(', ')}`);
    
    // Aggregate planning data
    const planningAggregated = await dataEngine.aggregateByEvent(planningEventData);
    console.log(`   Planning aggregation results:`);
    planningAggregated.eventTotals.forEach((amount, eventCode) => {
      console.log(`     ${eventCode}: $${amount}`);
    });

    // Test data collection for execution
    const executionFilters = {
      projectId: project.id,
      facilityId: facilityId,
      reportingPeriodId: reportingPeriodId,
      projectType: projectType,
      entityTypes: ['execution' as const]
    };

    console.log(`   Testing execution data collection...`);
    const executionEventData = await dataEngine.collectEventData(executionFilters, eventCodes);
    const executionAggregated = await dataEngine.aggregateByEvent(executionEventData);
    
    console.log(`   Execution aggregation results:`);
    executionAggregated.eventTotals.forEach((amount, eventCode) => {
      console.log(`     ${eventCode}: $${amount}`);
    });

    // 4. Test Budget vs Actual Processor
    console.log("\n4. Testing Budget vs Actual Processor...");
    const processor = new BudgetVsActualProcessor();
    
    // Get reporting period info
    const reportingPeriod = await db.query.reportingPeriods.findFirst({
      where: eq(schema.reportingPeriods.id, reportingPeriodId)
    });
    
    // Get facility info
    const facility = await db.query.facilities.findFirst({
      where: eq(schema.facilities.id, facilityId)
    });

    if (!reportingPeriod || !facility) {
      throw new Error('Reporting period or facility not found');
    }

    const periodInfo = {
      id: reportingPeriod.id,
      year: reportingPeriod.year,
      type: reportingPeriod.periodType || 'ANNUAL',
      startDate: reportingPeriod.startDate,
      endDate: reportingPeriod.endDate
    };

    const facilityInfo = {
      id: facility.id,
      name: facility.name,
      type: facility.facilityType,
      district: facility.districtId?.toString()
    };

    const options = {
      facilityId,
      reportingPeriodId,
      projectType
    };

    console.log(`   Generating Budget vs Actual statement...`);
    
    try {
      const statement = await processor.generateStatement(
        template,
        planningAggregated,
        executionAggregated,
        options,
        periodInfo,
        facilityInfo
      );

      console.log(`   ✅ Statement generated successfully!`);
      console.log(`   Statement: ${statement.statementName}`);
      console.log(`   Lines: ${statement.lines.length}`);
      
      // Check specific lines for GOODS_SERVICES_PLANNING data
      const goodsServicesStatementLine = statement.lines.find(line => 
        line.metadata.lineCode === 'GOODS_SERVICES'
      );
      
      if (goodsServicesStatementLine) {
        console.log(`   GOODS_SERVICES line found:`);
        console.log(`     Description: ${goodsServicesStatementLine.description}`);
        console.log(`     Budget: $${goodsServicesStatementLine.revisedBudget}`);
        console.log(`     Actual: $${goodsServicesStatementLine.actual}`);
        console.log(`     Variance: $${goodsServicesStatementLine.variance}`);
        
        if (goodsServicesStatementLine.revisedBudget > 0) {
          console.log(`   ✅ GOODS_SERVICES_PLANNING data IS being used!`);
        } else {
          console.log(`   ❌ GOODS_SERVICES_PLANNING data is NOT being used`);
        }
      } else {
        console.log(`   ❌ GOODS_SERVICES line not found in statement`);
      }

      // Check TRANSFERS_PUBLIC line too
      const transfersPublicLine = statement.lines.find(line => 
        line.metadata.lineCode === 'TRANSFERS_PUBLIC'
      );
      
      if (transfersPublicLine) {
        console.log(`   TRANSFERS_PUBLIC line found:`);
        console.log(`     Description: ${transfersPublicLine.description}`);
        console.log(`     Budget: $${transfersPublicLine.revisedBudget}`);
        console.log(`     Actual: $${transfersPublicLine.actual}`);
        console.log(`     Variance: $${transfersPublicLine.variance}`);
        
        if (transfersPublicLine.revisedBudget > 0) {
          console.log(`   ✅ TRANSFERS_PUBLIC GOODS_SERVICES_PLANNING data IS being used!`);
        } else {
          console.log(`   ❌ TRANSFERS_PUBLIC GOODS_SERVICES_PLANNING data is NOT being used`);
        }
      }

    } catch (processorError) {
      console.error(`   ❌ Processor failed:`, processorError);
      
      // Test individual components
      console.log(`   Testing individual processor components...`);
      
      // Test custom mapping detection
      const goodsServicesMapping = customMapper.getEventMapping('GOODS_SERVICES');
      if (goodsServicesMapping) {
        console.log(`   ✅ Custom mapping found for GOODS_SERVICES`);
        console.log(`      Budget Events: ${goodsServicesMapping.budgetEvents.join(', ')}`);
        console.log(`      Actual Events: ${goodsServicesMapping.actualEvents.join(', ')}`);
        
        // Test mapping application
        const result = customMapper.applyMapping(
          goodsServicesMapping,
          planningAggregated.eventTotals,
          executionAggregated.eventTotals
        );
        console.log(`   Mapping result: Budget=$${result.budgetAmount}, Actual=$${result.actualAmount}`);
      } else {
        console.log(`   ❌ No custom mapping found for GOODS_SERVICES`);
      }
    }

    console.log("\n=== Phase 4 Debug Complete ===");

  } catch (error) {
    console.error("❌ Phase 4 debug failed:", error);
    console.error("Stack trace:", error.stack);
  }
}

// Run debug if called directly
if (require.main === module) {
  debugBudgetVsActualProcessor()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error("Debug script failed:", error);
      process.exit(1);
    });
}

export { debugBudgetVsActualProcessor };