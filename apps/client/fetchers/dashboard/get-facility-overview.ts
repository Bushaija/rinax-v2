export interface GetFacilityOverviewRequest {
  facilityId?: string | number;
}

export interface FacilityOverviewResponse {
  currentReportingPeriod: {
    id: number;
    year: number;
    periodType: string;
    startDate: string;
    endDate: string;
    status: string;
  } | null;
  facility: {
    id: number;
    name: string;
    facilityType: string;
  };
  budgetSummary: {
    totalAllocated: number;
    totalSpent: number;
    totalRemaining: number;
    utilizationPercentage: number;
  };
  projectBreakdown: Array<{
    projectId: number;
    projectName: string;
    projectCode: string;
    allocated: number;
    spent: number;
    remaining: number;
    utilizationPercentage: number;
  }>;
}

async function getFacilityOverview(params: GetFacilityOverviewRequest = {}): Promise<FacilityOverviewResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.facilityId) {
    queryParams.append('facilityId', params.facilityId.toString());
  }

  const url = `http://localhost:9999/api/dashboard/accountant/facility-overview${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getFacilityOverview;
