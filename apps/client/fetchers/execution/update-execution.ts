import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters and body
export type UpdateExecutionParam = InferRequestType<
  (typeof client)["execution"][":id"]["$put"]
>["param"];

export type UpdateExecutionRequest = InferRequestType<
  (typeof client)["execution"][":id"]["$put"]
>["json"];

export type UpdateExecutionResponse = InferResponseType<
  (typeof client)["execution"][":id"]["$put"]
>;

export async function updateExecution(
  { id }: UpdateExecutionParam,
  json: UpdateExecutionRequest
) {
  const response = await (client as any).execution[":id"].$put({
    param: { id },
    json,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as UpdateExecutionResponse;
}


