"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Lock, ArrowLeft, Edit } from "lucide-react";
import { useGetFinancialReportById } from "@/hooks/queries/financial-reports";
import { ApprovalStatusBadge } from "@/components/financial-reports";
import type { ReportStatus } from "@/types/financial-reports-approval";
import { SnapshotIndicator } from "@/components/reports/snapshot-indicator";
import { PeriodLockBadge } from "@/components/reports/period-lock-badge";
import { VersionHistory } from "@/components/reports/version-history";
import { useReportVersions } from "@/hooks/queries/financial-reports/use-report-versions";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportFacilityContext } from "@/components/financial-reports/report-facility-context";
import { FacilityHierarchyTree } from "@/components/facility-hierarchy-tree";

export default function ViewFinancialReportPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = parseInt(params.id as string);

  const { data: report, isLoading, error } = useGetFinancialReportById(reportId);
  const { data: versionsData } = useReportVersions(reportId);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load financial report. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isLocked = report.locked;
  const status = report.status as ReportStatus;
  
  // Determine if we should use snapshot or live data based on report status
  // Draft reports use live data, submitted/approved reports use snapshot data
  const useSnapshot = status !== 'draft';
  
  // Check if there are multiple versions
  const hasMultipleVersions = (versionsData?.versions?.length || 0) > 1;

  return (
    <TooltipProvider>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/financial-reports")}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">View Financial Report</h1>
            </div>
            <p className="text-muted-foreground">
              Report Code: {report.reportCode}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ApprovalStatusBadge status={status} />
            {isLocked && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Locked</span>
              </div>
            )}
            {!isLocked && (
              <Button
                onClick={() => router.push(`/dashboard/financial-reports/${reportId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Facility Context - Shows facility information and hierarchy */}
        {report.facility && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportFacilityContext
              facilityName={report.facility.name}
              facilityType={report.facility.type as "hospital" | "health_center"}
              districtName={report.facility.district || "Unknown District"}
            />
            {report.facilityId && (
              <FacilityHierarchyTree
                facilityId={report.facilityId}
                showTitle={false}
              />
            )}
          </div>
        )}

        {/* Snapshot Indicator - Shows whether report displays live or snapshot data */}
        <div className="flex items-center gap-3">
          <SnapshotIndicator
            isSnapshot={useSnapshot}
            snapshotTimestamp={report.snapshotTimestamp}
            isOutdated={report.isOutdated}
          />
          
          {/* Period Lock Badge - Shows if the reporting period is locked */}
          {report.periodLock && (
            <PeriodLockBadge
              isLocked={report.periodLock.isLocked}
              lockedAt={report.periodLock.lockedAt}
              lockedBy={report.periodLock.lockedBy?.name}
              lockedReason={report.periodLock.lockedReason}
            />
          )}
        </div>

      {/* Lock Status */}
      {isLocked && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertDescription>
            This report is locked and cannot be edited. Reports are locked when they are
            submitted for approval or have been approved.
          </AlertDescription>
        </Alert>
      )}

      {/* Rejection Comment */}
      {(status === "rejected_by_daf" || status === "rejected_by_dg") && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">
              {status === "rejected_by_daf" ? "Rejected by DAF" : "Rejected by DG"}
            </div>
            <div>
              {status === "rejected_by_daf" ? report.dafComment : report.dgComment}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Report Details */}
      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>View the report details below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <div className="text-base">{report.title}</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Report Data</label>
            <pre className="w-full px-3 py-2 border rounded-md bg-muted font-mono text-sm overflow-auto max-h-96">
              {JSON.stringify(report.reportData, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Report Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Project:</span>{" "}
              <span className="font-medium">{report.project?.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Facility:</span>{" "}
              <span className="font-medium">{report.facility?.name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fiscal Year:</span>{" "}
              <span className="font-medium">{report.fiscalYear}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Version:</span>{" "}
              <span className="font-medium">{report.version}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span className="font-medium">
                {new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{" "}
              <span className="font-medium">
                {new Date(report.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Version History - Shows if multiple versions exist */}
      {hasMultipleVersions && (
        <VersionHistory
          reportId={reportId}
          onViewVersion={(versionNumber) => {
            // TODO: Implement version viewing functionality
            console.log("View version:", versionNumber);
          }}
          onCompareVersion={(versionNumber) => {
            // TODO: Implement version comparison navigation
            console.log("Compare version:", versionNumber);
          }}
        />
      )}
      </div>
    </TooltipProvider>
  );
}
