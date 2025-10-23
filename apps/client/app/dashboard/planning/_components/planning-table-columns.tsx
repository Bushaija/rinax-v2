"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableRowAction } from "@/types/data-table";

export interface PlanningActivity {
  id: number;
  schemaId: number;
  entityId: number | null;
  entityType: string;
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  formData: {
    metadata: Record<string, any>;
    activities: Record<string, any>;
  };
  computedValues: Record<string, any>;
  validationState: {
    isValid: boolean;
    lastValidated: string;
  };
  metadata: {
    projectType: string;
    submittedAt: string;
    facilityType: string;
  };
  createdBy: number;
  createdAt: string;
  updatedBy: number;
  updatedAt: string;
  schema: {
    id: number;
    name: string;
    version: string;
    projectType: string;
    facilityType: string;
    moduleType: string;
    isActive: boolean;
  };
  project: {
    id: number;
    name: string;
    status: string;
    code: string;
    description: string;
    projectType: string;
  };
  facility: {
    id: number;
    name: string;
    facilityType: string;
    districtId: number;
  };
  reportingPeriod: {
    id: number;
    year: number;
    periodType: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  creator: {
    id: number;
    name: string;
    email: string;
  };
  formDataNamed: {
    metadata: Record<string, any>;
    activities: Record<string, any>;
  };
}

export function getPlanningTableColumns({
  setRowAction,
  router,
}: {
  setRowAction: (action: DataTableRowAction<PlanningActivity>) => void;
  router: any;
}): ColumnDef<PlanningActivity>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      id: "facilityName",
      accessorKey: "facility.name",
      header: "Facility Name",
      cell: ({ row }) => {
        const facility = row.original.facility;
        return (
          <div className="font-medium">
            {facility?.name || "N/A"}
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Facility Name",
        variant: "text",
        placeholder: "Search facilities...",
      },
    },
    {
      id: "facilityType",
      accessorKey: "facility.facilityType",
      header: "Facility Type",
      cell: ({ row }) => {
        const facilityType = row.original.facility?.facilityType;
        if (!facilityType) return "N/A";
        
        const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          hospital: { label: "Hospital", variant: "default" },
          health_center: { label: "Health Center", variant: "secondary" },
        };
        
        const typeInfo = typeMap[facilityType] || { label: facilityType, variant: "outline" as const };
        
        return (
          <Badge variant={typeInfo.variant}>
            {typeInfo.label}
          </Badge>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Facility Type",
        variant: "select",
        options: [
          { label: "Hospital", value: "hospital" },
          { label: "Health Center", value: "health_center" },
        ],
      },
    },
    {
      accessorKey: "reportingPeriod.year",
      header: "Reporting Period",
      cell: ({ row }) => {
        const reportingPeriod = row.original.reportingPeriod;
        if (!reportingPeriod) return "N/A";
        
        return (
          <div className="space-y-1">
            <div className="font-medium">
              FY {reportingPeriod.year}
            </div>
            <div className="text-sm text-muted-foreground">
              {reportingPeriod.startDate} - {reportingPeriod.endDate}
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      id: "projectType",
      accessorKey: "project.projectType",
      header: "Program",
      cell: ({ row }) => {
        const projectType = row.original.project?.projectType;
        if (!projectType) return "N/A";
        
        const typeMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          HIV: { label: "HIV", variant: "default" },
          TB: { label: "TB", variant: "secondary" },
          Malaria: { label: "Malaria", variant: "outline" },
        };
        
        const typeInfo = typeMap[projectType] || { label: projectType, variant: "outline" as const };
        
        return (
          <Badge variant={typeInfo.variant}>
            {typeInfo.label}
          </Badge>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        label: "Program",
        variant: "select",
        options: [
          { label: "HIV", value: "HIV" },
          { label: "TB", value: "TB" },
          { label: "Malaria", value: "Malaria" },
        ],
      },
    },
    {
      accessorKey: "activitiesCount",
      header: "Activities Count",
      cell: ({ row }) => {
        const activities = row.original.formData?.activities;
        const count = activities ? Object.keys(activities).length : 0;
        
        return (
          <div className="text-center">
            <Badge variant="outline" className="font-mono">
              {count}
            </Badge>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        const createdAt = row.original.createdAt;
        return (
          <div className="text-sm text-muted-foreground">
            {new Date(createdAt).toLocaleDateString()}
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const planning = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Open menu"
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/planning/details/${planning.id}`)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/planning/edit/${planning.id}`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setRowAction({ variant: "delete", row })}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
    },
  ];
}
