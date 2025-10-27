"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Building2, FolderOpen } from "lucide-react";
import { ApprovalStatusBadge } from "./approval-status-badge";

interface DafReviewCardProps {
  report: {
    id: number;
    reportCode: string;
    title: string;
    status: any;
    fiscalYear: string;
    submittedAt: string | null;
    facility?: {
      name: string;
    };
    project?: {
      name: string;
    };
  };
  onClick?: () => void;
}

export function DafReviewCard({ report, onClick }: DafReviewCardProps) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-base font-semibold">
              {report.reportCode}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {report.title}
            </p>
          </div>
          <ApprovalStatusBadge status={report.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {report.facility && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">
                {report.facility.name}
              </span>
            </div>
          )}

          {report.project && (
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">
                {report.project.name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">FY {report.fiscalYear}</span>
          </div>

          {report.submittedAt && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">
                Submitted {new Date(report.submittedAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
