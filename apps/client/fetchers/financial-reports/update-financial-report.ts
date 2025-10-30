import { honoClient as client } from "@/api-client/index";

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
  const response = await (client as any)["financial-reports"][":id"].$patch({
    param: { id: reportId.toString() },
    json: data,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const result = await response.json();
  return result;
}
