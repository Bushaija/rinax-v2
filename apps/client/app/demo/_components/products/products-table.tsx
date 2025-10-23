"use client";

import * as React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableAdvancedToolbar } from "@/components/data-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/data-table/data-table-filter-list";
import { DataTableFilterMenu } from "@/components/data-table/data-table-filter-menu";
import { DataTableSortList } from "@/components/data-table/data-table-sort-list";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import type { DataTableRowAction } from "@/types/data-table";
import { useFeatureFlags } from "./feature-flags-provider";
import { getProductsTableColumns } from "./products-table-columns";
import { type Product } from "@/db/schema";
import { ProductsTableActionBar } from "./products-table-action-bar";
import { EditProductModal } from "./dynamic-product-form";
import { DeleteProductsDialog } from "./delete-products-dialog";


interface ProductsTableProps {
  data: Product[];
  pageCount: number;
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  priceRange: { min: number; max: number };
}

export function ProductsTable({
  data,
  pageCount,
  categoryCounts,
  statusCounts,
  priceRange,
}: ProductsTableProps) {
  const { enableAdvancedFilter, filterFlag } = useFeatureFlags();
  const [rowAction, setRowAction] = React.useState<DataTableRowAction<Product> | null>(null);

  const columns = React.useMemo(
    () =>
      getProductsTableColumns({
        categoryCounts,
        statusCounts,
        priceRange,
        setRowAction,
      }),
    [categoryCounts, statusCounts, priceRange]
  );

  const { table, shallow, debounceMs, throttleMs } = useDataTable({
    data,
    columns,
    pageCount,
    enableAdvancedFilter,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId: (originalRow) => originalRow.id,
    shallow: false,
    clearOnDefault: true,
  });

  return (
    <>
      <DataTable
        table={table}
        actionBar={<ProductsTableActionBar table={table} />}
      >
        {enableAdvancedFilter ? (
          <DataTableAdvancedToolbar table={table}>
            <DataTableSortList table={table} align="start" />
            {filterFlag === "advancedFilters" ? (
              <DataTableFilterList
                table={table}
                shallow={shallow}
                debounceMs={debounceMs}
                throttleMs={throttleMs}
                align="start"
              />
            ) : (
              <DataTableFilterMenu
                table={table}
                shallow={shallow}
                debounceMs={debounceMs}
                throttleMs={throttleMs}
              />
            )}
          </DataTableAdvancedToolbar>
        ) : (
          <DataTableToolbar table={table}>
            <DataTableSortList table={table} align="end" />
          </DataTableToolbar>
        )}
      </DataTable>
      {rowAction?.variant === "update" && rowAction?.row.original && (
        <EditProductModal
          product={rowAction.row.original}
          open={rowAction?.variant === "update"}
          onOpenChange={(open) => !open && setRowAction(null)}
          onSuccess={() => setRowAction(null)}
          onCancel={() => setRowAction(null)}
        />
      )}
      <DeleteProductsDialog
        open={rowAction?.variant === "delete"}
        onOpenChange={() => setRowAction(null)}
        products={rowAction?.row.original ? [rowAction?.row.original] : []}
        showTrigger={false}
        onSuccess={() => rowAction?.row.toggleSelected(false)}
      />
    </>
  );
}
