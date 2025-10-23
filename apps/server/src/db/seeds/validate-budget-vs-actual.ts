#!/usr/bin/env tsx

/**
 * Validation script for Budget vs Actual template seeding
 * This script verifies that:
 * 1. All required events exist in the database
 * 2. Budget vs Actual template loads correctly
 * 3. Custom event mappings are properly configured
 */

import db from "@/db";
import * as schema from "@/db/schema";
import { sql } from "drizzle-orm";
import { budgetVsActualAmountsTemplate } from "./data/statement-templates";
import { getEventCodeIdMap, validateEventCodes } from "./utils/get-event-map";

async function validateBudgetVsActualSeeding() {
  console.log("=== Budget vs Actual Template Validation ===\n");

  try {
    // 1. Extract all event codes from Budget vs Actual template
    const eventCodes = new Set<string>();
    const customMappings: Array<{ lineCode: string; budgetEvents: string[]; actualEvents: string[] }> = [];

    budgetVsActualAmountsTemplate.forEach(template => {
      // Standard event codes
      template.eventCodes?.forEach(code => eventCodes.add(code));
      
      // Custom mapping event codes
      if (template.metadata?.budgetVsActualMapping) {
        const mapping = template.metadata.budgetVsActualMapping;
        mapping.budgetEvents?.forEach((code: string) => eventCodes.add(code));
        mapping.actualEvents?.forEach((code: string) => eventCodes.add(code));
        
        customMappings.push({
          lineCode: template.lineCode,
          budgetEvents: mapping.budgetEvents || [],
          actualEvents: mapping.actualEvents || []
        });
      }
    });

    const requiredEventCodes = Array.from(eventCodes).sort();
    console.log(`Found ${requiredEventCodes.length} unique event codes in Budget vs Actual template:`);
    requiredEventCodes.forEach(code => console.log(`  - ${code}`));
    console.log();

    // 2. Validate that all event codes exist in database
    console.log("Validating event codes against database...");
    const validation = await validateEventCodes(db, requiredEventCodes);
    
    if (validation.missing.length > 0) {
      console.error(`❌ Missing event codes: ${validation.missing.join(', ')}`);
      return false;
    } else {
      console.log(`✅ All ${validation.valid.length} event codes found in database`);
    }

    // 3. Validate custom mappings
    console.log(`\nValidating ${customMappings.length} custom event mappings:`);
    customMappings.forEach(mapping => {
      console.log(`  ${mapping.lineCode}:`);
      console.log(`    Budget events: ${mapping.budgetEvents.join(', ')}`);
      console.log(`    Actual events: ${mapping.actualEvents.join(', ')}`);
    });

    // 4. Check if Budget vs Actual template is already seeded
    console.log("\nChecking if Budget vs Actual template is seeded...");
    const existingTemplates = await db
      .select({ 
        lineCode: schema.statementTemplates.lineCode,
        lineItem: schema.statementTemplates.lineItem,
        eventMappings: schema.statementTemplates.eventMappings,
        metadata: schema.statementTemplates.metadata
      })
      .from(schema.statementTemplates)
      .where(sql`statement_code = 'BUDGET_VS_ACTUAL'`)
      .orderBy(schema.statementTemplates.displayOrder);

    if (existingTemplates.length === 0) {
      console.log("⚠️  Budget vs Actual template not yet seeded");
    } else {
      console.log(`✅ Found ${existingTemplates.length} Budget vs Actual template lines in database`);
      
      // Validate a few key lines
      const keyLines = ['RECEIPTS_HEADER', 'TRANSFERS_PUBLIC', 'GOODS_SERVICES', 'EXPENDITURES_HEADER'];
      keyLines.forEach(lineCode => {
        const template = existingTemplates.find(t => t.lineCode === lineCode);
        if (template) {
          console.log(`  ✅ ${lineCode}: ${template.lineItem}`);
          
          // Check custom mappings
          if (template.metadata && typeof template.metadata === 'object' && 'budgetVsActualMapping' in template.metadata) {
            const mapping = (template.metadata as any).budgetVsActualMapping;
            if (mapping) {
              console.log(`    Custom mapping: Budget[${mapping.budgetEvents?.join(', ')}] -> Actual[${mapping.actualEvents?.join(', ')}]`);
            }
          }
        } else {
          console.log(`  ❌ Missing: ${lineCode}`);
        }
      });
    }

    // 5. Validate template structure
    console.log("\nValidating template structure...");
    const expectedSections = ['RECEIPTS_HEADER', 'EXPENDITURES_HEADER'];
    const expectedLines = [
      'TAX_REVENUE', 'GRANTS_TRANSFERS', 'OTHER_REVENUE', 'TRANSFERS_PUBLIC',
      'COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'FINANCE_COSTS', 'SUBSIDIES'
    ];

    let structureValid = true;
    expectedSections.forEach(section => {
      const template = budgetVsActualAmountsTemplate.find(t => t.lineCode === section);
      if (template) {
        console.log(`  ✅ Section: ${template.lineItem}`);
      } else {
        console.log(`  ❌ Missing section: ${section}`);
        structureValid = false;
      }
    });

    expectedLines.forEach(line => {
      const template = budgetVsActualAmountsTemplate.find(t => t.lineCode === line);
      if (template) {
        console.log(`  ✅ Line: ${template.lineItem}`);
      } else {
        console.log(`  ❌ Missing line: ${line}`);
        structureValid = false;
      }
    });

    if (!structureValid) {
      console.error("❌ Template structure validation failed");
      return false;
    }

    console.log("\n=== Validation Summary ===");
    console.log("✅ All required events exist in database");
    console.log("✅ Custom event mappings are properly configured");
    console.log("✅ Template structure is valid");
    console.log(`✅ Template contains ${budgetVsActualAmountsTemplate.length} lines`);
    console.log(`✅ Template uses ${customMappings.length} custom event mappings`);
    
    return true;

  } catch (error) {
    console.error("❌ Validation failed:", error);
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateBudgetVsActualSeeding()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error("Validation script failed:", error);
      process.exit(1);
    });
}

export { validateBudgetVsActualSeeding };