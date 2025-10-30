import { db } from "@/db";
import { financialReports } from "@/db/schema/financial-reports/schema";
import { financialReportWorkflowLogs } from "@/db/schema/financial-report-workflow-logs/schema";
import { users } from "@/db/schema/users/schema";
import { eq } from "drizzle-orm";
import type { ReportStatus, WorkflowAction, WorkflowLogWithActor } from "./financial-reports.types";
import { pdfGenerationService } from "./pdf-generation.service";
import { notificationService } from "./notification.service";
import { SnapshotService } from "@/lib/services/snapshot-service";
import { VersionService } from "@/lib/services/version-service";
import { PeriodLockService } from "@/lib/services/period-lock-service";

export interface WorkflowValidationResult {
  allowed: boolean;
  reason?: string;
}

export interface WorkflowActionResult {
  success: boolean;
  message: string;
  report: any;
}

/**
 * Service class for managing financial report approval workflow
 * Handles state transitions, validation, locking, and audit logging
 */
export class FinancialReportWorkflowService {
  
  // ============================================================================
  // STATE TRANSITION VALIDATION METHODS
  // ============================================================================

  /**
   * Validates if a report can be submitted for approval
   * Requirements: 1.1, 4.1
   */
  async canSubmit(reportId: number, userId: number): Promise<WorkflowValidationResult> {
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId)
    });

    if (!report) {
      return { allowed: false, reason: 'Report not found' };
    }

    // Check if status allows submission (draft or rejected states)
    const allowedStatuses: ReportStatus[] = ['draft', 'rejected_by_daf', 'rejected_by_dg'];
    if (!allowedStatuses.includes(report.status as ReportStatus)) {
      return { 
        allowed: false, 
        reason: `Report must be in draft or rejected state to submit. Current status: ${report.status}` 
      };
    }

    // Verify user has accountant role
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    if (user.role !== 'accountant') {
      return { allowed: false, reason: 'Only accountants can submit reports' };
    }

    return { allowed: true };
  }

  /**
   * Validates if a DAF can approve a report
   * Requirements: 2.1, 4.2
   */
  async canDafApprove(reportId: number, userId: number): Promise<WorkflowValidationResult> {
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId)
    });

    if (!report) {
      return { allowed: false, reason: 'Report not found' };
    }

    // Check if status allows DAF approval
    if (report.status !== 'pending_daf_approval') {
      return { 
        allowed: false, 
        reason: `Report must be pending DAF approval. Current status: ${report.status}` 
      };
    }

    // Verify user has DAF role
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    if (user.role !== 'daf') {
      return { allowed: false, reason: 'Only DAF users can approve at this stage' };
    }

    return { allowed: true };
  }

  /**
   * Validates if a DAF can reject a report
   * Requirements: 2.5, 4.2
   */
  async canDafReject(reportId: number, userId: number): Promise<WorkflowValidationResult> {
    // Same validation as DAF approve
    return this.canDafApprove(reportId, userId);
  }

  /**
   * Validates if a DG can approve a report
   * Requirements: 3.1, 4.3
   */
  async canDgApprove(reportId: number, userId: number): Promise<WorkflowValidationResult> {
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId)
    });

    if (!report) {
      return { allowed: false, reason: 'Report not found' };
    }

    // Check if status allows DG approval
    if (report.status !== 'approved_by_daf') {
      return { 
        allowed: false, 
        reason: `Report must be approved by DAF first. Current status: ${report.status}` 
      };
    }

    // Verify user has DG role
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    if (user.role !== 'dg') {
      return { allowed: false, reason: 'Only DG users can provide final approval' };
    }

    return { allowed: true };
  }

  /**
   * Validates if a DG can reject a report
   * Requirements: 3.6, 4.3
   */
  async canDgReject(reportId: number, userId: number): Promise<WorkflowValidationResult> {
    // Same validation as DG approve
    return this.canDgApprove(reportId, userId);
  }

  // ============================================================================
  // WORKFLOW ACTION METHODS
  // ============================================================================

  /**
   * Submits a report for DAF approval
   * Requirements: 1.1-1.5, 6.1
   * 
   * Enhanced to capture snapshot, compute checksum, create version, and lock period
   */
  async submitForApproval(reportId: number, userId: number): Promise<WorkflowActionResult> {
    // Validate action is allowed
    const validation = await this.canSubmit(reportId, userId);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Cannot submit report');
    }

    // Get the full report with relations for snapshot capture
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
      with: {
        project: true,
        facility: true,
        reportingPeriod: true
      }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Initialize services
    const snapshotService = new SnapshotService();
    const versionService = new VersionService();
    const periodLockService = new PeriodLockService();

    // 1. Capture snapshot of all planning and execution data
    const snapshot = await snapshotService.captureSnapshot(report);

    // 2. Compute checksum for integrity validation
    const checksum = snapshotService.computeChecksum(snapshot);

    // 3. Update report with snapshot data, checksum, and timestamp
    const updatedReports = await db.update(financialReports)
      .set({
        status: 'pending_daf_approval',
        locked: true,
        reportData: snapshot,
        snapshotChecksum: checksum,
        snapshotTimestamp: new Date(),
        submittedBy: userId,
        submittedAt: new Date(),
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(financialReports.id, reportId))
      .returning();

    if (updatedReports.length === 0) {
      throw new Error('Failed to update report status');
    }

    // 4. Create initial version "1.0"
    await versionService.createVersion(
      reportId,
      "1.0",
      snapshot,
      checksum,
      userId,
      "Initial submission for approval"
    );

    // 5. Lock the reporting period to prevent back-dating
    await periodLockService.lockPeriod(
      report.reportingPeriodId,
      report.projectId,
      report.facilityId,
      userId,
      "Report submitted for approval"
    );

    // 6. Log the action
    await this.logAction(reportId, 'submitted', userId);

    // 7. Notify DAF users (Requirement 1.4)
    await notificationService.notifyDafUsers(reportId, updatedReports[0].title);

    return {
      success: true,
      message: 'Report submitted for DAF approval with snapshot captured',
      report: updatedReports[0]
    };
  }

  /**
   * DAF approves a report
   * Requirements: 2.1-2.4
   */
  async dafApprove(reportId: number, userId: number, comment?: string): Promise<WorkflowActionResult> {
    // Validate action is allowed
    const validation = await this.canDafApprove(reportId, userId);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Cannot approve report');
    }

    // Update report status
    const updatedReports = await db.update(financialReports)
      .set({
        status: 'approved_by_daf',
        locked: true,
        dafId: userId,
        dafApprovedAt: new Date(),
        dafComment: comment || null,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(financialReports.id, reportId))
      .returning();

    if (updatedReports.length === 0) {
      throw new Error('Failed to update report status');
    }

    // Log the action
    await this.logAction(reportId, 'daf_approved', userId, comment);

    // Notify DG users (Requirement 2.4)
    await notificationService.notifyDgUsers(reportId, updatedReports[0].title);

    return {
      success: true,
      message: 'Report approved by DAF',
      report: updatedReports[0]
    };
  }

  /**
   * DAF rejects a report
   * Requirements: 2.5-2.8
   */
  async dafReject(reportId: number, userId: number, comment: string): Promise<WorkflowActionResult> {
    // Validate comment is provided
    if (!comment || comment.trim().length === 0) {
      throw new Error('Rejection comment is required');
    }

    // Validate action is allowed
    const validation = await this.canDafReject(reportId, userId);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Cannot reject report');
    }

    // Update report status and unlock it
    const updatedReports = await db.update(financialReports)
      .set({
        status: 'rejected_by_daf',
        locked: false,
        dafId: userId,
        dafApprovedAt: new Date(),
        dafComment: comment.trim(),
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(financialReports.id, reportId))
      .returning();

    if (updatedReports.length === 0) {
      throw new Error('Failed to update report status');
    }

    // Log the action
    await this.logAction(reportId, 'daf_rejected', userId, comment);

    // Notify report creator (Requirement 2.8)
    await notificationService.notifyReportCreator(reportId, 'rejected_by_daf', comment);

    return {
      success: true,
      message: 'Report rejected by DAF',
      report: updatedReports[0]
    };
  }

  /**
   * DG provides final approval for a report
   * Requirements: 3.1-3.5
   */
  async dgApprove(reportId: number, userId: number, comment?: string): Promise<WorkflowActionResult> {
    // Validate action is allowed
    const validation = await this.canDgApprove(reportId, userId);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Cannot approve report');
    }

    // Get the full report data for PDF generation
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId)
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Generate PDF snapshot
    let pdfUrl: string | null = null;
    try {
      pdfUrl = await pdfGenerationService.generateAndSavePdf(report as any);
    } catch (error) {
      console.error('PDF generation failed:', error);
      // Continue with approval even if PDF generation fails
      // This ensures the workflow isn't blocked by PDF issues
    }

    // Update report status and lock permanently
    const updatedReports = await db.update(financialReports)
      .set({
        status: 'fully_approved',
        locked: true,
        dgId: userId,
        dgApprovedAt: new Date(),
        dgComment: comment || null,
        finalPdfUrl: pdfUrl,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(financialReports.id, reportId))
      .returning();

    if (updatedReports.length === 0) {
      throw new Error('Failed to update report status');
    }

    // Log the action
    await this.logAction(reportId, 'dg_approved', userId, comment);

    // Notify report creator of full approval (optional, good practice)
    await notificationService.notifyReportCreator(reportId, 'fully_approved');

    return {
      success: true,
      message: 'Report fully approved by DG',
      report: updatedReports[0]
    };
  }

  /**
   * DG rejects a report
   * Requirements: 3.6-3.8
   */
  async dgReject(reportId: number, userId: number, comment: string): Promise<WorkflowActionResult> {
    // Validate comment is provided
    if (!comment || comment.trim().length === 0) {
      throw new Error('Rejection comment is required');
    }

    // Validate action is allowed
    const validation = await this.canDgReject(reportId, userId);
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Cannot reject report');
    }

    // Update report status and unlock it
    const updatedReports = await db.update(financialReports)
      .set({
        status: 'rejected_by_dg',
        locked: false,
        dgId: userId,
        dgApprovedAt: new Date(),
        dgComment: comment.trim(),
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(financialReports.id, reportId))
      .returning();

    if (updatedReports.length === 0) {
      throw new Error('Failed to update report status');
    }

    // Log the action
    await this.logAction(reportId, 'dg_rejected', userId, comment);

    // Notify report creator (Requirement 3.8)
    await notificationService.notifyReportCreator(reportId, 'rejected_by_dg', comment);

    return {
      success: true,
      message: 'Report rejected by DG',
      report: updatedReports[0]
    };
  }

  // ============================================================================
  // WORKFLOW LOGGING METHODS
  // ============================================================================

  /**
   * Logs a workflow action to the audit trail
   * Requirements: 5.1-5.2
   */
  async logAction(
    reportId: number, 
    action: WorkflowAction, 
    actorId: number, 
    comment?: string
  ): Promise<void> {
    await db.insert(financialReportWorkflowLogs)
      .values({
        reportId,
        action,
        actorId,
        comment: comment || null
      });
  }

  /**
   * Retrieves workflow logs for a report
   * Requirements: 5.3-5.5
   */
  async getWorkflowLogs(reportId: number): Promise<WorkflowLogWithActor[]> {
    const logs = await db.query.financialReportWorkflowLogs.findMany({
      where: eq(financialReportWorkflowLogs.reportId, reportId),
      with: {
        actor: {
          columns: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: (logs, { asc }) => [asc(logs.timestamp)]
    });

    return logs.map(log => ({
      id: log.id,
      reportId: log.reportId,
      action: log.action,
      actorId: log.actorId,
      comment: log.comment,
      timestamp: log.timestamp.toISOString(),
      actor: log.actor ? {
        id: log.actor.id,
        name: log.actor.name,
        email: log.actor.email
      } : undefined
    }));
  }

  // ============================================================================
  // REPORT LOCKING METHODS
  // ============================================================================

  /**
   * Locks a report to prevent editing
   * Requirements: 6.1-6.2
   */
  async lockReport(reportId: number): Promise<void> {
    await db.update(financialReports)
      .set({ locked: true })
      .where(eq(financialReports.id, reportId));
  }

  /**
   * Unlocks a report to allow editing
   * Requirements: 6.3
   */
  async unlockReport(reportId: number): Promise<void> {
    await db.update(financialReports)
      .set({ locked: false })
      .where(eq(financialReports.id, reportId));
  }

  /**
   * Checks if a report is locked
   * Requirements: 6.5
   */
  async isLocked(reportId: number): Promise<boolean> {
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
      columns: { locked: true }
    });

    return report?.locked ?? false;
  }
}

// Export singleton instance
export const financialReportWorkflowService = new FinancialReportWorkflowService();
