import * as React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Shell } from "@/components/shell";
import { getValidFilters } from "@/lib/data-table";
import type { SearchParams } from "@/types";

import { FeatureFlagsProvider } from "../_components/products/feature-flags-provider";
import { ProductsTable } from "../_components/products/products-table";
import { 
  getProducts,
  getProductCategoryCounts,
  getProductStatusCounts,
  getPriceRange 
} from "../_lib/product-queries";
import { searchParamsCache } from "../_lib/validations";


interface ProductsPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function ProductsPage(props: ProductsPageProps) {

  const searchParams = await props.searchParams;
  const search = searchParamsCache.parse(searchParams);

  const validFilters = getValidFilters(search.filters);

  const [
    { data, pageCount },
    categoryCounts,
    statusCounts,
    priceRange,
  ] = await Promise.all([
    getProducts({
      ...search,
      name: search.name,
      category: search.category,
      status: search.status,
      price: search.price,
      createdAt: search.createdAt,
      filterFlag: search.filterFlag ?? undefined,
      filters: validFilters,
    }),
    getProductCategoryCounts(),
    getProductStatusCounts(),
    getPriceRange(),
  ]);

 return (
    <Shell className="gap-2">
      <FeatureFlagsProvider>
        <ProductsTable
          data={data}
          pageCount={pageCount}
          categoryCounts={categoryCounts}
          statusCounts={statusCounts}
          priceRange={priceRange}
        />
      </FeatureFlagsProvider>
    </Shell>
  );
}
