"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, Clock, Briefcase } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/requests/status-badge";
import { ApprovalActions } from "@/components/requests/approval-actions";
import { Badge } from "@/components/ui/badge";
import { getRequestDetail } from "@/app/actions/requests";
import {
  approveRequestAction,
  rejectRequestAction,
  overrideDecisionAction,
} from "@/app/actions/approvals";

interface RequestDetail {
  id: string;
  referenceNumber: string;
  projectName: string;
  status: string;
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  processName: string;
  businessJustification: string;
  submittedAt: string | null;
  associates: {
    id: string;
    name: string;
    team: string;
    approvalStatus: string;
    approverName?: string;
  }[];
  timeline: {
    action: string;
    actorName: string;
    timestamp: string;
    details?: string;
  }[];
  alternateSuggestions?: {
    id: string;
    name: string;
    team: string;
    matchScore: number;
  }[];
}

export default function RequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const userRole = (session?.user?.role as string) ?? "SME";
  const isApprover = ["Manager", "Senior_Leader", "Admin"].includes(userRole);

  useEffect(() => {
    async function loadRequest() {
      try {
        const data = await getRequestDetail(params.id);

        // If it's a draft, redirect to the editable intake form
        if (data.status === "Draft") {
          router.replace(`/matchmaker/request?draft=${params.id}`);
          return;
        }

        setRequest({
          id: data.id,
          referenceNumber: data.referenceNumber,
          projectName: data.projectName,
          status: data.status,
          startDate: data.startDate.toISOString ? data.startDate.toISOString() : String(data.startDate),
          endDate: data.endDate.toISOString ? data.endDate.toISOString() : String(data.endDate),
          hoursPerDay: data.hoursPerDay,
          processName: data.targetProcess.name,
          businessJustification: data.businessJustification,
          submittedAt: data.submittedAt
            ? (data.submittedAt.toISOString ? data.submittedAt.toISOString() : String(data.submittedAt))
            : null,
          associates: data.requestAssociates.map((ra) => ({
            id: ra.associate.id,
            name: ra.associate.name,
            team: ra.associate.team.name,
            approvalStatus: ra.approvalStatus,
            approverName: undefined,
          })),
          timeline: data.approvalActions.map((action) => ({
            action: action.action,
            actorName: action.approver.name,
            timestamp: action.createdAt.toISOString
              ? action.createdAt.toISOString()
              : String(action.createdAt),
            details: action.justification ?? undefined,
          })),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load request.");
      }
    }
    loadRequest();
  }, [params.id]);

  async function handleApprove(requestId: string) {
    if (!request) return;
    setIsProcessing(true);
    try {
      const associateIds = request.associates.map((a) => a.id);
      await approveRequestAction(requestId, associateIds);
      // Reload request data
      const data = await getRequestDetail(params.id);
      setRequest((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              associates: data.requestAssociates.map((ra) => ({
                id: ra.associate.id,
                name: ra.associate.name,
                team: ra.associate.team.name,
                approvalStatus: ra.approvalStatus,
                approverName: undefined,
              })),
            }
          : null
      );
    } catch (err) {
      console.error("Approve failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleReject(requestId: string, reason: string) {
    if (!request) return;
    setIsProcessing(true);
    try {
      const associateIds = request.associates.map((a) => a.id);
      await rejectRequestAction(requestId, associateIds, reason);
      // Reload request data
      const data = await getRequestDetail(params.id);
      setRequest((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              associates: data.requestAssociates.map((ra) => ({
                id: ra.associate.id,
                name: ra.associate.name,
                team: ra.associate.team.name,
                approvalStatus: ra.approvalStatus,
                approverName: undefined,
              })),
            }
          : null
      );
    } catch (err) {
      console.error("Reject failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleOverride(requestId: string, justification: string) {
    if (!request || request.associates.length === 0) return;
    setIsProcessing(true);
    try {
      await overrideDecisionAction(
        requestId,
        request.associates[0].id,
        "Approved",
        justification
      );
      // Reload request data
      const data = await getRequestDetail(params.id);
      setRequest((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              associates: data.requestAssociates.map((ra) => ({
                id: ra.associate.id,
                name: ra.associate.name,
                team: ra.associate.team.name,
                approvalStatus: ra.approvalStatus,
                approverName: undefined,
              })),
            }
          : null
      );
    } catch (err) {
      console.error("Override failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/requests">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Request Detail</h1>
            <p className="text-muted-foreground">Request ID: {params.id}</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/requests">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Request Detail</h1>
            <p className="text-muted-foreground">Request ID: {params.id}</p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Loading request details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/requests">
          <Button variant="ghost" size="icon" className="cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{request.projectName || "Untitled Draft"}</h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-sm text-muted-foreground">{request.referenceNumber}</p>
        </div>
      </div>

      {/* Request Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Request Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Dates</p>
                <p className="text-sm font-medium">
                  {new Date(request.startDate).toLocaleDateString()} –{" "}
                  {new Date(request.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Hours/Day</p>
                <p className="text-sm font-medium">{request.hoursPerDay}h</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Process</p>
                <p className="text-sm font-medium">{request.processName}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm font-medium">
                {request.submittedAt
                  ? new Date(request.submittedAt).toLocaleDateString()
                  : "Draft"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-1">Business Justification</p>
            <p className="text-sm">{request.businessJustification}</p>
          </div>
        </CardContent>
      </Card>

      {/* Associates Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Associates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Approver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.associates.map((associate) => (
                <TableRow key={associate.id}>
                  <TableCell className="font-medium">{associate.name}</TableCell>
                  <TableCell>{associate.team}</TableCell>
                  <TableCell>
                    <StatusBadge status={associate.approvalStatus} />
                  </TableCell>
                  <TableCell>{associate.approverName ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Actions (for approvers) */}
      {isApprover && request.status === "Pending" && (
        <ApprovalActions
          requestId={request.id}
          userRole={userRole}
          onApprove={handleApprove}
          onReject={handleReject}
          onOverride={handleOverride}
          isProcessing={isProcessing}
        />
      )}

      {/* Alternate Suggestions (shown after rejection) */}
      {request.alternateSuggestions && request.alternateSuggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alternate Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {request.alternateSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                >
                  <div>
                    <p className="text-sm font-medium">{suggestion.name}</p>
                    <p className="text-xs text-muted-foreground">{suggestion.team}</p>
                  </div>
                  <Badge variant="secondary">Score: {suggestion.matchScore}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Timeline */}
      {request.timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {request.timeline.map((event, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                    {index < request.timeline.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-medium">{event.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.actorName} · {new Date(event.timestamp).toLocaleString()}
                    </p>
                    {event.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">{event.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
