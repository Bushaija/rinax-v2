"use client"

import React, { useState, useMemo } from 'react'
import { CompiledReport } from '@/features/compilation/compiled-report'
import useGetCompiledExecution from '@/hooks/queries/executions/use-get-compiled-execution'
import useExportCompiledExecution from '@/hooks/mutations/executions/use-export-compiled-execution'
import { ReportSkeleton } from '@/components/skeletons'
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { getCurrentFiscalYear, generateQuarterLabels } from '@/features/execution/utils'
import { Download, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePermissions, useUser } from '@/components/providers/session-provider'
import { useGetCurrentReportingPeriod, useGetReportingPeriods } from '@/hooks/queries'
import { ScopeFilters } from './_components/scope-filters'

// Project configuration
const projectTabs: FilterTab[] = [
  {
    value: 'HIV',
    label: 'HIV',
    content: null
  },
  {
    value: 'Malaria',
    label: 'Malaria',
    content: null
  },
  {
    value: 'TB',
    label: 'TB',
    content: null
  }
]

const getProjectDisplayName = (projectType: string): string => {
  const mapping = {
    'HIV': 'HIV NSP BUDGET SUPPORT',
    'Malaria': 'MALARIA BUDGET SUPPORT',
    'TB': 'TB BUDGET SUPPORT'
  }
  return mapping[projectType as keyof typeof mapping] || 'BUDGET SUPPORT'
}

