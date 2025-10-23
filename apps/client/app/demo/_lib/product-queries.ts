import "server-only";

import { sql, and, asc, count, desc, gte, ilike, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/server/db/schema/demo/schema";
import { filterColumns } from "@/lib/filter-columns";
import { unstable_cache } from "@/lib/unstable-cache";

export async function getProducts(input: {
  page: number;
  perPage: number;
  name?: string;
  category: string[];
  status: string[];
  price: number[];
  createdAt: number[];
  sort: Array<{ id: string; desc: boolean }>;
  filters?: any[];
  joinOperator?: "and" | "or";
  filterFlag?: string;
}) {
  return await unstable_cache(
    async () => {
      try {
        const offset = (input.page - 1) * input.perPage;
        const advancedTable = input.filterFlag === "advancedFilters" || 
                             input.filterFlag === "commandFilters";

        const advancedWhere = filterColumns({
          table: products,
          filters: input.filters ?? [],
          joinOperator: input.joinOperator ?? "and",
        });

        const where = advancedTable
          ? advancedWhere
          : and(
              input.name ? ilike(products.name, `%${input.name}%`) : undefined,
              input.category.length > 0
                ? inArray(products.category, input.category as any)
                : undefined,
              input.status.length > 0
                ? inArray(products.status, input.status as any)
                : undefined,
              input.price.length > 0
                ? and(
                    input.price[0] ? gte(products.price, input.price[0]) : undefined,
                    input.price[1] ? lte(products.price, input.price[1]) : undefined,
                  )
                : undefined,
              input.createdAt.length > 0
                ? and(
                    input.createdAt[0] ? gte(products.createdAt, new Date(input.createdAt[0])) : undefined,
                    input.createdAt[1] ? lte(products.createdAt, new Date(input.createdAt[1])) : undefined,
                  )
                : undefined,
            );

        const orderBy = input.sort.length > 0
          ? input.sort.map((item) => {
              const column = products[item.id as keyof typeof products] as any;
              return item.desc ? desc(column) : asc(column);
            })
          : [asc(products.createdAt)];

        const { data, total } = await db.transaction(async (tx) => {
          const data = await tx
            .select()
            .from(products)
            .limit(input.perPage)
            .offset(offset)
            .where(where)
            .orderBy(...orderBy);

          const total = await tx
            .select({ count: count() })
            .from(products)
            .where(where)
            .then((res) => res[0]?.count ?? 0);

          return { data, total };
        });

        const pageCount = Math.ceil(total / input.perPage);
        return { data, pageCount };
      } catch (_err) {
        return { data: [], pageCount: 0 };
      }
    },
    [JSON.stringify(input)],
    { revalidate: 1, tags: ["products"] }
  )();
}

export async function getProductCategoryCounts() {
  return unstable_cache(
    async () => {
      try {
        return await db
          .select({
            category: products.category,
            count: count(),
          })
          .from(products)
          .groupBy(products.category)
          .then((res) =>
            res.reduce(
              (acc, { category, count }) => {
                acc[category] = count;
                return acc;
              },
              { electronics: 0, clothing: 0, books: 0, home: 0 }
            )
          );
      } catch (_err) {
        return { electronics: 0, clothing: 0, books: 0, home: 0 };
      }
    },
    ["product-category-counts"],
    { revalidate: 3600 }
  )();
}

export async function getProductStatusCounts() {
  return unstable_cache(
    async () => {
      try {
        return await db
          .select({
            status: products.status,
            count: count(),
          })
          .from(products)
          .groupBy(products.status)
          .then((res) =>
            res.reduce(
              (acc, { status, count }) => {
                acc[status] = count;
                return acc;
              },
              { active: 0, inactive: 0, discontinued: 0 }
            )
          );
      } catch (_err) {
        return { active: 0, inactive: 0, discontinued: 0 };
      }
    },
    ["product-status-counts"],
    { revalidate: 3600 }
  )();
}

export async function getPriceRange() {
  return unstable_cache(
    async () => {
      try {
        return await db
          .select({
            min: sql<number>`min(${products.price})`,
            max: sql<number>`max(${products.price})`,
          })
          .from(products)
          .then((res) => res[0] ?? { min: 0, max: 0 });
      } catch (_err) {
        return { min: 0, max: 0 };
      }
    },
    ["price-range"],
    { revalidate: 3600 }
  )();
}

export async function getProductById(id: string) {
  return unstable_cache(
    async () => {
      try {
        const result = await db
          .select()
          .from(products)
          .where(sql`${products.id} = ${id}`)
          .limit(1);
        
        return result[0] || null;
      } catch (_err) {
        return null;
      }
    },
    [`product-${id}`],
    { revalidate: 3600 }
  )();
}