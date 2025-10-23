"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarIcon,
  CheckCircle2,
  Mail,
  Shield,
  User,
  UserCheck,
  UserX,
  MoreHorizontal,
  Building,
  Clock,
  AlertTriangle,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User as UserType, UserRole } from "@/types/user";
import { formatDate } from "@/lib/format";
import type { DataTableRowAction } from "@/types/data-table";

const userRoles: UserRole[] = ["admin", "accountant", "program_manager"];

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case "admin":
      return Shield;
    case "accountant":
      return User;
    case "program_manager":
      return UserCheck;
    default:
      return User;
  }
};

const getRoleVariant = (role: UserRole) => {
  switch (role) {
    case "admin":
      return "destructive";
    case "accountant":
      return "secondary";
    case "program_manager":
      return "default";
    default:
      return "outline";
  }
};

interface GetUsersTableColumnsProps {
  setRowAction: React.Dispatch<
    React.SetStateAction<DataTableRowAction<UserType> | null>
  >;
}

export function getUsersTableColumns({
  setRowAction,
}: GetUsersTableColumnsProps): ColumnDef<UserType>[] {
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
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <User className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
        );
      },
      meta: {
        label: "Name",
        placeholder: "Search names...",
        variant: "text",
        icon: User,
      },
      enableColumnFilter: true,
    },
    {
      id: "role",
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ cell }) => {
        const role = cell.getValue<UserRole>();
        const Icon = getRoleIcon(role);
        const variant = getRoleVariant(role);

        return (
          <Badge variant={variant} className="py-1 [&>svg]:size-3.5">
            <Icon />
            <span className="capitalize">{role.replace("_", " ")}</span>
          </Badge>
        );
      },
      meta: {
        label: "Role",
        variant: "multiSelect",
        options: userRoles.map((role) => ({
          label: role.charAt(0).toUpperCase() + role.slice(1).replace("_", " "),
          value: role,
          icon: getRoleIcon(role),
        })),
        icon: Shield,
      },
      enableColumnFilter: true,
    },
    {
      id: "facility",
      accessorKey: "facilityId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Facility" />
      ),
      cell: ({ row }) => {
        const facility = row.original.facility;
        return (
          <div className="flex items-center gap-2">
            <Building className="size-4 text-muted-foreground" />
            <span>{facility?.name || `Facility ${row.original.facilityId}`}</span>
          </div>
        );
      },
      meta: {
        label: "Facility",
        placeholder: "Search facilities...",
        variant: "text",
        icon: Building,
      },
      enableColumnFilter: true,
    },
    {
      id: "status",
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const user = row.original;
        const isActive = user.isActive;
        const isBanned = user.banned;

        if (isBanned) {
          return (
            <Badge variant="destructive" className="py-1 [&>svg]:size-3.5">
              <UserX />
              <span>Banned</span>
            </Badge>
          );
        }

        return (
          <Badge 
            variant={isActive ? "default" : "secondary"} 
            className="py-1 [&>svg]:size-3.5"
          >
            <CheckCircle2 />
            <span>{isActive ? "Active" : "Inactive"}</span>
          </Badge>
        );
      },
      meta: {
        label: "Status",
        variant: "multiSelect",
        options: [
          { label: "Active", value: "active", icon: CheckCircle2 },
          { label: "Inactive", value: "inactive", icon: UserX },
          { label: "Banned", value: "banned", icon: AlertTriangle },
        ],
        icon: CheckCircle2,
      },
      enableColumnFilter: true,
    },
    {
      id: "lastLogin",
      accessorKey: "lastLoginAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Login" />
      ),
      cell: ({ cell }) => {
        const lastLogin = cell.getValue<string | null>();
        return (
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <span>
              {lastLogin ? formatDate(new Date(lastLogin)) : "Never"}
            </span>
          </div>
        );
      },
      meta: {
        label: "Last Login",
        variant: "dateRange",
        icon: CalendarIcon,
      },
      enableColumnFilter: true,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
      ),
      cell: ({ cell }) => formatDate(new Date(cell.getValue<string>())),
      meta: {
        label: "Created At",
        variant: "dateRange",
        icon: CalendarIcon,
      },
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: function Cell({ row }) {
        const user = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Open menu"
                variant="ghost"
                className="flex size-8 p-0 data-[state=open]:bg-muted"
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onSelect={() => setRowAction({ row, variant: "update" })}
              >
                <User className="mr-2 size-4" />
                Edit User
              </DropdownMenuItem>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Shield className="mr-2 size-4" />
                  Change Role
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={user.role}
                    onValueChange={(value) => {
                      // Handle role change
                      toast.promise(
                        Promise.resolve(), // Replace with actual API call
                        {
                          loading: "Updating role...",
                          success: "Role updated",
                          error: "Failed to update role",
                        },
                      );
                    }}
                  >
                    {userRoles.map((role) => (
                      <DropdownMenuRadioItem
                        key={role}
                        value={role}
                        className="capitalize"
                      >
                        {role.replace("_", " ")}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {user.banned ? (
                <DropdownMenuItem
                  onSelect={() => setRowAction({ row, variant: "unban" })}
                >
                  <UserCheck className="mr-2 size-4" />
                  Unban User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() => setRowAction({ row, variant: "ban" })}
                >
                  <UserX className="mr-2 size-4" />
                  Ban User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 40,
    },
  ];
}
