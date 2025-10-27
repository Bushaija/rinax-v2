"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { DafReviewCard } from "@/components/financial-reports/daf-review-card";
import { ApprovalActionsCard } from "@/components/financial-reports/approval-actions-card";
import { WorkflowTimeline } from "@/components/financial-reports/workflow-timeline";
import { ApprovalCommentDialog } from "@/components/financial-reports/approval-comment-dialog";
import { getFinancialReports, dafApprove, dafReject, getWorkflowLogs } from "@/fetchers/financial-reports";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function DafApprovalQueuePage() {
  const queryClient = useQueryClient();
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    action: "approve" | "reject";
  }>({ open: false, action: "approve" });

  // Fetch pending reports
  const { data: reportsData, isLoading: isLoadingReports } = useQuery({
    queryKey: ["financial-reports", "pending_daf_approval"],
    queryFn: () => getFinancialReports({ status: "pending_daf_approval" }),
  });

  // Fetch workflow logs for selected report
  const { data: workflowLogsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["workflow-logs", selectedReportId],
    queryFn: () => getWorkflowLogs(selectedReportId!),
    enabled: !!selectedReportId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ reportId, comment }: { reportId: number; comment?: string }) =>
      dafApprove(reportId, comment),
    onSuccess: () => {
      toast.success("Report approved successfully");
      queryClient.invalidateQueries({ queryKey: ["financial-reports"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-logs"] });
      setDialogState({ open: false, action: "approve" });
      setSelectedReportId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve report: ${error.message}`);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ reportId, comment }: { reportId: number; comment: string }) =>
      dafReject(reportId, comment),
    onSuccess: () => {
      toast.success("Report rejected successfully");
      queryClient.invalidateQueries({ queryKey: ["financial-reports"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-logs"] });
      setDialogState({ open: false, action: "reject" });
      setSelectedReportId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject report: ${error.message}`);
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

  const selectedReport = reportsData?.reports?.find((r: any) => r.id === selectedReportId);
  const pendingReports = reportsData?.reports || [];
  const isProcessing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-8 h-full">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">DAF Approval Queue</h1>
            </div>
            <p className="text-muted-foreground">
              Review and approve financial reports pending your approval
            </p>
          </div>
        </div>

        {isLoadingReports ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pendingReports.length === 0 ? (
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              No reports pending your approval at this time.
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
                    <DafReviewCard
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
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Fiscal Year:</span>
                          <p className="font-medium">{selectedReport?.fiscalYear}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted:</span>
                          <p className="font-medium">
                            {selectedReport?.submittedAt
                              ? new Date(selectedReport.submittedAt).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        {selectedReport?.facility && (
                          <div>
                            <span className="text-muted-foreground">Facility:</span>
                            <p className="font-medium">{selectedReport.facility.name}</p>
                          </div>
                        )}
                        {selectedReport?.project && (
                          <div>
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

                  {/* Approval Actions */}
                  <ApprovalActionsCard
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
