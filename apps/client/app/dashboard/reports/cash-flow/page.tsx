"use client";

import React, { useRef, useState, useEffect } from 'react';
import { FinancialStatementHeader } from '@/components/reports/financial-statement-header';
import { CashFlowStatement } from '@/features/reports/cash-flow';
import { ReportSkeleton } from '@/components/skeletons';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { getCurrentFiscalYear } from '@/features/execution/utils';
import useGenerateStatement from '@/hooks/mutations/financial-reports/use-generate-statement';
import { useToast } from '@/hooks/use-toast';
import { transformStatementData } from '../utils/transform-statement-data';

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
const TabContent = ({ tabValue, periodId }: { tabValue: string; periodId: number }) => {
  const [statementData, setStatementData] = useState<any>(null);
  const { mutate: generateStatement, isPending, isError } = useGenerateStatement();
  const { toast } = useToast();

  const projectTypeMapping: Record<string, 'HIV' | 'Malaria' | 'TB'> = {
    'hiv': 'HIV',
    'malaria': 'Malaria',
    'tb': 'TB'
  };

  useEffect(() => {
    if (periodId) {
      generateStatement(
        {
          statementCode: "CASH_FLOW",
          reportingPeriodId: periodId,
          projectType: projectTypeMapping[tabValue],
          includeComparatives: true,
        },
        {
          onSuccess: (data) => {
            setStatementData(data.statement);
          },
          onError: (error) => {
            toast({
              title: "Failed to generate statement",
              description: error.message,
              variant: "destructive",
            });
          },
        }
      );
    }
  }, [periodId, tabValue]);

  const currentEndingYear = getCurrentFiscalYear();
  const currentStartYear = currentEndingYear - 1;
  const prevEndingYear = currentEndingYear - 1;
  const prevStartYear = prevEndingYear - 1;

  const periodLabels = {
    currentPeriodLabel: `FY ${currentStartYear}/${currentEndingYear} (Frw)`,
    previousPeriodLabel: `FY ${prevStartYear}/${prevEndingYear} (Frw)`
  };

  if (isPending || !statementData) {
    return <ReportSkeleton />
  }

  if (isError) {
    return <div className="bg-white p-6 rounded-lg border">Failed to load cash flow statement for {tabValue.toUpperCase()}</div>
  }

  // Transform API data to component format
  const transformedData = transformStatementData(statementData.lines ?? []);

  return <CashFlowStatement initialData={transformedData} {...periodLabels} />
}

export default function CashFlowPage() {
  const [selectedTab, setSelectedTab] = useState('hiv')
  const reportContentRef = useRef<HTMLDivElement>(null!)
  
  // For now, use a hardcoded period ID
  // TODO: Implement proper reporting period selection
  const periodId = 2;

  // Create tabs with content that handles its own loading state
  const tabsWithContent = projectTabs.map(tab => ({
    ...tab,
    content: <TabContent tabValue={tab.value} periodId={periodId} />
  }))

  return (
    <main className="max-w-6xl mx-auto">
      <div className="">
        {/* 1. Financial Statement Header - Always visible */}
        <div ref={reportContentRef} className="bg-white">
          <FinancialStatementHeader
            statementType="cash-flow"
            selectedProject={selectedTab as 'hiv' | 'malaria' | 'tb'}
            contentRef={reportContentRef}
            reportingPeriodId={periodId}
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


