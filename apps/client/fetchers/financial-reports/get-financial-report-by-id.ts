import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters
export type GetFinancialReportByIdRequest = InferRequestType<
  (typeof client)["financial-reports"][":id"]["$get"]
>["param"];

// Type inference for response data
export type GetFinancialReportByIdResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["$get"]
>;

export async function getFinancialReportById(id: number | string) {
  const response = await (client as any)["financial-reports"][":id"].$get({
    param: { id: id.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetFinancialReportByIdResponse;
}
