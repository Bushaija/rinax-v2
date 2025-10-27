"use client";

import { Button } from "@/components/ui/button";
import { Download, FileText, Send, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Table } from "@tanstack/react-table";
import type { PlanningActivity } from "./planning-table-columns";
import { FacilityFilterDialog } from "@/features/shared/facility-filter-dialog2";
import type { CreatePlanArgs } from "@/types/facility";
import { useGetCurrentReportingPeriod } from "@/hooks/queries";
import { useUser } from "@/components/providers/session-provider";
import { useApprovalErrorHandler } from "@/hooks/use-approval-error-handler";
import { submitForApproval } from "@/api-client/planning-approval";

interface PlanningTableToolbarActionsProps {
  table: Table<PlanningActivity>;
  programs: any[];
  getFacilityTypes: (program?: string) => any[];
  districtId: number | undefined;
  onRefresh?: () => void;
}

export function PlanningTableToolbarActions({ 
  table, 
  programs, 
  getFacilityTypes,
  districtId,
  onRefresh,
}: PlanningTableToolbarActionsProps) {
  const router = useRouter();
  const user = useUser();
  const { handleError, handleSuccess } = useApprovalErrorHandler();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  
  // Get selected rows and filter for DRAFT status
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedDraftPlans = selectedRows.filter(
    (row) => row.original.approvalStatus === "DRAFT"
  );
  
  const canSubmit = user?.role === "accountant" && selectedDraftPlans.length > 0;

  const handleCreatePlan = (args: CreatePlanArgs) => {
    // Navigate to create page with the selected parameters
    const searchParams = new URLSearchParams({
      projectType: args.projectId || "",
      facilityId: String(args.facilityId),
      facilityType: args.facilityType,
      facilityName: args.facilityName || "",
      program: args.program || "",
      // Use the reportingPeriodId from args (selected in dialog), fallback to current
      reportingPeriodId: args.reportingPeriodId?.toString() || currentReportingPeriod?.id.toString() || "1",
    });

    router.push(`/dashboard/planning/new?${searchParams.toString()}`);
    setDialogOpen(false);
  };

  const handleExportAll = () => {
    // TODO: Implement export all functionality
    console.log("Export all planning activities");
  };

  const handleGenerateReport = () => {
    // TODO: Implement report generation
    console.log("Generate comprehensive report");
  };
  
  const handleSubmitForApproval = async () => {
    if (selectedDraftPlans.length === 0) {
      handleError(new Error("No draft plans selected"), "submit plans");
      return;
    }

    try {
      setIsSubmitting(true);
      const planningIds = selectedDraftPlans.map((row) => row.original.id);
      
      const result = await submitForApproval(planningIds);
      
      // Show success message
      handleSuccess(
        "Success",
        `${result.updatedCount} plan(s) submitted for approval`
      );
      
      // Reset row selection
      table.resetRowSelection();
      
      // Refresh table data
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      // Use centralized error handler with context
      handleError(error, "submit plans for approval");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <FacilityFilterDialog
        label="New Plan"
        mode="planning"
        programs={programs}
        getFacilityTypes={getFacilityTypes}
        onCreate={handleCreatePlan}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        districtId={districtId}
      />
      
      {canSubmit && (
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmitForApproval}
          disabled={isSubmitting}
          className="h-8"
          aria-label={`Submit ${selectedDraftPlans.length} plan(s) for approval`}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isSubmitting 
            ? "Submitting..." 
            : `Submit for Approval (${selectedDraftPlans.length})`}
        </Button>
      )}

      <Button
        onClick={handleExportAll}
        variant="outline"
        size="sm"
        className="h-8"
      >
        <Download className="mr-2 h-4 w-4" />
        Export All
      </Button>

      <Button
        onClick={handleGenerateReport}
        variant="outline"
        size="sm"
        className="h-8"
      >
        <FileText className="mr-2 h-4 w-4" />
        Generate Report
      </Button>
    </div>
  );
}