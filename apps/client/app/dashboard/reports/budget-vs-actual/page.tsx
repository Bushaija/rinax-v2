"use client";

import React, { useRef, useState, useEffect } from 'react';
import { FinancialStatementHeader } from '@/components/reports/financial-statement-header';
import { BudgetVsActualStatement } from '@/features/reports/budget-vs-actual';
import { ReportSkeleton } from '@/components/skeletons';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { getCurrentFiscalYear } from '@/features/execution/utils';
import useGenerateStatement from '@/hooks/mutations/financial-reports/use-generate-statement';
import { useToast } from '@/hooks/use-toast';
import { transformBudgetVsActualData } from '../utils/transform-statement-data';

// Project configuration
const projectTabs: FilterTab[] = [
  {
    value: 'hiv',
    label: 'HIV',
    content: null // Will be populated with the report component
  },
  {
    value: 'malaria', 
    label: 'Malaria',
    content: null
  },
  {
    value: 'tb',
    label: 'TB',
    content: null
  }
]

// Tab Content Component that handles loading state
const TabContent = ({ tabValue, periodId, facilityId }: { tabValue: string; periodId: number; facilityId?: number }) => {
  const [statementData, setStatementData] = useState<any>(null);
  const { toast } = useToast();

  const projectTypeMapping: Record<string, 'HIV' | 'Malaria' | 'TB'> = {
    'hiv': 'HIV',
    'malaria': 'Malaria',
    'tb': 'TB'
  };

  const { mutate: generateStatement, isPending, isError, error } = useGenerateStatement({
    onSuccess: (data) => {
      setStatementData(data.statement);
    },
    onError: (error) => {
      console.error('Failed to generate statement:', error);
      toast({
        title: "Failed to generate statement",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (periodId) {
      setStatementData(null); // Reset data when switching tabs
      generateStatement({
        statementCode: "BUDGET_VS_ACTUAL",
        reportingPeriodId: periodId,
        projectType: projectTypeMapping[tabValue],
        facilityId: facilityId,
        includeComparatives: true,
        customMappings: {}, // Add empty custom mappings as per API
      });
    }
  }, [periodId, tabValue, facilityId, generateStatement]);

  if (isPending || !statementData) {
    return <ReportSkeleton />
  }

  if (isError) {
    return (
      <div className="bg-white p-6 rounded-lg border border-red-200">
        <div className="text-red-600 font-medium">Failed to load budget vs actual report for {tabValue.toUpperCase()}</div>
        <div className="text-red-500 text-sm mt-2">{error?.message}</div>
      </div>
    );
  }

  // Transform API data to component format
  const transformedData = transformBudgetVsActualData(statementData.lines ?? []);

  return <BudgetVsActualStatement initialData={transformedData} />
}

export default function BudgetVsActualPage() {
  const [selectedTab, setSelectedTab] = useState('hiv')
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | undefined>(20) // Default facility
  const reportContentRef = useRef<HTMLDivElement>(null!)
  
  // For now, use a hardcoded period ID
  // TODO: Implement proper reporting period selection
  const periodId = 2;

  // Create tabs with content that handles its own loading state
  const tabsWithContent = projectTabs.map(tab => ({
    ...tab,
    content: <TabContent tabValue={tab.value} periodId={periodId} facilityId={selectedFacilityId} />
  }))

  const currentEndingYear = getCurrentFiscalYear();

  return (
    <main className="max-w-6xl mx-auto">
      <div className="">
        {/* 1. Financial Statement Header - Always visible */}
        <div ref={reportContentRef} className="bg-white">
          <FinancialStatementHeader
            statementType="budget-vs-actual"
            selectedProject={selectedTab as 'hiv' | 'malaria' | 'tb'}
            contentRef={reportContentRef}
            period={currentEndingYear}
            reportingPeriodId={periodId}
            facilityId={selectedFacilityId}
          />
        
          {/* 2. Filter Tabs - Always visible */}
          <FilterTabs
            tabs={tabsWithContent}
            value={selectedTab}
            onValueChange={setSelectedTab}
            defaultValue="hiv"
          />
        </div>
      </div>
    </main>
  )
} 
