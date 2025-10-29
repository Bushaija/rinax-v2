import type { ActivityRow, ActivityCatalogMap, UnifiedActivity } from "../../api/routes/execution/execution.types";

// Types for internal processing
interface ExecutionEntry {
  id: number;
  formData: any;
  computedValues: any;
  facilityId: number;
  facilityName: string;
  facilityType: string;
  projectType: string;
  year?: number;
  quarter?: string;
}

interface ActivityDefinition {
  code: string;
  name: string;
  category: string;
  subcategory?: string;
  displayOrder: number;
  isSection: boolean;
  isSubcategory: boolean;
  isComputed: boolean;
  computationFormula?: string;
  level: number;
}

interface QuarterlyValues {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}

interface AggregatedData {
  [activityCode: string]: {
    [facilityId: string]: QuarterlyValues;
  };
}

interface ComputedValues {
  [activityCode: string]: {
    [facilityId: string]: QuarterlyValues;
  };
}

export class AggregationService {
  
  // Expose matchActivityCode for testing
  public matchActivityCode(activityCode: string, availableCodes: string[]): string | null {
    return this.matchActivityCodeInternal(activityCode, availableCodes);
  }

  /**
   * Task 2: Build unified activity structure
   * Build a unified activity structure from multiple facility-type-specific catalogs
   * This merges catalogs from different facility types into a single structure
   */
  buildUnifiedActivityCatalog(catalogsByType: ActivityCatalogMap): UnifiedActivity[] {
    const unifiedMap = new Map<string, UnifiedActivity>();
    
    // Process each facility type's catalog
    for (const [facilityType, catalog] of Object.entries(catalogsByType)) {
      for (const activity of catalog) {
        // Create a normalized key for grouping similar activities
        // Activities with same category, subcategory, and display order are considered similar
        const normalizedKey = `${activity.category}_${activity.subcategory || 'none'}_${activity.displayOrder}`;
        
        if (unifiedMap.has(normalizedKey)) {
          // Activity already exists - add this facility type
          const existing = unifiedMap.get(normalizedKey)!;
          existing.facilityTypes.push(facilityType);
        } else {
          // New activity - add to unified structure
          unifiedMap.set(normalizedKey, {
            ...activity,
            facilityTypes: [facilityType],
            sourceCode: activity.code
          });
        }
      }
    }
    
    // Convert map to array and sort by category first, then display order
    const unifiedCatalog = Array.from(unifiedMap.values())
      .sort((a, b) => {
        // Sort by category first
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        // Then by display order
        return a.displayOrder - b.displayOrder;
      });
    
    // Task 5: Log the number of activities included from each facility type in unified structure
    console.log(`[UNIFIED-CATALOG] Built unified catalog with ${unifiedCatalog.length} activities from ${Object.keys(catalogsByType).length} facility types`);
    
    // Task 5: Log detailed breakdown of activities per facility type
    const activityBreakdown: Record<string, number> = {};
    for (const [facilityType, catalog] of Object.entries(catalogsByType)) {
      activityBreakdown[facilityType] = catalog.length;
    }
    console.log(`[UNIFIED-CATALOG] [SUMMARY] Activities per facility type:`, activityBreakdown);
    
    // Task 5: Log activities that exist in only one facility type
    const singleTypeActivities = unifiedCatalog.filter(a => a.facilityTypes.length === 1);
    if (singleTypeActivities.length > 0) {
      console.log(
        `[UNIFIED-CATALOG] [INFO] ${singleTypeActivities.length} activities exist in only one facility type. ` +
        `These will show zero values for other facility types.`
      );
    }
    
    // Task 5: Log activities that exist in multiple facility types
    const multiTypeActivities = unifiedCatalog.filter(a => a.facilityTypes.length > 1);
    if (multiTypeActivities.length > 0) {
      console.log(
        `[UNIFIED-CATALOG] [INFO] ${multiTypeActivities.length} activities exist in multiple facility types ` +
        `(${multiTypeActivities[0].facilityTypes.join(', ')})`
      );
    }
    
    return unifiedCatalog;
  }
  
