import { eq } from "drizzle-orm";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { db } from "@/api/db";
import { districts } from "@/api/db/schema";
import type { AppRouteHandler } from "@/api/lib/types";
import type { ListRoute, GetOneRoute } from "./districts.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const data = await db.query.districts.findMany();
    return c.json(data);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.param()
    const districtId = parseInt(id)
    const data = await db.query.districts.findFirst({
        where: eq(districts.id, districtId),
    });

    if (!data) {
        return c.json(
            {
                message: "District not found",
            },
            HttpStatusCodes.NOT_FOUND
        );
    }
    return c.json(data, HttpStatusCodes.OK);
};