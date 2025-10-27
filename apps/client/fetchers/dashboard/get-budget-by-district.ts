export interface GetBudgetByDistrictRequest {
  provinceId: string | number;
  programId?: string | number;
  quarter?: string | number;
}

export interface DistrictBudgetItem {
  districtId: number;
  districtName: string;
  allocatedBudget: number;
  spentBudget: number;
  utilizationPercentage: number;
}

export interface BudgetByDistrictResponse {
  districts: DistrictBudgetItem[];
}

/**
 * Fetch budget data aggregated by district
 * 
 * Returns budget allocation and spending for all districts within a province,
 * used for bar chart visualization on the Province tab.
 * 
 * @param params - Request parameters
 * @returns Budget by district data
 */
async function getBudgetByDistrict(params: GetBudgetByDistrictRequest): Promise<BudgetByDistrictResponse> {
  const queryParams = new URLSearchParams();
  
  queryParams.append('provinceId', params.provinceId.toString());

  if (params.programId) {
    queryParams.append('programId', params.programId.toString());
  }

  if (params.quarter) {
    queryParams.append('quarter', params.quarter.toString());
  }

  const url = `http://localhost:9999/api/dashboard/budget-by-district?${queryParams.toString()}`;

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

export default getBudgetByDistrict;
