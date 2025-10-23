import type { Database } from "@/db";
import * as schema from "@/db/schema";
import { getEventCodeIdMap } from "./utils/get-event-map";
import { assetsAndLiabilitiesTemplates, changeInNetAssetsTemplate, cashFlowTemplates, revenueExpenditureTemplates, TemplateLine, budgetVsActualAmountsTemplate } from "./data/statement-templates";
import { sql } from "drizzle-orm";
import { SeedManager } from "./utils/seed-manager";

interface StatementSeed {
  statementCode: string;
  statementName: string;
  templates: TemplateLine[];
}

const statements: StatementSeed[] = [
  {
    statementCode: "REV_EXP",
    statementName: "Statement of Revenue and Expenditure",
    templates: revenueExpenditureTemplates,
  },
  {
    statementCode: "ASSETS_LIAB",
    statementName: "Statement of Assets and Liabilities",
    templates: assetsAndLiabilitiesTemplates,
  },
  {
    statementCode: "CASH_FLOW",
    statementName: "Statement of Cash Flow",
    templates: cashFlowTemplates,
  },
  {
    statementCode: "NET_ASSETS_CHANGES",
    statementName: "Statement of Changes in Net Assets",
    templates: changeInNetAssetsTemplate,
  },
  {
    statementCode: "BUDGET_VS_ACTUAL",
    statementName: "Statement of Budget vs Actual",
    templates: budgetVsActualAmountsTemplate,
  },
];

/* eslint-disable no-console */
export default async function seed(db: Database) {
  console.log("Seeding statement_templates …");
  const eventMap = await getEventCodeIdMap(db);

  for (const stmt of statements) {
    const rows = stmt.templates.map((tpl) => ({
      statementCode: stmt.statementCode,
      statementName: stmt.statementName,
      lineItem: tpl.lineItem,
      eventIds: tpl.eventCodes.map((c) => {
        const id = eventMap.get(c);
        if (id === undefined) throw new Error(`Event code ${c} not found in DB`);
        return id;
      }),
      displayOrder: tpl.displayOrder,
      isTotalLine: tpl.isTotalLine ?? false,
      isSubtotalLine: tpl.isSubtotalLine ?? false,
    }));

    const seedManager = new SeedManager(db);
    await seedManager.seedWithConflictResolution(schema.statementTemplates, rows as any, {
      uniqueFields: ["statementCode", "lineItem"],
      onConflict: "update",
      updateFields: ["statementName", "eventIds", "displayOrder", "isTotalLine", "isSubtotalLine"],
    });
  }

  console.log("statement_templates seeded.");
} 