import { apiClient } from "@/lib/api-client";

export interface UpdateFinancialReportData {
  title?: string;
  reportData?: Record<string, any>;
  metadata?: Record<string, any>;
  computedTotals?: Record<string, any>;
  validationResults?: Record<string, any>;
  status?: string;
  version?: string;
}

export async function updateFinancialReport(
  reportId: number,
  data: UpdateFinancialReportData
) {
  const response = await apiClient.patch(
    `/financial-reports/${reportId}`,
    data
  );
  return response.data;
}
