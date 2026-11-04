"use client";

import Link from "next/link";
import { Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface PendingApproval {
  id: string;
  referenceNumber: string;
  projectName: string;
  requestorName: string;
  submittedAt: string;
  associateCount: number;
}

interface PendingApprovalsPanelProps {
  approvals: PendingApproval[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  isVisible: boolean;
}

export function PendingApprovalsPanel({
  approvals,
  onApprove,
  onReject,
  isVisible,
}: PendingApprovalsPanelProps) {
  if (!isVisible) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pending Approvals</CardTitle>
          <Badge variant="secondary">{approvals.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No pending approvals at this time.
          </p>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval, index) => (
              <div key={approval.id}>
                {index > 0 && <Separator className="mb-3" />}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/requests/${approval.id}`}
                        className="text-sm font-medium truncate hover:underline cursor-pointer block"
                      >
                        {approval.projectName}
                      </Link>
                      <Link
                        href={`/requests/${approval.id}`}
                        className="text-xs text-muted-foreground hover:underline cursor-pointer block"
                      >
                        {approval.referenceNumber} · {approval.requestorName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(approval.submittedAt).toLocaleDateString()} ·{" "}
                        {approval.associateCount} associate(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs cursor-pointer"
                      asChild
                    >
                      <Link href={`/requests/${approval.id}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        View Details
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs cursor-pointer text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-950"
                      onClick={() => onApprove(approval.id)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs cursor-pointer text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-950"
                      onClick={() => onReject(approval.id)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
