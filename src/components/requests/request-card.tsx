"use client";

import { Users, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";

export interface RequestSummary {
  id: string;
  referenceNumber: string;
  projectName: string;
  status: string;
  submittedAt: string | null;
  associateCount: number;
}

interface RequestCardProps {
  request: RequestSummary;
  onClick: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function RequestCard({ request, onClick, onEdit }: RequestCardProps) {
  const isDraft = request.status === "Draft";

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(request.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">
                {request.projectName || "Untitled Draft"}
              </p>
              <StatusBadge status={request.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>{request.referenceNumber}</span>
              {request.submittedAt && (
                <span>{new Date(request.submittedAt).toLocaleDateString()}</span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {request.associateCount}
              </span>
            </div>
          </div>
          {isDraft && onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(request.id);
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit & Submit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
