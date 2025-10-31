"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Loader2, Building2, MapPin, CheckCircle, User } from "lucide-react";
import { DgReviewCard } from "@/components/financial-reports/dg-review-card";
import { FinalApprovalActionsCard } from "@/components/financial-reports/final-approval-actions-card";
import { WorkflowTimeline } from "@/components/financial-reports/workflow-timeline";
import { ApprovalCommentDialog } from "@/components/financial-reports/approval-comment-dialog";
import { dgApprove, dgReject, getWorkflowLogs } from "@/fetchers/financial-reports";
import { useGetDgQueue } from "@/hooks/queries/financial-reports";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";

export default function DgApprovalQueuePage() {
  const queryClient = useQueryClient();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    action: "approve" | "reject";
  }>({ open: false, action: "approve" });

  // Get hierarchy context
  const { 
    accessibleFacilities, 
    userFacilityId,
  } = useHierarchyContext();

  // Get user's facility from accessible facilities
  const userFacility = accessibleFacilities.find(f => f.id === userFacilityId);

  // Fetch DG queue using the new endpoint
  const { data: queueData, isLoading: isLoadingReports } = useGetDgQueue();

  // Fetch workflow logs for selected report
  const { data: workflowLogsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["workflow-logs", selectedReportId],
    queryFn: () => getWorkflowLogs(selectedReportId!),
    enabled: !!selectedReportId,
  });

  // Approve mutation with hierarchy validation
  const approveMutation = useMutation({
    mutationFn: ({ reportId, comment }: { reportId: number; comment?: string }) =>
      dgApprove(reportId, comment),
    onSuccess: () => {
      toast.success("Report approved successfully - Final approval complete");
      queryClient.invalidateQueries({ queryKey: ["financial-reports", "dg-queue"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-logs"] });
      setDialogState({ open: false, action: "approve" });
      setSelectedReportId(null);
    },
    onError: (error: Error) => {
      const errorMessage = error.message.includes("hierarchy")
        ? "Access denied: This report is outside your facility hierarchy"
        : `Failed to approve report: ${error.message}`;
      toast.error(errorMessage);
    },
  });

  // Reject mutation with hierarchy validation
  const rejectMutation = useMutation({
    mutationFn: ({ reportId, comment }: { reportId: number; comment: string }) =>
      dgReject(reportId, comment),
    onSuccess: () => {
      toast.success("Report rejected successfully");
      queryClient.invalidateQueries({ queryKey: ["financial-reports", "dg-queue"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-logs"] });
      setDialogState({ open: false, action: "reject" });
      setSelectedReportId(null);
    },
    onError: (error: Error) => {
      const errorMessage = error.message.includes("hierarchy")
        ? "Access denied: This report is outside your facility hierarchy"
        : `Failed to reject report: ${error.message}`;
      toast.error(errorMessage);
    },
  });

  const handleApprove = () => {
    setDialogState({ open: true, action: "approve" });
  };

  const handleReject = () => {
    setDialogState({ open: true, action: "reject" });
  };

  const handleConfirmAction = async (comment?: string) => {
    if (!selectedReportId) return;

    if (dialogState.action === "approve") {
      await approveMutation.mutateAsync({ reportId: selectedReportId, comment });
    } else {
      if (!comment) {
        toast.error("Comment is required for rejection");
        return;
      }
      await rejectMutation.mutateAsync({ reportId: selectedReportId, comment });
    }
  };

  const selectedReport = queueData?.reports?.find((r: any) => r.id === selectedReportId);
  const pendingReports = queueData?.reports || [];
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-8 h-full">
      <div className="space-y-6">
        {/* Header with Hierarchy Context */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">DG Final Approval Queue</h1>
            </div>
            <p className="text-muted-foreground">
              Provide final approval for DAF-approved financial reports from your facility hierarchy
            </p>
          </div>
        </div>

        {/* Hierarchy Context Card */}
        {userFacility && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{userFacility.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {userFacility.facilityType === 'health_center' ? 'Health Center' : 'Hospital'}
                    </Badge>
                  </div>
                  {userFacility.districtName && (
                    <div className="flex items-center gap-2 ml-6">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {userFacility.districtName}
                      </span>
                    </div>
                  )}
                </div>
                {accessibleFacilities && accessibleFacilities.length > 1 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Accessible Facilities</p>
                    <p className="text-2xl font-bold">{accessibleFacilities.length}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoadingReports ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pendingReports.length === 0 ? (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              No reports pending your final approval at this time.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reports List */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Pending Reports ({pendingReports.length})
                  </CardTitle>
                  <CardDescription>
                    Select a report to review
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingReports.map((report: any) => (
                    <DgReviewCard
                      key={report.id}
                      report={report}
                      onClick={() => setSelectedReportId(report.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Review Panel */}
            <div className="lg:col-span-2 space-y-4">
              {selectedReportId ? (
                <>
                  {/* Report Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Report Details</CardTitle>
                      <CardDescription>
                        {selectedReport?.reportCode} - {selectedReport?.title}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Facility Hierarchy Context */}
                      {selectedReport?.facility && (
                        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{selectedReport.facility.name}</span>
                              </div>
                              <div className="flex items-center gap-2 ml-6">
                                {selectedReport.facility.facilityType && (
                                  <Badge variant="outline" className="text-xs">
                                    {selectedReport.facility.facilityType === 'health_center' 
                                      ? 'Health Center' 
                                      : 'Hospital'}
                                  </Badge>
                                )}
                                {selectedReport.facility.district && (
                                  <span className="text-xs text-muted-foreground">
                                    {selectedReport.facility.district.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {selectedReport.submitter && (
                            <div className="text-xs text-muted-foreground border-t pt-2">
                              Submitted by {selectedReport.submitter.name}
                            </div>
                          )}
                        </div>
                      )}

                      {/* DAF Approval Details */}
                      {selectedReport?.dafApprovedAt && (
                        <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-green-900 dark:text-green-100">
                              DAF Approved
                            </span>
                          </div>
                          <div className="ml-7 space-y-1 text-sm">
                            {selectedReport.dafApprover && (
                              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                                <User className="h-4 w-4" />
                                <span>{selectedReport.dafApprover.name}</span>
                              </div>
                            )}
                            <div className="text-green-700 dark:text-green-300">
                              {new Date(selectedReport.dafApprovedAt).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {selectedReport.dafComment && (
                              <div className="pt-2 border-t border-green-200 dark:border-green-800">
                                <p className="text-xs text-muted-foreground">DAF Comment:</p>
                                <p className="text-sm text-green-900 dark:text-green-100">
                                  {selectedReport.dafComment}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Report Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Fiscal Year:</span>
                          <p className="font-medium">{selectedReport?.fiscalYear}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted:</span>
                          <p className="font-medium">
                            {selectedReport?.submittedAt
                              ? new Date(selectedReport.submittedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : "N/A"}
                          </p>
                        </div>
                        {selectedReport?.project && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Project:</span>
                            <p className="font-medium">{selectedReport.project.name}</p>
                          </div>
                        )}
                      </div>

                      <div className="pt-4">
                        <Button
                          variant="outline"
                          onClick={() => window.open(`/dashboard/financial-reports/${selectedReportId}`, "_blank")}
                          className="w-full"
                        >
                          View Full Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Final Approval Actions */}
                  <FinalApprovalActionsCard
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isLoading={isProcessing}
                  />

                  {/* Workflow Timeline */}
                  {isLoadingLogs ? (
                    <Card>
                      <CardContent className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ) : (
                    <WorkflowTimeline logs={workflowLogsData?.logs || []} />
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">
                      Select a report from the list to review
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Approval Comment Dialog */}
      <ApprovalCommentDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState({ ...dialogState, open })}
        action={dialogState.action}
        reportId={selectedReportId || 0}
        onConfirm={handleConfirmAction}
        isLoading={isProcessing}
      />
    </div>
  );
}
