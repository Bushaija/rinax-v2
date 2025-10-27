export interface GetBudgetByFacilityRequest {
  districtId: string | number;
  programId?: string | number;
  quarter?: string | number;
}

export interface FacilityBudgetItem {
  facilityId: number;
  facilityName: string;
  facilityType: string;
  allocatedBudget: number;
  spentBudget: number;
  utilizationPercentage: number;
}

export interface BudgetByFacilityResponse {
  facilities: FacilityBudgetItem[];
}

/**
 * Fetch budget data aggregated by facility
 * 
 * Returns budget allocation and spending for all facilities within a district,
 * used for bar chart visualization on the District tab.
 * 
 * @param params - Request parameters
 * @returns Budget by facility data
 */
async function getBudgetByFacility(params: GetBudgetByFacilityRequest): Promise<BudgetByFacilityResponse> {
  const queryParams = new URLSearchParams();
  
  queryParams.append('districtId', params.districtId.toString());

  if (params.programId) {
    queryParams.append('programId', params.programId.toString());
  }

  if (params.quarter) {
    queryParams.append('quarter', params.quarter.toString());
  }

  const url = `http://localhost:9999/api/dashboard/budget-by-facility?${queryParams.toString()}`;

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

export default getBudgetByFacility;
