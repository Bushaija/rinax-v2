import { honoClient as client } from "@/api-client/index";
import type { InferResponseType } from "hono/client";

export type DgRejectResponse = InferResponseType<
  (typeof client)["financial-reports"][":id"]["dg-reject"]["$post"]
>;

export async function dgReject(reportId: number, comment: string) {
  const response = await client["financial-reports"][":id"]["dg-reject"].$post({
    param: { id: reportId.toString() },
    json: { comment },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as DgRejectResponse;
}
