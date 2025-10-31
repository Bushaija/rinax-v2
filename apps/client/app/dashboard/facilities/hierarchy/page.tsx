"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessibleFacilitiesList } from "@/components/accessible-facilities-list";
import { FacilityHierarchyTree } from "@/components/facility-hierarchy-tree";
import { FacilityListWithDistricts } from "@/components/facility-list-with-districts";
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/**
 * Facility Hierarchy Dashboard
 * 
 * Demonstrates all facility hierarchy display components:
 * - Accessible facilities list with district grouping
 * - Facility hierarchy tree visualization
 * - Facility list with district boundaries
 */
export default function FacilityHierarchyPage() {
  const { 
    accessibleFacilities, 
    isLoading, 
    isError,
    userFacilityId,
    isHospitalUser,
    userRole,
  } = useHierarchyContext();

  const [selectedFacilityId, setSelectedFacilityId] = React.useState<number | null>(null);

  // Set initial selected facility to user's facility
  React.useEffect(() => {
    if (userFacilityId && !selectedFacilityId) {
      setSelectedFacilityId(userFacilityId);
    }
  }, [userFacilityId, selectedFacilityId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load facility hierarchy information. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Facility Hierarchy</h1>
        <p className="text-muted-foreground">
          View your accessible facilities and their organizational relationships
        </p>
      </div>

      {/* Role and Access Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Access Level</CardTitle>
          <CardDescription>
            Based on your role and facility assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Role:</span>{" "}
              <span className="font-medium capitalize">{userRole || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Facility Type:</span>{" "}
              <span className="font-medium capitalize">
                {isHospitalUser ? "Hospital" : "Health Center"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Accessible Facilities:</span>{" "}
              <span className="font-medium">{accessibleFacilities.length}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {isHospitalUser
              ? "As a hospital user, you can access your hospital and all child health centers in your district."
              : "As a health center user, you can only access your own facility."}
          </p>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="accessible" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="accessible">Accessible Facilities</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy Tree</TabsTrigger>
          <TabsTrigger value="districts">By District</TabsTrigger>
        </TabsList>

        {/* Accessible Facilities Tab */}
        <TabsContent value="accessible" className="space-y-4">
          <AccessibleFacilitiesList
            showTitle={false}
            onFacilityClick={(facilityId) => {
              setSelectedFacilityId(facilityId);
            }}
          />
        </TabsContent>

        {/* Hierarchy Tree Tab */}
        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select a Facility</CardTitle>
              <CardDescription>
                Choose a facility to view its hierarchy relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FacilityListWithDistricts
                facilities={accessibleFacilities}
                selectedFacilityId={selectedFacilityId || undefined}
                onFacilitySelect={setSelectedFacilityId}
                showDistrictBoundaries={false}
              />
            </CardContent>
          </Card>

          {selectedFacilityId && (
            <FacilityHierarchyTree
              facilityId={selectedFacilityId}
            />
          )}
        </TabsContent>

        {/* By District Tab */}
        <TabsContent value="districts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Facilities by District</CardTitle>
              <CardDescription>
                View all accessible facilities grouped by district boundaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FacilityListWithDistricts
                facilities={accessibleFacilities}
                selectedFacilityId={selectedFacilityId || undefined}
                onFacilitySelect={setSelectedFacilityId}
                showDistrictBoundaries={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
