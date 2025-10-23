"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import type { ExecutionActivity } from "./execution-table-columns"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { FacilityFilterDialog } from "@/features/shared/facility-filter-dialog2"
import { useUser } from "@/components/providers/session-provider"
import type { CreateExecutionArgs } from "@/types/facility";
import { useGetCurrentReportingPeriod } from "@/hooks/queries/reporting-period/use-get-current-reporting-period"

interface ExecutionTableToolbarActionsProps {
  table: Table<ExecutionActivity>;
  programs: any[];
  getFacilityTypes: (program?: string) => any[];
  districtId: number;
  quarter?: string;
}

export function ExecutionTableToolbarActions({ 
  table, 
  programs, 
  getFacilityTypes,
  districtId,
}: ExecutionTableToolbarActionsProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const user = useUser();
  const isAccountant = (user as any)?.role === 'accountant';
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod();
  const handleCreateExecution = (args: CreateExecutionArgs) => {
    // Navigate to create page with the selected parameters
    const searchParams = new URLSearchParams({
      projectId: args.projectId || '',
      facilityId: args.facilityId,
      facilityType: args.facilityType,
      facilityName: args.facilityName || '',
      program: args.program || '',
      // Use the reportingPeriodId from args (selected in dialog), fallback to current
      reportingPeriodId: args.reportingPeriodId?.toString() || currentReportingPeriod?.id?.toString() || '',
      quarter: args.quarter || 'Q1'
    });
    
    router.push(`/dashboard/execution/new?${searchParams.toString()}`);
    setDialogOpen(false);
  };

  const handleExportAll = () => {
    // TODO: Implement export all functionality
    console.log("Export all executioon activities");
  };

  const handleGenerateReport = () => {
    // TODO: Implement report generation
    console.log("Generate comprehensive report");
  };

  return (
    <div className="flex items-center gap-2">
      {isAccountant ? (
        <FacilityFilterDialog
          label="New Execution"
          mode="execution"
          programs={programs}
          getFacilityTypes={getFacilityTypes}
          onCreate={handleCreateExecution}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          districtId={districtId}
        />
      ) : (
        <Button variant="outline" size="sm" className="h-8" disabled>
          New Execution
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

