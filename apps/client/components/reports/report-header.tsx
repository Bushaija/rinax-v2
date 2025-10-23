"use client";

import React from 'react';
import { useGetFacilityById } from "@/hooks/queries";
import { authClient } from '@/lib/auth';
import { APIExportButton } from '@/components/reports/api-export-button';

type StatementCode = 'REV_EXP' | 'ASSETS_LIAB' | 'CASH_FLOW' | 'NET_ASSETS_CHANGES' | 'BUDGET_VS_ACTUAL';
type ProjectType = 'HIV' | 'Malaria' | 'TB';

type ReportHeaderProps = {
  program: string;
  reportName: string;
  period: number;
  contentRef: React.RefObject<HTMLDivElement>;
  fileName: string;
  statementCode: StatementCode;
  projectType: ProjectType;
  reportingPeriodId: number;
  facilityId?: number;
};

export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (text: string) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

export function ReportHeader({ 
  program, 
  reportName, 
  period, 
  contentRef, 
  fileName,
  statementCode,
  projectType,
  reportingPeriodId,
  facilityId: propFacilityId
}: ReportHeaderProps) {
  const { data: session } = authClient.useSession();
  
  const sessionFacilityId = session?.user?.facilityId;
  const facilityId = propFacilityId ?? sessionFacilityId;
  const { data: facility } = useGetFacilityById(facilityId ?? 0, !!facilityId);
  const facilityName: string | undefined = (facility as { name?: string } | undefined)?.name;

  return (
    <div className="flex items-end justify-between  text-left mb-8">
      <div className="flex flex-col justify-between">
      <h3 className="text-lg font-semibold text-gray-900 mt-2">{reportName}</h3>
      <h2 className="text-sm text-gray-600">
        {program}
        {facilityName ? `${toTitleCase(facilityName)} Hospital` : "loading..."}
      </h2>
      <p className="text-sm text-gray-600">{`Annual Financial Statement for the year ended July 31 ${String(period)}`}</p>
      </div>
      <APIExportButton
        statementCode={statementCode}
        projectType={projectType}
        reportingPeriodId={reportingPeriodId}
        facilityId={facilityId}
        fileName={fileName}
        format="pdf"
      />
    </div>
  );
}
