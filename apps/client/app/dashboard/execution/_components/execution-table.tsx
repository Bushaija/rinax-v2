"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton"
import { useDataTable } from "@/hooks/use-data-table"
import type { DataTableRowAction } from "@/types/data-table"
import { ExecutionTableActionBar } from "./execution-table-action-bar"
import { ExecutionTableToolbarActions } from "./execution-table-toolbar-actions"
import { getExecutionTableColumns, type ExecutionActivity } from "./execution-table-columns"
import useGetExecutions from "@/hooks/queries/executions/use-get-executions"
import type { PlanningActivity } from "../../planning/_components/planning-table-columns"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"


interface ExecutionTableProps {
  initialData?: {
    data: PlanningActivity[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  programs?: any[]
  getFacilityTypes?: (program?: string) => any[]
  districtId: number
  reportingPeriodId?: number
}

export function ExecutionTable({ 
  initialData,
  programs = [], 
  getFacilityTypes = () => [], 
  districtId,
  reportingPeriodId,
}: ExecutionTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rowAction, setRowAction] = useState<DataTableRowAction<ExecutionActivity> | null>(null)

  // Extract filter parameters from URL (mirroring planning)
  const currentPage = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('perPage')) || 10
  const facilityNameFilter = searchParams.get('facilityName') || ''
  const facilityTypeFilter = searchParams.get('facilityType') || ''
  const projectTypeFilter = searchParams.get('projectType') || ''
  // Back-compat with existing toolbar which uses "program"
  const programParamFallback = searchParams.get('program') || ''
  const search = searchParams.get('search') || ''

  const columns = useMemo(
    () => getExecutionTableColumns({ setRowAction, router }),
    [setRowAction, router]
  )

  // Build filter object for the API call
  const filters = useMemo(() => {
    const filterObj: Record<string, any> = {}

    if (facilityNameFilter) {
      filterObj.facilityName = facilityNameFilter
    }

    if (facilityTypeFilter) {
      filterObj.facilityType = facilityTypeFilter
    }

    const effectiveProjectType = projectTypeFilter || programParamFallback
    if (effectiveProjectType) {
      filterObj.projectType = effectiveProjectType
    }

    return filterObj
  }, [facilityNameFilter, facilityTypeFilter, projectTypeFilter, programParamFallback])

  const { data, isLoading, error } = useGetExecutions({
    page: currentPage,
    limit: pageSize,
    search,
    reportingPeriodId,
    ...filters,
  } as any)

  const executions = (data as any)?.data ?? (initialData?.data as any) ?? []
  const pageCount = (data as any)?.pagination?.totalPages ?? initialData?.pagination?.totalPages ?? 1

  const { table } = useDataTable({
    data: executions,
    columns,
    pageCount,
    enableAdvancedFilter: false,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { right: ["actions"] },
      pagination: { 
        pageIndex: currentPage - 1,
        pageSize: pageSize 
      },
    },
    getRowId: (originalRow) => String((originalRow as ExecutionActivity).id),
    shallow: true,
    clearOnDefault: true,
    history: "push",
  })

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
    )
  }

  if (error) {
    console.error("Error loading execution records:", error)
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Execution Records</AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p>{(error as any)?.message || 'Failed to load execution records. Please try again.'}</p>
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
    )
  }

  return (
    <DataTable 
        table={table} 
        actionBar={<ExecutionTableActionBar table={table} /> }>
      <DataTableToolbar table={table}>
        <ExecutionTableToolbarActions 
          table={table} 
          programs={programs}
          getFacilityTypes={getFacilityTypes}
          districtId={districtId}
        />
      </DataTableToolbar>
    </DataTable>
  )
}


