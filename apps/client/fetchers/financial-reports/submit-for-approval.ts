import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type SubmitForApprovalResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["submit"]["$post"]
>;

export async function submitForApproval(reportId: number) {
  const response = await client["financial-reports"][":id"]["submit"].$post({
    param: { id: reportId.toString() },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as SubmitForApprovalResponse;
}
