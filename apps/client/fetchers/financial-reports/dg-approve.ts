import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type DgApproveResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["dg-approve"]["$post"]
>;

export async function dgApprove(reportId: number, comment?: string) {
  const response = await client["financial-reports"][":id"]["dg-approve"].$post({
    param: { id: reportId.toString() },
    json: { comment },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as DgApproveResponse;
}
