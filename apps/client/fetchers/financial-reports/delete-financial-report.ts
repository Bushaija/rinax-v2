import { honoClient as client } from "@/api-client/index";
import type { InferRequestType } from "hono/client";

// Type inference for request parameters
export type DeleteFinancialReportRequest = InferRequestType<
  (typeof client)["financial-reports"][":id"]["$delete"]
>["param"];

export async function deleteFinancialReport(id: number | string) {
  const response = await (client as any)["financial-reports"][":id"].$delete({
    param: { id: id.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return { success: true };
}