  /**
   * Task 2.1: Create value extraction utilities
   * Extract quarterly values from execution form data
   */
  extractActivityValues(formData: any, activityCode: string): QuarterlyValues {
    try {
      // Handle different form data structures
      let activities: any[] = [];
      let activitiesObject: Record<string, any> = {};
      
      // Check if this is enriched form data (has activities as keyed object)
      if (formData?.activities && typeof formData.activities === 'object' && !Array.isArray(formData.activities)) {
        activitiesObject = formData.activities;
        activities = Object.values(formData.activities);
      } else if (Array.isArray(formData?.activities)) {
        activities = formData.activities;
        // Convert array to keyed object for easier lookup
        for (const activity of activities) {
          if (activity?.code) {
            activitiesObject[activity.code] = activity;
          }
        }
      }
      
      // CRITICAL FIX: Only do exact lookup - no fuzzy matching here
      // The activityCode parameter should be the exact code we're looking for
      let activity = activitiesObject[activityCode];
      
      if (!activity) {
        // Return zero values for missing activities - this is correct behavior
        return { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      }
      
      // Extract quarterly values with fallback to 0
      const q1 = Number(activity.q1 || 0);
      const q2 = Number(activity.q2 || 0);
      const q3 = Number(activity.q3 || 0);
      const q4 = Number(activity.q4 || 0);
      
      // CRITICAL FIX: Use pre-calculated cumulative_balance if available
      // This respects section-aware logic (A/B/G sum all quarters, D/E use latest quarter)
      let total: number;
      
      if (activity.cumulative_balance !== undefined && activity.cumulative_balance !== null) {
        // Use pre-calculated value from recalculation
        total = Number(activity.cumulative_balance);
      } else {
        // Fallback: sum all quarters (for old data without cumulative_balance)
        total = q1 + q2 + q3 + q4;
      }
      
      return { q1, q2, q3, q4, total };
    } catch (error) {
      console.warn(`Error extracting values for activity ${activityCode}:`, error);
      // Return zero values for malformed data
      return { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
    }
  }

  /**
   * Task 2.1: Implement activity code matching logic for consistent data retrieval
   */
  private matchActivityCodeInternal(activityCode: string, availableCodes: string[]): string | null {
    // SIMPLIFIED: Only do exact matches to prevent incorrect cross-matching
    // The cross-project matching was causing issues where activities were incorrectly matched
    
    // Direct match first
    if (availableCodes.includes(activityCode)) {
      return activityCode;
    }
    
    // Try case-insensitive match
    const lowerCode = activityCode.toLowerCase();
    const caseInsensitiveMatch = availableCodes.find(code => 
      code.toLowerCase() === lowerCode
    );
    if (caseInsensitiveMatch) {
      return caseInsensitiveMatch;
    }
    
    // No match found - this is correct behavior for missing activities
    return null;
  }

  /**
   * Task 2.1: Add handling for missing or malformed activity data
   */
  handleMissingActivityData(
    executionData: ExecutionEntry[]
  ): { cleanedData: ExecutionEntry[], warnings: string[] } {
    const warnings: string[] = [];
    const cleanedData: ExecutionEntry[] = [];
    
    for (const entry of executionData) {
      try {
        // Validate form data structure
        if (!entry.formData || typeof entry.formData !== 'object') {
          warnings.push(`Facility ${entry.facilityName}: Invalid form data structure`);
          continue;
        }
        
        // Handle both enriched and raw form data structures
        let activities: any[] = [];
        let activitiesObject: Record<string, any> = {};
        
        if (entry.formData.activities && typeof entry.formData.activities === 'object' && !Array.isArray(entry.formData.activities)) {
          // Enriched form data - activities is a keyed object
          activitiesObject = entry.formData.activities;
          activities = Object.values(entry.formData.activities);
        } else if (Array.isArray(entry.formData.activities)) {
          // Raw form data - activities is an array
          activities = entry.formData.activities;
          // Convert to keyed object
          for (const activity of activities) {
            if (activity?.code) {
              activitiesObject[activity.code] = activity;
            }
          }
        } else {
          activities = [];
          activitiesObject = {};
        }
        
        // Validate each activity has required fields
        const validActivities = activities.filter((activity: any) => {
          if (!activity || typeof activity !== 'object') {
            return false;
          }
          if (!activity.code || typeof activity.code !== 'string') {
            return false;
          }
          return true;
        });
        
        // Rebuild valid activities object
        const validActivitiesObject: Record<string, any> = {};
        for (const activity of validActivities) {
          validActivitiesObject[activity.code] = activity;
        }
        
        if (validActivities.length !== activities.length) {
          warnings.push(
            `Facility ${entry.facilityName}: Filtered out ${activities.length - validActivities.length} invalid activities`
          );
        }
        
        // Update the entry with cleaned activities (preserve the original structure)
        const cleanedEntry = {
          ...entry,
          formData: {
            ...entry.formData,
            activities: entry.formData.activities && typeof entry.formData.activities === 'object' && !Array.isArray(entry.formData.activities)
              ? validActivitiesObject  // Keep as object if it was an object
              : validActivities        // Keep as array if it was an array
          }
        };
        
        cleanedData.push(cleanedEntry);
        
      } catch (error) {
        warnings.push(`Facility ${entry.facilityName}: Error processing data - ${error}`);
      }
    }
    
    return { cleanedData, warnings };
  }

  /**
   * Task 2.2: Implement function to sum quarterly values across multiple facilities
   */
  sumQuarterlyValues(values: QuarterlyValues[]): QuarterlyValues {
    if (values.length === 0) {
      return { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
    }
    
    const result = values.reduce((sum, current) => ({
      q1: sum.q1 + current.q1,
      q2: sum.q2 + current.q2,
      q3: sum.q3 + current.q3,
      q4: sum.q4 + current.q4,
      total: sum.total + current.total
    }), { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 });
    
    // Recalculate total to ensure consistency
    result.total = result.q1 + result.q2 + result.q3 + result.q4;
    
    return result;
  }

  /**
   * Task 2.2: Create logic to aggregate data by activity code while maintaining facility breakdown
   */
  aggregateByActivity(
    executionData: ExecutionEntry[],
    activityCatalog: ActivityDefinition[]
  ): AggregatedData {
    const aggregated: AggregatedData = {};
    
    // Initialize aggregated data structure for all activities
    for (const activity of activityCatalog) {
      aggregated[activity.code] = {};
    }
    
    // Process each facility's execution data
    for (const entry of executionData) {
      const facilityId = entry.facilityId.toString();
      
      // Get available activity codes from this facility's data
      let facilityActivities: any[] = [];
      let availableCodes: string[] = [];
      
      if (entry.formData?.activities && typeof entry.formData.activities === 'object' && !Array.isArray(entry.formData.activities)) {
        // Enriched form data - activities is a keyed object
        facilityActivities = Object.values(entry.formData.activities);
        availableCodes = Object.keys(entry.formData.activities);
      } else if (Array.isArray(entry.formData?.activities)) {
        // Raw form data - activities is an array
        facilityActivities = entry.formData.activities;
        availableCodes = facilityActivities
          .filter((a: any) => a?.code)
          .map((a: any) => a.code);
      }
      
      // Process each activity in the catalog
      for (const activity of activityCatalog) {
        // Try to match the activity code
        const matchedCode = this.matchActivityCodeInternal(activity.code, availableCodes);
        
        if (matchedCode) {
          // Extract values using the matched code
          const values = this.extractActivityValues(entry.formData, matchedCode);
          aggregated[activity.code][facilityId] = values;
          
          // Debug logging for A section
          if (activity.code.includes('_A_')) {
            console.log(`[AGGREGATION] ${activity.code} matched to ${matchedCode}, values:`, values);
          }
        } else {
          // Use zero values for missing activities - this is correct behavior
          aggregated[activity.code][facilityId] = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
          
          // Debug logging for A section
          if (activity.code.includes('_A_')) {
            console.log(`[AGGREGATION] ${activity.code} not matched, using zero values`);
          }
        }
      }
    }
    
    return aggregated;
  }

  /**
   * Task 3: Aggregate execution data using facility-specific activity catalogs
   * This function handles mixed facility types by matching each facility's data
   * to its appropriate catalog based on category, subcategory, and display order
   * 
   * Task 6: Performance optimizations:
   * - Uses Map data structures for O(1) activity lookups
   * - Processes facilities in single pass
   * - Efficient catalog reuse (catalogs are pre-loaded and mapped)
   */
  aggregateByActivityWithMultipleCatalogs(
    executionData: ExecutionEntry[],
    facilityCatalogMap: Record<string, ActivityDefinition[]>,
    unifiedCatalog: UnifiedActivity[]
  ): AggregatedData {
    const aggregated: AggregatedData = {};
    
    // Initialize aggregated data structure for all unified activities
    for (const activity of unifiedCatalog) {
      aggregated[activity.code] = {};
    }
    
    console.log(`[MULTI-CATALOG-AGGREGATION] Processing ${executionData.length} facilities with ${unifiedCatalog.length} unified activities`);
    
    // Task 6: Add performance warning when facility count exceeds 100
    if (executionData.length > 100) {
      console.warn(
        `[MULTI-CATALOG-AGGREGATION] [PERFORMANCE] Processing ${executionData.length} facilities. ` +
        `Large dataset may impact response time. Consider using filters to reduce scope.`
      );
    }
    
    // Task 5: Track statistics for logging
    let facilitiesWithoutCatalog = 0;
    let totalActivityMatches = 0;
    let totalActivityMismatches = 0;
    
    // Task 6: Build Map index for facility catalogs for O(1) lookups
    // Key: "category_subcategory_displayOrder" -> Value: ActivityDefinition
    const facilityCatalogIndexMap = new Map<string, Map<string, ActivityDefinition>>();
    
    for (const [facilityId, catalog] of Object.entries(facilityCatalogMap)) {
      const catalogIndex = new Map<string, ActivityDefinition>();
      for (const activity of catalog) {
        const key = `${activity.category}_${activity.subcategory || 'none'}_${activity.displayOrder}`;
        catalogIndex.set(key, activity);
      }
      facilityCatalogIndexMap.set(facilityId, catalogIndex);
    }
    
    console.log(`[MULTI-CATALOG-AGGREGATION] [PERFORMANCE] Built catalog index for ${facilityCatalogIndexMap.size} facilities`);
    
    // Task 6: Process each facility's execution data in single pass
    for (const entry of executionData) {
      const facilityId = entry.facilityId.toString();
      const facilityCatalog = facilityCatalogMap[facilityId];
      const catalogIndex = facilityCatalogIndexMap.get(facilityId);
      
      if (!facilityCatalog || !catalogIndex) {
        // Task 5: Enhanced warning when catalog is missing for a facility
        console.warn(
          `[MULTI-CATALOG-AGGREGATION] [WARNING] No catalog found for facility ${facilityId} ` +
          `(${entry.facilityName}, type: ${entry.facilityType}). All activities will show zero values.`
        );
        facilitiesWithoutCatalog++;
        
        // Use zero values for all activities for this facility
        for (const activity of unifiedCatalog) {
          aggregated[activity.code][facilityId] = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
        }
        continue;
      }
      
      // Task 6: Build Set of available codes for O(1) lookup instead of array includes
      const availableCodesSet = new Set<string>();
      if (entry.formData?.activities && typeof entry.formData.activities === 'object' && !Array.isArray(entry.formData.activities)) {
        for (const code of Object.keys(entry.formData.activities)) {
          availableCodesSet.add(code);
        }
      } else if (Array.isArray(entry.formData?.activities)) {
        for (const activity of entry.formData.activities) {
          if (activity?.code) {
            availableCodesSet.add(activity.code);
          }
        }
      }
      
      console.log(
        `[MULTI-CATALOG-AGGREGATION] Facility ${facilityId} (${entry.facilityName}, type: ${entry.facilityType}): ` +
        `${availableCodesSet.size} activities in data, ${facilityCatalog.length} activities in catalog`
      );
      
      // Task 5: Track matches and mismatches for this facility
      let facilityMatches = 0;
      let facilityMismatches = 0;
      
      // Task 6: Process each activity in the unified catalog using Map lookup (O(1) instead of O(n))
      for (const unifiedActivity of unifiedCatalog) {
        // Task 6: Use Map lookup instead of array.find() for better performance
        const lookupKey = `${unifiedActivity.category}_${unifiedActivity.subcategory || 'none'}_${unifiedActivity.displayOrder}`;
        const facilityActivity = catalogIndex.get(lookupKey);
        
        if (facilityActivity && availableCodesSet.has(facilityActivity.code)) {
          // Extract values using the facility-specific activity code
          const values = this.extractActivityValues(entry.formData, facilityActivity.code);
          aggregated[unifiedActivity.code][facilityId] = values;
          
          // Task 5: Track successful match
          facilityMatches++;
          totalActivityMatches++;
          
          console.log(
            `[MULTI-CATALOG-AGGREGATION] Facility ${facilityId}: ${unifiedActivity.code} matched to ${facilityActivity.code}, ` +
            `values: q1=${values.q1}, q2=${values.q2}, q3=${values.q3}, q4=${values.q4}, total=${values.total}`
          );
        } else {
          // Use zero values for missing activities
          aggregated[unifiedActivity.code][facilityId] = { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
          
          // Task 5: Track mismatch
          facilityMismatches++;
          totalActivityMismatches++;
          
          if (facilityActivity) {
            // Task 5: Enhanced warning when activity code doesn't match between facility data and catalog
            console.warn(
              `[MULTI-CATALOG-AGGREGATION] [WARNING] Activity code mismatch for facility ${facilityId} (${entry.facilityName}): ` +
              `${unifiedActivity.code} matched to catalog activity ${facilityActivity.code} ` +
              `but code not found in facility data. Available codes: ${availableCodesSet.size}. Using zero values.`
            );
          } else {
            // Task 5: Enhanced warning when activity not found in catalog
            console.warn(
              `[MULTI-CATALOG-AGGREGATION] [WARNING] Activity not found in catalog for facility ${facilityId} (${entry.facilityName}): ` +
              `${unifiedActivity.code} (category=${unifiedActivity.category}, subcategory=${unifiedActivity.subcategory || 'none'}, ` +
              `displayOrder=${unifiedActivity.displayOrder}). Using zero values.`
            );
          }
        }
      }
      
      // Task 5: Log summary for this facility
      console.log(
        `[MULTI-CATALOG-AGGREGATION] Facility ${facilityId} summary: ` +
        `${facilityMatches} matches, ${facilityMismatches} mismatches out of ${unifiedCatalog.length} activities`
      );
    }
    
    // Task 5: Log overall aggregation summary
    console.log(`[MULTI-CATALOG-AGGREGATION] [SUMMARY] Aggregation complete for ${executionData.length} facilities`);
    console.log(`[MULTI-CATALOG-AGGREGATION] [SUMMARY] Total activity matches: ${totalActivityMatches}`);
    console.log(`[MULTI-CATALOG-AGGREGATION] [SUMMARY] Total activity mismatches: ${totalActivityMismatches}`);
    
    if (facilitiesWithoutCatalog > 0) {
      console.warn(
        `[MULTI-CATALOG-AGGREGATION] [WARNING] ${facilitiesWithoutCatalog} facilities had no catalog mapping`
      );
    }
    
    if (totalActivityMismatches > 0) {
      const mismatchPercentage = ((totalActivityMismatches / (totalActivityMatches + totalActivityMismatches)) * 100).toFixed(2);
      console.warn(
        `[MULTI-CATALOG-AGGREGATION] [WARNING] ${mismatchPercentage}% of activity lookups resulted in mismatches. ` +
        `This may indicate data quality issues or catalog inconsistencies.`
      );
    }
    
    return aggregated;
  }

  /**
   * Task 2.2: Add computed value calculations (C=A-B, F=D-E) for aggregated data
   */
  calculateComputedValues(
    aggregatedData: AggregatedData,
    activityCatalog: ActivityDefinition[]
  ): ComputedValues {
    const computedValues: ComputedValues = {};
    
    // Get all facility IDs from the aggregated data
    const facilityIds = new Set<string>();
    Object.values(aggregatedData).forEach(activityData => {
      Object.keys(activityData).forEach(facilityId => {
        facilityIds.add(facilityId);
      });
    });
    
    // Find section totals for each facility (excluding total row activities)
    const sectionTotals: { [facilityId: string]: { [section: string]: QuarterlyValues } } = {};
    
    for (const facilityId of facilityIds) {
      sectionTotals[facilityId] = {};
      
      // Calculate section totals (A, B, D, E, G)
      const sections = ['A', 'B', 'D', 'E', 'G'];
      for (const section of sections) {
        const sectionActivities = activityCatalog.filter(a => 
          a.category === section && 
          !a.isSection && 
          !a.name.match(/^[A-G]\.\s/) // Exclude total row activities
        );
        
        // CRITICAL FIX: aggregatedData already contains correct totals from cumulative_balance
        // No need to manually handle D/E differently - the totals are already correct
        const sectionValues = sectionActivities.map(activity => 
          aggregatedData[activity.code]?.[facilityId] || { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 }
        );
        
        sectionTotals[facilityId][section] = this.sumQuarterlyValues(sectionValues);
        
        // Debug logging for D/E sections
        if ((section === 'D' || section === 'E') && sectionActivities.length > 0) {
          console.log(`[COMPUTED] Section ${section} for facility ${facilityId}:`, {
            activityCount: sectionActivities.length,
            total: sectionTotals[facilityId][section].total,
            sampleActivity: {
              code: sectionActivities[0].code,
              values: aggregatedData[sectionActivities[0].code]?.[facilityId]
            }
          });
        }
      }
    }
    
    // Calculate computed values for each facility
    for (const facilityId of facilityIds) {
      const A = sectionTotals[facilityId]['A'] || { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      const B = sectionTotals[facilityId]['B'] || { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      const D = sectionTotals[facilityId]['D'] || { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      const E = sectionTotals[facilityId]['E'] || { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
      
      // Create computed values with standard keys
      computedValues['surplus'] = computedValues['surplus'] || {};
      computedValues['surplus'][facilityId] = {
        q1: A.q1 - B.q1,
        q2: A.q2 - B.q2,
        q3: A.q3 - B.q3,
        q4: A.q4 - B.q4,
        total: A.total - B.total
      };
      
      computedValues['netFinancialAssets'] = computedValues['netFinancialAssets'] || {};
      computedValues['netFinancialAssets'][facilityId] = {
        q1: D.q1 - E.q1,
        q2: D.q2 - E.q2,
        q3: D.q3 - E.q3,
        q4: D.q4 - E.q4,
        total: D.total - E.total
      };
      
      // Debug logging for net financial assets
      console.log(`[COMPUTED] Net Financial Assets for facility ${facilityId}:`, {
        D_total: D.total,
        E_total: E.total,
        netFinancialAssets: computedValues['netFinancialAssets'][facilityId].total
      });
    }
    
    return computedValues;
  }
  

  /**
   * Task 2.3: Implement function to organize activities into sections A-G with subcategories
   */
  buildHierarchicalStructure(
    aggregatedData: AggregatedData,
    computedValues: ComputedValues,
    activityCatalog: ActivityDefinition[],
    subcategoryNames?: Record<string, string>
  ): ActivityRow[] {
    const sections: ActivityRow[] = [];
    const facilityIds = new Set<string>();
    
    // Collect all facility IDs
    Object.values(aggregatedData).forEach(activityData => {
      Object.keys(activityData).forEach(facilityId => {
        facilityIds.add(facilityId);
      });
    });
    
    // Group activities by section and subcategory
    const sectionCodes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    
    for (const section of sectionCodes) {
      const sectionName = this.getSectionName(section);
      const sectionValues: Record<string, number> = {};
      let sectionTotal = 0;
      const sectionItems: ActivityRow[] = [];
      
      // Handle computed sections (C, F) differently
      if (section === 'C') {
        // C = A - B (Surplus/Deficit) - use computed values
        for (const facilityId of facilityIds) {
          const surplusDeficitCode = Object.keys(computedValues).find(code => 
            code.includes('surplus') || code.toLowerCase().includes('c')
          );
          
          let facilityValue = 0;
          if (surplusDeficitCode && computedValues[surplusDeficitCode]?.[facilityId]) {
            facilityValue = computedValues[surplusDeficitCode][facilityId].total;
          } else {
            // Fallback: calculate A - B manually
            const aTotal = this.getSectionTotalFromAggregated(aggregatedData, 'A', facilityId);
            const bTotal = this.getSectionTotalFromAggregated(aggregatedData, 'B', facilityId);
            facilityValue = aTotal - bTotal;
          }
          
          sectionValues[facilityId] = facilityValue;
          sectionTotal += facilityValue;
        }
        
        sections.push({
          code: section,
          name: sectionName,
          category: section,
          displayOrder: this.getSectionDisplayOrder(section),
          isSection: true,
          isSubcategory: false,
          isComputed: true,
          computationFormula: 'A - B',
          values: sectionValues,
          total: sectionTotal,
          level: 0,
          items: [] // C section has no items
        });
        continue;
      }
      
      if (section === 'F') {
        // F = D - E (Net Financial Assets) - use computed values
        for (const facilityId of facilityIds) {
          const netFinancialAssetsCode = Object.keys(computedValues).find(code => 
            code.includes('netFinancialAssets') || code.toLowerCase().includes('f')
          );
          
          let facilityValue = 0;
          if (netFinancialAssetsCode && computedValues[netFinancialAssetsCode]?.[facilityId]) {
            facilityValue = computedValues[netFinancialAssetsCode][facilityId].total;
          } else {
            // Fallback: calculate D - E manually
            const dTotal = this.getSectionTotalFromAggregated(aggregatedData, 'D', facilityId);
            const eTotal = this.getSectionTotalFromAggregated(aggregatedData, 'E', facilityId);
            facilityValue = dTotal - eTotal;
          }
          
          sectionValues[facilityId] = facilityValue;
          sectionTotal += facilityValue;
        }
        
        sections.push({
          code: section,
          name: sectionName,
          category: section,
          displayOrder: this.getSectionDisplayOrder(section),
          isSection: true,
          isSubcategory: false,
          isComputed: true,
          computationFormula: 'D - E',
          values: sectionValues,
          total: sectionTotal,
          level: 0,
          items: [] // F section has no items
        });
        continue;
      }
      
      // Regular sections (A, B, D, E, G)
      const sectionActivities = activityCatalog.filter(a => a.category === section && !a.isSection);
      if (sectionActivities.length === 0) continue;
      
      // Handle subcategories (mainly for section B)
      if (section === 'B') {
        const subcategories = this.getUniqueSubcategories(sectionActivities);
        
        for (const subcategory of subcategories) {
          const subcategoryActivities = sectionActivities.filter(a => a.subcategory === subcategory);
          const subcategoryValues: Record<string, number> = {};
          let subcategoryTotal = 0;
          const subcategoryItems: ActivityRow[] = [];
          
          // Add individual activities under subcategory
          for (const activity of subcategoryActivities) {
            // Skip total row activities
            if (activity.name.match(/^[A-G]\.\s/)) continue;
            
            const activityValues: Record<string, number> = {};
            let activityTotal = 0;
            
            for (const facilityId of facilityIds) {
              const values = aggregatedData[activity.code]?.[facilityId] || 
                             { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
              activityValues[facilityId] = values.total;
              activityTotal += values.total;
              subcategoryTotal += values.total;
            }
            
            subcategoryItems.push({
              code: activity.code,
              name: activity.name,
              category: activity.category,
              subcategory: activity.subcategory,
              displayOrder: activity.displayOrder,
              isSection: false,
              isSubcategory: false,
              isComputed: activity.isComputed,
              computationFormula: activity.computationFormula,
              values: activityValues,
              total: activityTotal,
              level: 2
            });
          }
          
          // Calculate subcategory totals
          for (const facilityId of facilityIds) {
            subcategoryValues[facilityId] = subcategoryItems.reduce((sum, item) => sum + (item.values[facilityId] || 0), 0);
          }
          
          sectionItems.push({
            code: subcategory,
            name: subcategoryNames?.[subcategory] || this.getSubcategoryName(subcategory),
            category: section,
            subcategory,
            displayOrder: this.getSubcategoryDisplayOrder(subcategory),
            isSection: false,
            isSubcategory: true,
            isComputed: false,
            values: subcategoryValues,
            total: subcategoryTotal,
            level: 1,
            items: subcategoryItems
          });
        }
      } else {
        // Add individual activities for other sections
        for (const activity of sectionActivities) {
          // Skip total row activities
          if (activity.name.match(/^[A-G]\.\s/)) continue;
          
          const activityValues: Record<string, number> = {};
          let activityTotal = 0;
          
          // Special handling for G_3 "Surplus/Deficit of the Period" - should be computed as A - B
          if (section === 'G' && activity.name.toLowerCase().includes('surplus/deficit of the period')) {
            for (const facilityId of facilityIds) {
              const surplusValue = computedValues['surplus']?.[facilityId]?.total || 0;
              activityValues[facilityId] = surplusValue;
              activityTotal += surplusValue;
            }
            
            sectionItems.push({
              code: activity.code,
              name: activity.name,
              category: activity.category,
              subcategory: activity.subcategory,
              displayOrder: activity.displayOrder,
              isSection: false,
              isSubcategory: false,
              isComputed: true,
              computationFormula: 'A - B',
              values: activityValues,
              total: activityTotal,
              level: 1
            });
          } else {
            // Regular activities
            for (const facilityId of facilityIds) {
              const values = aggregatedData[activity.code]?.[facilityId] || 
                             { q1: 0, q2: 0, q3: 0, q4: 0, total: 0 };
              activityValues[facilityId] = values.total;
              activityTotal += values.total;
            }
            
            sectionItems.push({
              code: activity.code,
              name: activity.name,
              category: activity.category,
              subcategory: activity.subcategory,
              displayOrder: activity.displayOrder,
              isSection: false,
              isSubcategory: false,
              isComputed: activity.isComputed,
              computationFormula: activity.computationFormula,
              values: activityValues,
              total: activityTotal,
              level: 1
            });
          }
        }
      }
      
      // Calculate section totals from items
      for (const facilityId of facilityIds) {
        sectionValues[facilityId] = sectionItems.reduce((sum, item) => sum + (item.values[facilityId] || 0), 0);
      }
      sectionTotal = Object.values(sectionValues).reduce((sum, val) => sum + val, 0);
      
      sections.push({
        code: section,
        name: sectionName,
        category: section,
        displayOrder: this.getSectionDisplayOrder(section),
        isSection: true,
        isSubcategory: false,
        isComputed: false,
        values: sectionValues,
        total: sectionTotal,
        level: 0,
        items: sectionItems
      });
    }
    
    return sections;
  }

  /**
   * Helper method to get section total from aggregated data
   */
  private getSectionTotalFromAggregated(aggregatedData: AggregatedData, section: string, facilityId: string): number {
    let total = 0;
    for (const [activityCode, facilityData] of Object.entries(aggregatedData)) {
      if (activityCode.includes(`_${section}_`) && facilityData[facilityId]) {
        total += facilityData[facilityId].total;
      }
    }
    return total;
  }

  /**
   * Task 2.3: Add logic to maintain display order and hierarchy levels
   */
  private getSectionDisplayOrder(section: string): number {
    const order: Record<string, number> = {
      'A': 100,
      'B': 200,
      'C': 300,
      'D': 400,
      'E': 500,
      'F': 600,
      'G': 700
    };
    return order[section] || 999;
  }

  private getSubcategoryDisplayOrder(subcategory: string): number {
    // Extract number from subcategory code (e.g., B-01 -> 1)
    const match = subcategory.match(/(\d+)$/);
    if (match) {
      return parseInt(match[1]);
    }
    return 999;
  }

  /**
   * Task 2.3: Create section and subcategory total calculations
   */
  private getSectionName(section: string): string {
    const names: Record<string, string> = {
      'A': 'Receipts',
      'B': 'Expenditures',
      'C': 'Surplus / Deficit',
      'D': 'Financial Assets',
      'E': 'Financial Liabilities',
      'F': 'Net Financial Assets',
      'G': 'Closing Balance'
    };
    return names[section] || section;
  }

  private getSubcategoryName(subcategory: string): string {
    // Use the correct subcategory names as per requirements
    const names: Record<string, string> = {
      'B-01': 'Human Resources + Bonus',
      'B-02': 'Monitoring & Evaluation',
      'B-03': 'Living Support to Clients/Target Populations',
      'B-04': 'Overheads (Use of goods & services)',
      'B-05': 'Transfer to other reporting entities'
    };
    return names[subcategory] || subcategory;
  }

  private getUniqueSubcategories(activities: ActivityDefinition[]): string[] {
    const subcategories = new Set<string>();
    activities.forEach(activity => {
      if (activity.subcategory) {
        subcategories.add(activity.subcategory);
      }
    });
    return Array.from(subcategories).sort();
  }
}

export const aggregationService = new AggregationService();