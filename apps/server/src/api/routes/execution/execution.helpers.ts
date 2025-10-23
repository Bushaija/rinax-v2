export function parseCode(code: string) {
  // Example codes:
  // HIV_EXEC_HOSPITAL_B_B-04_1  -> section: B, subSection: B-04
  // HIV_EXEC_HOSPITAL_D_1       -> section: D, subSection: null
  // HIV_EXEC_HOSPITAL_A_2       -> section: A, subSection: null
  const parts = code.split("_");
  const section = parts[3] || null;        // 'A', 'B', 'D', etc.
  const potentialSubSection = parts[4] || null;

  // SubSection should only be set if it follows the pattern X-YY (e.g., B-01, B-02)
  // If parts[4] is just a number, it's an activity ID, not a subsection
  const subSection = potentialSubSection && potentialSubSection.includes('-')
    ? potentialSubSection
    : null;

  return { section, subSection };
}

/**
 * Gets the latest quarter value with data (including explicit zero)
 * Checks quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
 * Distinguishes between explicit zero (meaningful data) and undefined/null (no data)
 * @param q1 - Quarter 1 value (number | undefined | null)
 * @param q2 - Quarter 2 value (number | undefined | null)
 * @param q3 - Quarter 3 value (number | undefined | null)
 * @param q4 - Quarter 4 value (number | undefined | null)
 * @returns Latest quarter value with data, or undefined if all quarters are undefined/null
 */
function getLatestQuarterValue(
  q1: number | null | undefined,
  q2: number | null | undefined,
  q3: number | null | undefined,
  q4: number | null | undefined
): number | undefined {
  // Check quarters in reverse order (Q4 -> Q3 -> Q2 -> Q1)
  // Use the first DEFINED value (including explicit zero)
  if (q4 !== undefined && q4 !== null) return q4;
  if (q3 !== undefined && q3 !== null) return q3;
  if (q2 !== undefined && q2 !== null) return q2;
  if (q1 !== undefined && q1 !== null) return q1;
  return undefined; // No data entered for any quarter
}

/**
 * Determines if a Section G activity is a flow item (cumulative sum) or stock item (latest quarter)
 * @param code - Activity code
 * @param name - Activity name/label (optional)
 * @returns true if flow item, false if stock item
 */
function isSectionGFlowItem(code: string, name?: string): boolean {
  const codeLower = code.toLowerCase();
  const nameLower = (name || '').toLowerCase();

  // Special case: "Accumulated" + "Surplus/Deficit" = Stock (running balance)
  // This is a balance sheet item showing cumulative position, not a flow
  if ((nameLower.includes('accumulated') || codeLower.includes('accumulated')) &&
    (nameLower.includes('surplus') || nameLower.includes('deficit'))) {
    return false; // Stock item
  }

  // Special case: "Prior Year" = Stock (opening balance)
  if (nameLower.includes('prior') || nameLower.includes('opening')) {
    return false; // Stock item
  }

  // Flow indicators: "of the period", "current", revenue, expense items
  const flowKeywords = [
    'period', 'current', 'revenue',
    'expense', 'income', 'expenditure', 'receipt', 'flow'
  ];

  // Stock indicators: balance, closing, asset, liability, position
  const stockKeywords = [
    'balance', 'closing', 'asset', 'liability', 'position', 'stock'
  ];

  // Check code and name for flow keywords
  const hasFlowKeyword = flowKeywords.some(keyword =>
    codeLower.includes(keyword) || nameLower.includes(keyword)
  );

  // Check code and name for stock keywords
  const hasStockKeyword = stockKeywords.some(keyword =>
    codeLower.includes(keyword) || nameLower.includes(keyword)
  );

  // If both or neither found, default to flow (cumulative sum)
  // This aligns with the requirement that most G items are flows
  if (hasFlowKeyword && !hasStockKeyword) {
    return true;
  } else if (hasStockKeyword && !hasFlowKeyword) {
    return false;
  } else {
    // Default to flow (cumulative sum) for Section G
    return true;
  }
}

/**
 * Calculates cumulative balance based on section type
 * Flow sections (A, B, C) use cumulative sum across all quarters (treating undefined as 0)
 * Stock sections (D, E, F) use the latest quarter value with data (preserving undefined vs explicit zero)
 * Section G uses intelligent detection based on activity code/name
 * 
 * Note: F = D - E (Net Financial Assets), so F inherits stock behavior from its components
 * 
 * @param q1 - Quarter 1 value (number | undefined | null)
 * @param q2 - Quarter 2 value (number | undefined | null)
 * @param q3 - Quarter 3 value (number | undefined | null)
 * @param q4 - Quarter 4 value (number | undefined | null)
 * @param section - Main section code (A, B, C, D, E, F, G, etc.)
 * @param subSection - Subsection code
 * @param code - Full activity code for Section G detection
 * @param name - Activity name/label for Section G detection (optional)
 * @returns Calculated cumulative balance (number for flow sections, number | undefined for stock sections)
 */
