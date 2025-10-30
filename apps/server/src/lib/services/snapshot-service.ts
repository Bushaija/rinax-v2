import { db } from "@/db";
import { financialReports } from "@/db/schema/financial-reports/schema";
import { schemaFormDataEntries } from "@/db/schema/schema-form-data-entries/schema";
import { eq, and, inArray, gt } from "drizzle-orm";
import { createHash } from "crypto";

/**
 * Snapshot Data Structure
 * Contains complete financial report data captured at submission time
 */
export interface SnapshotData {
  version: string;
  capturedAt: string;
  statementCode: string;
  statement: {
    lines: any[];
    totals: Record<string, number>;
    metadata: any;
  };
  sourceData: {
    planningEntries: SourceDataEntry[];
    executionEntries: SourceDataEntry[];
  };
  aggregations: {
    totalPlanning: number;
    totalExecution: number;
    variance: number;
    facilityBreakdown?: any[];
  };
  checksum: string;
}

/**
 * Source Data Entry
 * Reference to planning or execution data used in snapshot
 */
export interface SourceDataEntry {
  id: number;
  formData: any;
  updatedAt: string;
}

/**
 * SnapshotService
 * Handles snapshot capture, integrity validation, and change detection
 * for financial reports
 */
export class SnapshotService {
  /**
   * Capture complete snapshot of report data
   * Queries all planning and execution data and generates statement
   * 
   * @param report - Financial report to capture snapshot for
   * @returns Complete snapshot data structure
   */
  async captureSnapshot(report: any): Promise<SnapshotData> {
    try {
      // 1. Get statement code from metadata
      const statementCode = report.metadata?.statementCode || report.reportData?.statementCode;
      
      if (!statementCode) {
        throw new Error(`Report ${report.id} missing statementCode in metadata`);
      }

      // 2. Query source data
      const planningData = await this.getPlanningData(
        report.projectId,
        report.facilityId,
        report.reportingPeriodId
      );

      const executionData = await this.getExecutionData(
        report.projectId,
        report.facilityId,
        report.reportingPeriodId
      );

      // 3. Use existing report data as the statement
      // The report should already have generated statement data in reportData
      const statement = report.reportData?.statement || {
        lines: [],
        totals: {},
        metadata: {}
      };

      // 4. Build snapshot structure
      const snapshot: SnapshotData = {
        version: report.version || "1.0",
        capturedAt: new Date().toISOString(),
        statementCode,
        statement: {
          lines: statement.lines || [],
          totals: statement.totals || {},
          metadata: statement.metadata || {},
        },
        sourceData: {
          planningEntries: planningData.map(entry => ({
            id: entry.id,
            formData: entry.formData,
            updatedAt: entry.updatedAt?.toISOString() || new Date().toISOString(),
          })),
          executionEntries: executionData.map(entry => ({
            id: entry.id,
            formData: entry.formData,
            updatedAt: entry.updatedAt?.toISOString() || new Date().toISOString(),
          })),
        },
        aggregations: {
          totalPlanning: statement.metadata?.totalPlanning || 0,
          totalExecution: statement.metadata?.totalExecution || 0,
          variance: statement.metadata?.variance || 0,
          facilityBreakdown: statement.metadata?.facilityBreakdown,
        },
        checksum: "", // Will be computed separately
      };

      return snapshot;
    } catch (error) {
      console.error(`Error capturing snapshot for report ${report.id}:`, error);
      throw new Error(`Failed to capture snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compute SHA-256 checksum of snapshot data
   * Used for integrity validation
   * 
   * @param snapshot - Snapshot data to compute checksum for
   * @returns SHA-256 hash as hex string
   */
  computeChecksum(snapshot: SnapshotData): string {
    try {
      // Create a copy without the checksum field to avoid circular dependency
      const snapshotForHashing = { ...snapshot, checksum: "" };
      const snapshotString = JSON.stringify(snapshotForHashing);
      return createHash('sha256').update(snapshotString).digest('hex');
    } catch (error) {
      console.error('Error computing checksum:', error);
      throw new Error(`Failed to compute checksum: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify snapshot integrity by comparing checksums
   * 
   * @param reportId - ID of report to verify
   * @returns True if checksum matches, false otherwise
   */
  async verifyChecksum(reportId: number): Promise<boolean> {
    try {
      const report = await db.query.financialReports.findFirst({
        where: eq(financialReports.id, reportId),
      });

      if (!report || !report.reportData || !report.snapshotChecksum) {
        console.warn(`Report ${reportId} missing snapshot data or checksum`);
        return false;
      }

      const computedChecksum = this.computeChecksum(report.reportData as SnapshotData);
      const isValid = computedChecksum === report.snapshotChecksum;

      if (!isValid) {
        console.error(
          `Checksum mismatch for report ${reportId}. ` +
          `Expected: ${report.snapshotChecksum}, Got: ${computedChecksum}`
        );
      }

      return isValid;
    } catch (error) {
      console.error(`Error verifying checksum for report ${reportId}:`, error);
      return false;
    }
  }

  /**
   * Check if source data has changed since snapshot was captured
   * Compares timestamps of source entries with snapshot timestamp
   * 
   * @param reportId - ID of report to check
   * @returns True if source data has changed, false otherwise
   */
  async detectSourceDataChanges(reportId: number): Promise<boolean> {
    try {
      const report = await db.query.financialReports.findFirst({
        where: eq(financialReports.id, reportId),
      });

      if (!report || !report.reportData) {
        console.warn(`Report ${reportId} missing snapshot data`);
        return false;
      }

      const snapshot = report.reportData as SnapshotData;
      const snapshotTimestamp = new Date(snapshot.capturedAt);

      // Check if any planning entries have been updated after snapshot
      const planningIds = snapshot.sourceData.planningEntries.map(e => e.id);
      if (planningIds.length > 0) {
        const updatedPlanning = await db.query.schemaFormDataEntries.findMany({
          where: and(
            inArray(schemaFormDataEntries.id, planningIds),
            gt(schemaFormDataEntries.updatedAt, snapshotTimestamp)
          ),
        });

        if (updatedPlanning.length > 0) {
          console.log(
            `Report ${reportId}: ${updatedPlanning.length} planning entries updated after snapshot`
          );
          return true;
        }
      }

      // Check if any execution entries have been updated after snapshot
      const executionIds = snapshot.sourceData.executionEntries.map(e => e.id);
      if (executionIds.length > 0) {
        const updatedExecution = await db.query.schemaFormDataEntries.findMany({
          where: and(
            inArray(schemaFormDataEntries.id, executionIds),
            gt(schemaFormDataEntries.updatedAt, snapshotTimestamp)
          ),
        });

        if (updatedExecution.length > 0) {
          console.log(
            `Report ${reportId}: ${updatedExecution.length} execution entries updated after snapshot`
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(`Error detecting source data changes for report ${reportId}:`, error);
      return false;
    }
  }

  /**
   * Get planning data for snapshot
   * Helper method to query planning entries
   * 
   * @param projectId - Project ID
   * @param facilityId - Facility ID
   * @param reportingPeriodId - Reporting period ID
   * @returns Array of planning data entries
   */
  private async getPlanningData(
    projectId: number,
    facilityId: number,
    reportingPeriodId: number
  ) {
    try {
      return await db.query.schemaFormDataEntries.findMany({
        where: and(
          eq(schemaFormDataEntries.projectId, projectId),
          eq(schemaFormDataEntries.facilityId, facilityId),
          eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
          eq(schemaFormDataEntries.entityType, 'planning')
        ),
      });
    } catch (error) {
      console.error('Error fetching planning data:', error);
      return [];
    }
  }

  /**
   * Get execution data for snapshot
   * Helper method to query execution entries
   * 
   * @param projectId - Project ID
   * @param facilityId - Facility ID
   * @param reportingPeriodId - Reporting period ID
   * @returns Array of execution data entries
   */
  private async getExecutionData(
    projectId: number,
    facilityId: number,
    reportingPeriodId: number
  ) {
    try {
      return await db.query.schemaFormDataEntries.findMany({
        where: and(
          eq(schemaFormDataEntries.projectId, projectId),
          eq(schemaFormDataEntries.facilityId, facilityId),
          eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
          eq(schemaFormDataEntries.entityType, 'execution')
        ),
      });
    } catch (error) {
      console.error('Error fetching execution data:', error);
      return [];
    }
  }
}

// Export singleton instance
export const snapshotService = new SnapshotService();