// Report Header Component
const ReportHeader = ({
  project,
  reportingPeriod,
  facilityCount,
  onExportPDF,
  onExportDOCX,
  isExporting,
  showPreviousFiscalYear,
  onFiscalYearChange,
  canAccessPreviousFiscalYear,
  currentFiscalYear,
  previousFiscalYear
}: {
  project: string
  reportingPeriod?: string
  facilityCount?: number
  onExportPDF: () => void
  onExportDOCX: () => void
  isExporting: boolean
  showPreviousFiscalYear: boolean
  onFiscalYearChange: (checked: boolean) => void
  canAccessPreviousFiscalYear: boolean
  currentFiscalYear?: number
  previousFiscalYear?: number | null
}) => (
  <div className="mb-6">
    <div className="flex items-start justify-between">
      <div className="text-left">
        <h1 className="text-lg font-bold mb-2">
          Compiled Financial Report
          {showPreviousFiscalYear && previousFiscalYear && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (FY {previousFiscalYear})
            </span>
          )}
          {!showPreviousFiscalYear && currentFiscalYear && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (FY {currentFiscalYear})
            </span>
          )}
        </h1>
        <div className="text-gray-600 text-sm space-y-1">
          <p>{project}</p>
          {reportingPeriod && <p>Reporting Period: {reportingPeriod}</p>}
          {facilityCount !== undefined && <p>Facilities: {facilityCount}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-3 items-end">
        {/* Fiscal Year Switcher */}
        {canAccessPreviousFiscalYear && (
          <div className="flex items-center space-x-2">
            <Switch
              id="fiscal-year-compiled-toggle"
              checked={showPreviousFiscalYear}
              onCheckedChange={onFiscalYearChange}
              disabled={!previousFiscalYear}
            />
            <Label htmlFor="fiscal-year-compiled-toggle" className="cursor-pointer text-sm">
              {previousFiscalYear ? `Show FY ${previousFiscalYear}` : 'Previous Fiscal Year'}
            </Label>
          </div>
        )}

        {/* Export Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onExportPDF}
            disabled={isExporting}
            variant="outline"
            size="sm"
          >
            <FileText className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button
            onClick={onExportDOCX}
            disabled={isExporting}
            variant="outline"
            size="sm"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export DOCX'}
          </Button>
        </div>
      </div>
    </div>
  </div>
)

// Tab Content Component that handles loading state
const TabContent = ({
  projectType,
  reportingPeriodId,
  scope,
  provinceId,
  districtId
}: {
  projectType: string
  reportingPeriodId?: number
  scope?: 'district' | 'provincial' | 'country'
  provinceId?: number
  districtId?: number
}) => {
  const { data, isLoading, error } = useGetCompiledExecution({
    projectType: projectType as 'HIV' | 'Malaria' | 'TB',
    reportingPeriodId,
    scope,
    provinceId,
    districtId
  })

  if (isLoading) {
    return <ReportSkeleton />
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error loading report: {error.message}</p>
      </div>
    )
  }

  if (!data?.data) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">No data available for this project type.</p>
      </div>
    )
  }

  return <CompiledReport compiledData={data.data} />
}

export default function AggregatedReportPage() {
  const [selectedTab, setSelectedTab] = useState('HIV')
  const { toast } = useToast()
  const { hasPermission } = usePermissions()
  const user = useUser()
  const canAccessPreviousFiscalYear = hasPermission('access_previous_fiscal_year_data')

  // Check if user is admin (can access provincial and country scopes)
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  // Load persisted filters from localStorage
  const loadPersistedFilters = () => {
    if (typeof window === 'undefined') return {}
    try {
      const saved = localStorage.getItem('compiled-report-filters')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  }

  const persistedFilters = loadPersistedFilters()

  // Scope state for admin users (with localStorage persistence)
  const [scope, setScope] = useState<'district' | 'provincial' | 'country'>(
    persistedFilters.scope || 'district'
  )
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | undefined>(
    persistedFilters.provinceId
  )
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | undefined>(
    persistedFilters.districtId
  )

  // Persist filters to localStorage whenever they change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('compiled-report-filters', JSON.stringify({
        scope,
        provinceId: selectedProvinceId,
        districtId: selectedDistrictId
      }))
    }
  }, [scope, selectedProvinceId, selectedDistrictId])

  // Fiscal year switcher state
  const [showPreviousFiscalYear, setShowPreviousFiscalYear] = useState(false)

  // Fetch current and all reporting periods
  const { data: currentReportingPeriod } = useGetCurrentReportingPeriod()
  const { data: allReportingPeriods } = useGetReportingPeriods()

  // Determine which reporting period to use
  const selectedReportingPeriodId = useMemo(() => {
    if (!showPreviousFiscalYear) {
      return currentReportingPeriod?.id
    }

    // Find previous fiscal year (year before current)
    const periodsData = (allReportingPeriods as any)?.data || allReportingPeriods
    const periods = Array.isArray(periodsData) ? periodsData : []
    const currentYear = currentReportingPeriod?.year

    if (currentYear && periods.length > 0) {
      const previousPeriod = periods.find((p: any) => p.year === currentYear - 1)
      return previousPeriod?.id
    }

    return currentReportingPeriod?.id
  }, [showPreviousFiscalYear, currentReportingPeriod, allReportingPeriods])

  // Determine fiscal year & Q1 period using shared utils
  const currentFY = getCurrentFiscalYear().toString()
  const q1 = generateQuarterLabels(Number(currentFY))[0].line2
  const currentPeriod = q1.replace(/[()]/g, "")

  const currentFiscalYear = currentReportingPeriod?.year
  const previousFiscalYear = currentFiscalYear ? currentFiscalYear - 1 : null

  // Fetch data for the selected tab to get metadata
  const { data } = useGetCompiledExecution({
    projectType: selectedTab as 'HIV' | 'Malaria' | 'TB',
    reportingPeriodId: selectedReportingPeriodId,
    scope,
    provinceId: scope === 'provincial' ? selectedProvinceId : undefined,
    districtId: scope === 'district' ? selectedDistrictId : undefined
  })

  // Export mutation
  const { mutate: exportReport, isPending: isExporting } = useExportCompiledExecution()

  // Handle PDF export
  const handleExportPDF = () => {
    const fiscalYearSuffix = showPreviousFiscalYear && previousFiscalYear ? `-FY${previousFiscalYear}` : ''
    const filename = `${selectedTab.toLowerCase()}-compiled-report${fiscalYearSuffix}-${new Date().toISOString().split('T')[0]}.pdf`

    exportReport(
      {
        query: {
          projectType: selectedTab as 'HIV' | 'Malaria' | 'TB',
          format: 'pdf',
          filename,
          reportingPeriodId: selectedReportingPeriodId
        },
        filename
      },
      {
        onSuccess: () => {
          toast({
            title: 'Export Successful',
            description: `PDF report has been downloaded as ${filename}`,
          })
        },
        onError: (error) => {
          toast({
            title: 'Export Failed',
            description: error.message || 'Failed to export PDF report',
            variant: 'destructive',
          })
        }
      }
    )
  }

  // Handle DOCX export
  const handleExportDOCX = () => {
    const fiscalYearSuffix = showPreviousFiscalYear && previousFiscalYear ? `-FY${previousFiscalYear}` : ''
    const filename = `${selectedTab.toLowerCase()}-compiled-report${fiscalYearSuffix}-${new Date().toISOString().split('T')[0]}.docx`

    exportReport(
      {
        query: {
          projectType: selectedTab as 'HIV' | 'Malaria' | 'TB',
          format: 'docx',
          filename,
          reportingPeriodId: selectedReportingPeriodId
        },
        filename
      },
      {
        onSuccess: () => {
          toast({
            title: 'Export Successful',
            description: `DOCX report has been downloaded as ${filename}`,
          })
        },
        onError: (error) => {
          toast({
            title: 'Export Failed',
            description: error.message || 'Failed to export DOCX report',
            variant: 'destructive',
          })
        }
      }
    )
  }

  // Create tabs with content that handles its own loading state
  const tabsWithContent = projectTabs.map(tab => ({
    ...tab,
    content: (
      <TabContent
        projectType={tab.value}
        reportingPeriodId={selectedReportingPeriodId}
        scope={scope}
        provinceId={scope === 'provincial' ? selectedProvinceId : undefined}
        districtId={scope === 'district' ? selectedDistrictId : undefined}
      />
    )
  }))

  return (
    <div className="container mx-auto py-4">
      {/* Report Header */}
      <ReportHeader
        project={getProjectDisplayName(selectedTab)}
        reportingPeriod={data?.meta?.reportingPeriod || currentPeriod}
        facilityCount={data?.meta?.facilityCount}
        onExportPDF={handleExportPDF}
        onExportDOCX={handleExportDOCX}
        isExporting={isExporting}
        showPreviousFiscalYear={showPreviousFiscalYear}
        onFiscalYearChange={setShowPreviousFiscalYear}
        canAccessPreviousFiscalYear={canAccessPreviousFiscalYear}
        currentFiscalYear={currentFiscalYear}
        previousFiscalYear={previousFiscalYear}
      />

      {/* Scope Filters */}
      {isAdmin && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <ScopeFilters
            scope={scope}
            onScopeChange={setScope}
            provinceId={selectedProvinceId}
            onProvinceChange={setSelectedProvinceId}
            districtId={selectedDistrictId}
            onDistrictChange={setSelectedDistrictId}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Filter Tabs with Report Content */}
      <FilterTabs
        tabs={tabsWithContent}
        value={selectedTab}
        onValueChange={setSelectedTab}
        defaultValue="HIV"
      />
    </div>
  )
}