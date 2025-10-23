"use client";

import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Table } from "@tanstack/react-table";
import type { PlanningActivity } from "./planning-table-columns";
import { FacilityFilterDialog } from "@/features/shared/facility-filter-dialog2";
import type { CreatePlanArgs } from "@/types/facility";
import { useGetCurrentReportingPeriod } from "@/hooks/queries";

interface PlanningTableToolbarActionsProps {
  table: Table<PlanningActivity>;
  programs: any[];
  getFacilityTypes: (program?: string) => any[];
  districtId: number | undefined; // ✅ Added districtId
}

export function PlanningTableToolbarActions({ 
  table, 
  programs, 
  getFacilityTypes,
  districtId, // ✅ Now required
}: PlanningTableToolbarActionsProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();

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

  return (
    <div className="flex items-center gap-2">
      <FacilityFilterDialog
        label="New Plan"
        mode="planning" // ✅ Explicit mode
        programs={programs}
        getFacilityTypes={getFacilityTypes}
        onCreate={handleCreatePlan}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        districtId={districtId} // ✅ Pass districtId to dialog
      />

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