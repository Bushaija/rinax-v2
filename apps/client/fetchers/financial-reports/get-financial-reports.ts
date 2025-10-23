import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters (query)
export type GetFinancialReportsRequest = InferRequestType<
  (typeof client)["financial-reports"]["$get"]
>["query"];

// Type inference for response data
export type GetFinancialReportsResponse = InferResponseType<
  (typeof client)["financial-reports"]["$get"]
>;

export async function getFinancialReports(query: GetFinancialReportsRequest) {
  const response = await (client as any)["financial-reports"].$get({
    query,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetFinancialReportsResponse;
}
