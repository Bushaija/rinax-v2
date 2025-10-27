"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import type { DataTableRowAction } from "@/types/data-table";
import { PlanningTableActionBar } from "./planning-table-action-bar";
import { PlanningTableToolbarActions } from "./planning-table-toolbar-actions";
import { getPlanningTableColumns, type PlanningActivity } from "./planning-table-columns";
import useGetPlanningActivities from "@/hooks/queries/planning/use-get-planning-activities";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanningTableProps {
  initialData?: {
    data: PlanningActivity[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  programs?: any[];
  getFacilityTypes?: (program?: string) => any[];
  districtId: number | undefined;
  reportingPeriodId?: number;
}

export function PlanningTable({ 
  initialData, 
  programs = [], 
  getFacilityTypes = () => [],
  districtId,
  reportingPeriodId,
}: PlanningTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rowAction, setRowAction] = React.useState<DataTableRowAction<PlanningActivity> | null>(null);

  // Extract filter parameters from URL
  const currentPage = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('perPage')) || 10;
  const facilityNameFilter = searchParams.get('facilityName') || '';
  const facilityTypeFilter = searchParams.get('facilityType') || '';
  const projectTypeFilter = searchParams.get('projectType') || '';
  const search = searchParams.get('search') || '';

  // Refresh function to refetch data
  const handleRefresh = React.useCallback(() => {
    // The useGetPlanningActivities hook will automatically refetch when we trigger a refresh
    window.location.reload();
  }, []);

  const columns = React.useMemo(
    () => getPlanningTableColumns({ setRowAction, router, onRefresh: handleRefresh }),
    [setRowAction, router, handleRefresh]
  );

  // Build filter object for the API call
  const filters = React.useMemo(() => {
    const filterObj: Record<string, any> = {};
    
    if (facilityNameFilter) {
      filterObj.facilityName = facilityNameFilter;
    }
    
    if (facilityTypeFilter) {
      filterObj.facilityType = facilityTypeFilter;
    }
    
    if (projectTypeFilter) {
      filterObj.projectType = projectTypeFilter;
    }
    
    return filterObj;
  }, [facilityNameFilter, facilityTypeFilter, projectTypeFilter]);

  // Use the hook to get planning activities data with pagination and filters
  const { data, isLoading, error } = useGetPlanningActivities({
    page: currentPage,
    limit: pageSize,
    search,
    reportingPeriodId,
    ...filters,
  });

  const planningActivities = data?.data || initialData?.data || [];
  const pageCount = data?.pagination?.totalPages || initialData?.pagination?.totalPages || 1;

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data: planningActivities,
    columns,
    pageCount: pageCount,
    enableAdvancedFilter: false,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { right: ["actions"] },
      pagination: { 
        pageIndex: currentPage - 1,
        pageSize: pageSize 
      },
    },
    getRowId: (originalRow) => originalRow.id.toString(),
    shallow: true,
    clearOnDefault: true,
    history: "push",
  });

  if (isLoading) {
    return (
      <DataTableSkeleton
        columnCount={8}
        rowCount={10}
        filterCount={3}
        cellWidths={["50px", "200px", "150px", "180px", "120px", "120px", "120px", "80px"]}
        withViewOptions={false}
        withPagination={true}
        shrinkZero={false}
      />
    );
  }

  if (error) {
    console.error("Error loading planning activities:", error);
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Planning Activities</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>{error.message || 'Failed to load planning activities. Please try again.'}</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <DataTable
        table={table}
        actionBar={<PlanningTableActionBar table={table} />}
      >
        <DataTableToolbar table={table}>
          <PlanningTableToolbarActions 
            table={table} 
            programs={programs}
            getFacilityTypes={getFacilityTypes}
            districtId={districtId}
            onRefresh={handleRefresh}
          />
        </DataTableToolbar>
      </DataTable>
    </>
  );
}