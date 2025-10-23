import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request parameters (param)
export type GetExecutionByIdRequest = InferRequestType<
  (typeof client)["execution"][":id"]["$get"]
>["param"];

// Type inference for response data
export type GetExecutionByIdResponse = InferResponseType<
  (typeof client)["execution"][":id"]["$get"]
>;

export async function getExecutionById({ id }: GetExecutionByIdRequest) {
  const response = await (client as any).execution[":id"].$get({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data as GetExecutionByIdResponse;
}