export function calculateCumulativeBalance(
  q1?: number | null,
  q2?: number | null,
  q3?: number | null,
  q4?: number | null,
  section?: string | null,
  subSection?: string | null,
  code?: string,
  name?: string
): number | undefined {

  // Determine effective section (subSection overrides section)
  const effectiveSection = (subSection || section || '').trim().toUpperCase();

  // Define classification logic
  const flowSections = ['A', 'B', 'C']; // Flow-based: cumulative sum across quarters (income statement items)
  const stockSections = ['D', 'E', 'F']; // Stock-based: report most recent quarter only (balance sheet items)
  // Note: F = D - E, so F inherits stock behavior from its components

  // --- FLOW-BASED SECTIONS ---
  if (flowSections.includes(effectiveSection)) {
    // Treat undefined/null as 0 to allow safe summing
    return (q1 ?? 0) + (q2 ?? 0) + (q3 ?? 0) + (q4 ?? 0);
  }

  // --- STOCK-BASED SECTIONS ---
  if (stockSections.includes(effectiveSection)) {
    // Return latest valid quarter, preserving explicit zeros
    return getLatestQuarterValue(q1, q2, q3, q4);
  }

  // --- SECTION G (Mixed logic) ---
  if (effectiveSection === 'G') {
    // Some Section G activities behave like flow, others like stock.
    const isFlowItem = isSectionGFlowItem(code || '', name || '');

    if (isFlowItem) {
      return (q1 ?? 0) + (q2 ?? 0) + (q3 ?? 0) + (q4 ?? 0);
    } else {
      return getLatestQuarterValue(q1, q2, q3, q4);
    }
  }

  // --- DEFAULT FALLBACK ---
  // For unclassified sections, default to flow behavior (safer for reporting)
  return (q1 ?? 0) + (q2 ?? 0) + (q3 ?? 0) + (q4 ?? 0);
}

/**
 * Adds cumulative_balance to each activity based on its section type
 * @param activities - Keyed activities object from enrichFormData
 * @returns Activities object with cumulative_balance added to each activity
 */
export function addCumulativeBalances(activities: Record<string, any>): Record<string, any> {
  const enriched: Record<string, any> = {};

  for (const code in activities) {
    const activity = activities[code];
    const { section, subSection } = parseCode(code);

    // Preserve undefined vs explicit zero distinction
    // Only convert to number if value exists, otherwise keep as undefined
    const q1 = activity.q1 !== undefined && activity.q1 !== null ? Number(activity.q1) : undefined;
    const q2 = activity.q2 !== undefined && activity.q2 !== null ? Number(activity.q2) : undefined;
    const q3 = activity.q3 !== undefined && activity.q3 !== null ? Number(activity.q3) : undefined;
    const q4 = activity.q4 !== undefined && activity.q4 !== null ? Number(activity.q4) : undefined;

    // Determine calculation strategy based on section
    // Pass code and name for Section G intelligent detection
    const cumulativeBalance = calculateCumulativeBalance(
      q1,
      q2,
      q3,
      q4,
      section,
      subSection,
      code,
      activity.name || activity.label
    );

    enriched[code] = {
      ...activity,
      cumulative_balance: cumulativeBalance
    };
  }

  return enriched;
}

export function toKeyedActivities(activities: any[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const row of activities || []) {
    const { section, subSection } = parseCode(row.code);
    out[row.code] = { ...row, section, subSection };
  }
  return out;
}

/**
 * Computes rollups (aggregations) by section and subsection
 * CRITICAL: Uses cumulative_balance if available (respects stock/flow logic)
 * Falls back to summing quarters only if cumulative_balance is not set
 * 
 * @param keyed - Activities object with cumulative_balance already calculated
 * @returns Rollups by section and subsection
 */
