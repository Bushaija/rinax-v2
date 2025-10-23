"use client";

import { SelectTrigger } from "@radix-ui/react-select";
import type { Table } from "@tanstack/react-table";
import { Download, Package, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/data-table/data-table-action-bar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { type Product, products } from "@/db/schema";
import { exportTableToCSV } from "@/lib/export";
import { deleteProductsAction, updateProductsAction } from "../../_lib/product-server-actions";

const actions = [
  "update-status",
  "update-category",
  "export",
  "delete",
] as const;

type Action = (typeof actions)[number];

interface ProductsTableActionBarProps {
  table: Table<Product>;
}

export function ProductsTableActionBar({ table }: ProductsTableActionBarProps) {
  const rows = table.getFilteredSelectedRowModel().rows;
  const [isPending, startTransition] = React.useTransition();
  const [currentAction, setCurrentAction] = React.useState<Action | null>(null);

  const getIsActionPending = React.useCallback(
    (action: Action) => isPending && currentAction === action,
    [isPending, currentAction],
  );

  const onProductUpdate = React.useCallback(
    ({
      field,
      value,
    }: {
      field: "status" | "category";
      value: Product["status"] | Product["category"];
    }) => {
      setCurrentAction(
        field === "status" ? "update-status" : "update-category",
      );
      startTransition(async () => {
        const { error } = await updateProductsAction({
          ids: rows.map((row) => row.original.id),
          [field]: value,
        });

        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Products updated");
      });
    },
    [rows],
  );

  const onProductExport = React.useCallback(() => {
    setCurrentAction("export");
    startTransition(() => {
      exportTableToCSV(table, {
        excludeColumns: ["select", "actions"],
        onlySelected: true,
      });
    });
  }, [table]);

  const onProductDelete = React.useCallback(() => {
    setCurrentAction("delete");
    startTransition(async () => {
      const { error } = await deleteProductsAction({
        ids: rows.map((row) => row.original.id),
      });

      if (error) {
        toast.error(error);
        return;
      }
      table.toggleAllRowsSelected(false);
    });
  }, [rows, table]);

  return (
    <DataTableActionBar table={table} visible={rows.length > 0}>
      <DataTableActionBarSelection table={table} />
      <Separator
        orientation="vertical"
        className="hidden data-[orientation=vertical]:h-5 sm:block"
      />
      <div className="flex items-center gap-1.5">
        <Select
          onValueChange={(value: Product["status"]) =>
            onProductUpdate({ field: "status", value })
          }
        >
          <SelectTrigger asChild>
            <DataTableActionBarAction
              size="icon"
              tooltip="Update status"
              isPending={getIsActionPending("update-status")}
            >
              <Package />
            </DataTableActionBarAction>
          </SelectTrigger>
          <SelectContent align="center">
            <SelectGroup>
              {products.status.enumValues.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  {status}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value: Product["category"]) =>
            onProductUpdate({ field: "category", value })
          }
        >
          <SelectTrigger asChild>
            <DataTableActionBarAction
              size="icon"
              tooltip="Update category"
              isPending={getIsActionPending("update-category")}
            >
              <Package />
            </DataTableActionBarAction>
          </SelectTrigger>
          <SelectContent align="center">
            <SelectGroup>
              {products.category.enumValues.map((category) => (
                <SelectItem
                  key={category}
                  value={category}
                  className="capitalize"
                >
                  {category}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <DataTableActionBarAction
          size="icon"
          tooltip="Export products"
          isPending={getIsActionPending("export")}
          onClick={onProductExport}
        >
          <Download />
        </DataTableActionBarAction>
        <DataTableActionBarAction
          size="icon"
          tooltip="Delete products"
          isPending={getIsActionPending("delete")}
          onClick={onProductDelete}
        >
          <Trash2 />
        </DataTableActionBarAction>
      </div>
    </DataTableActionBar>
  );
}
