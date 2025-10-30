"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export interface DashboardFiltersProps {
  activeTab: "province" | "district";

  // Province tab filters
  provinceId?: string;
  provinces?: Array<{ id: number; name: string }>;
  onProvinceChange?: (value: string) => void;
  disableProvinceFilter?: boolean;

  // District tab filters
  districtId?: string;
  districts?: Array<{ id: number; name: string }>;
  onDistrictChange?: (value: string) => void;
  disableDistrictFilter?: boolean;

  // Common filters
  programId?: string;
  programs?: Array<{ id: number; name: string }>;
  onProgramChange?: (value: string) => void;

  quarter?: string;
  onQuarterChange?: (value: string) => void;

  onClearFilters?: () => void;
}

export function DashboardFilters({
  activeTab,
  provinceId,
  provinces = [],
  onProvinceChange,
  disableProvinceFilter = false,
  districtId,
  districts = [],
  onDistrictChange,
  disableDistrictFilter = false,
  programId,
  programs = [],
  onProgramChange,
  quarter,
  onQuarterChange,
  onClearFilters,
}: DashboardFiltersProps) {
  const hasActiveFilters = Boolean(
    (activeTab === "province" && provinceId) ||
    (activeTab === "district" && districtId) ||
    programId ||
    quarter
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2">
        {/* Province filter - only show on Province tab */}
        {activeTab === "province" && provinces.length > 0 && (
          <div className="w-full sm:w-[200px]">
            <Select
              value={provinceId || ""}
              onValueChange={onProvinceChange}
              disabled={disableProvinceFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((province) => (
                  <SelectItem key={province.id} value={String(province.id)}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* District filter - only show on District tab */}
        {activeTab === "district" && districts.length > 0 && (
          <div className="w-full">
            <Select
              value={districtId || ""}
              onValueChange={onDistrictChange}
              disabled={disableDistrictFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {districts.map((district) => (
                  <SelectItem key={district.id} value={String(district.id)}>
                    {district.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Program filter - show on both tabs */}
        {programs.length > 0 && (
          <div className="w-full">
            <Select value={programId || ""} onValueChange={onProgramChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={String(program.id)}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Quarter filter - show on both tabs */}
        {/* <div className="w-full sm:w-[150px]">
          <Select value={quarter || ""} onValueChange={onQuarterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Q1</SelectItem>
              <SelectItem value="2">Q2</SelectItem>
              <SelectItem value="3">Q3</SelectItem>
              <SelectItem value="4">Q4</SelectItem>
            </SelectContent>
          </Select>
        </div> */}
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="w-full sm:w-auto"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