export function computeRollups(keyed: Record<string, any>) {
  const bySection: Record<string, any> = {};
  const bySubSection: Record<string, any> = {};

  for (const k in keyed) {
    const a = keyed[k];
    const q1 = Number(a.q1 || 0), q2 = Number(a.q2 || 0),
      q3 = Number(a.q3 || 0), q4 = Number(a.q4 || 0);

    // CRITICAL FIX: Use cumulative_balance if available (respects stock/flow logic)
    // For stock sections (D, E, F), cumulative_balance = latest quarter
    // For flow sections (A, B, C), cumulative_balance = sum of quarters
    // This ensures rollups respect the section-specific calculation logic
    const total = a.cumulative_balance !== undefined && a.cumulative_balance !== null
      ? Number(a.cumulative_balance)
      : q1 + q2 + q3 + q4; // Fallback to sum if cumulative_balance not set

    if (a.section) {
      bySection[a.section] ||= { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      bySection[a.section].q1 += q1;
      bySection[a.section].q2 += q2;
      bySection[a.section].q3 += q3;
      bySection[a.section].q4 += q4;
      bySection[a.section].total += total; // Uses cumulative_balance
    }

    if (a.subSection) {
      bySubSection[a.subSection] ||= { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      bySubSection[a.subSection].q1 += q1;
      bySubSection[a.subSection].q2 += q2;
      bySubSection[a.subSection].q3 += q3;
      bySubSection[a.subSection].q4 += q4;
      bySubSection[a.subSection].total += total; // Uses cumulative_balance
    }
  }

  return { bySection, bySubSection };
}

export function toBalances(rollups: { bySection: any; bySubSection: any }) {
  // CRITICAL FIX: Use bySection for main sections (A, B, D, E, G), not bySubSection
  // bySubSection only contains B-01, B-02, etc., not the main sections
  const getSec = (s: string) => rollups.bySection[s] || { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
  const A = getSec('A'); // Receipts
  const B = getSec('B'); // Expenditures
  const D = getSec('D'); // Financial Assets
  const E = getSec('E'); // Financial Liabilities
  const G = getSec('G'); // Closing Balance components (Accumulated + Prior + Surplus of Period)

  const receipts = { q1: A.q1, q2: A.q2, q3: A.q3, q4: A.q4, cumulativeBalance: A.total };
  const expenditures = { q1: B.q1, q2: B.q2, q3: B.q3, q4: B.q4, cumulativeBalance: B.total };
  const surplus = {
    q1: A.q1 - B.q1, q2: A.q2 - B.q2, q3: A.q3 - B.q3, q4: A.q4 - B.q4,
    cumulativeBalance: (A.q1 + A.q2 + A.q3 + A.q4) - (B.q1 + B.q2 + B.q3 + B.q4),
  };

  const financialAssets = { q1: D.q1, q2: D.q2, q3: D.q3, q4: D.q4, cumulativeBalance: D.total };
  const financialLiabilities = { q1: E.q1, q2: E.q2, q3: E.q3, q4: E.q4, cumulativeBalance: E.total };
  // CRITICAL: Use D.total and E.total for stock sections (latest quarter values)
  // D, E, and F are balance sheet items (stock), not income statement items (flow)
  // D.total and E.total already contain the correct latest quarter values from rollup calculation
  // F = D - E inherits stock behavior: F.cumulative = D.latest - E.latest
  const netFinancialAssets = {
    q1: D.q1 - E.q1, q2: D.q2 - E.q2, q3: D.q3 - E.q3, q4: D.q4 - E.q4,
    cumulativeBalance: D.total - E.total, // Stock logic: latest quarter difference
  };

  // Closing balance G = (Accumulated + Prior) + Surplus/Deficit of the Period
  // Many forms store Accumulated and Prior under section G, while Surplus of Period is A-B (our 'surplus').
  const closingBalance = {
    q1: (G.q1 || 0) + surplus.q1,
    q2: (G.q2 || 0) + surplus.q2,
    q3: (G.q3 || 0) + surplus.q3,
    q4: (G.q4 || 0) + surplus.q4,
    cumulativeBalance: (G.total || 0) + surplus.cumulativeBalance,
  };

  const isBalanced = Math.abs(netFinancialAssets.cumulativeBalance - closingBalance.cumulativeBalance) < 0.01;

  return {
    receipts,
    expenditures,
    surplus,
    financialAssets,
    financialLiabilities,
    netFinancialAssets,
    closingBalance,
    isBalanced,
    validationErrors: [],
  };
}

// export function enrichFormData(formData: any, context: { projectType: string; facilityType: string; year?: number; quarter?: string; }) {
//     const incoming = Array.isArray(formData?.activities) ? formData.activities : [];
//     const activities = toKeyedActivities(incoming);

//     // Add cumulative balances to activities
//     const activitiesWithBalances = addCumulativeBalances(activities);

//     // Compute rollups with enriched activities that include cumulative_balance
//     const rollups = computeRollups(activitiesWithBalances);

//     return {
//       version: '1.0',
//       context,
//       activities: activitiesWithBalances, // Return enriched activities with cumulative_balance
//       rollups,
//     };
//   }

export function enrichFormData(formData: any, context: { projectType: string; facilityType: string; year?: number; quarter?: string; }) {
  // Handle both array and object formats for activities
  let incoming: any[] = [];
  if (Array.isArray(formData?.activities)) {
    incoming = formData.activities;
  } else if (formData?.activities && typeof formData.activities === 'object') {
    // If activities is already a keyed object, convert to array
    incoming = Object.values(formData.activities);
  }

  const activities = toKeyedActivities(incoming);

  // Add cumulative balances to activities
  const activitiesWithBalances = addCumulativeBalances(activities);

  // Compute rollups with enriched activities that include cumulative_balance
  const rollups = computeRollups(activitiesWithBalances);

  return {
    version: '1.0',
    context,
    activities: activitiesWithBalances, // Return enriched activities with cumulative_balance
    rollups,
  };
}