"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RequestCard, type RequestSummary } from "@/components/requests/request-card";
import { getMyRequests } from "@/app/actions/requests";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Draft", label: "Draft" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Partially_Approved", label: "Partially Approved" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Rejected", label: "Rejected" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function RequestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const userId = session?.user?.id;

  const loadRequests = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const result = await getMyRequests(userId, currentPage);
      const mapped: RequestSummary[] = result.data.map((r) => ({
        id: r.id,
        referenceNumber: r.referenceNumber,
        projectName: r.projectName,
        status: r.status,
        submittedAt: r.submittedAt
          ? (r.submittedAt.toISOString ? r.submittedAt.toISOString() : String(r.submittedAt))
          : null,
        associateCount: r.requestAssociates.length,
      }));
      setRequests(mapped);
      setTotalPages(result.pagination.totalPages || 1);
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentPage]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  function handleRequestClick(id: string) {
    router.push(`/requests/${id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
        <p className="text-muted-foreground">
          Track the status of your submitted cross-utilization requests.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] cursor-pointer">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Request List */}
      {isLoading ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {statusFilter === "all"
              ? "You have no requests yet. Use the Matchmaker to find associates and submit a request."
              : "No requests match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onClick={handleRequestClick}
              onEdit={(id) => router.push(`/matchmaker/request?draft=${id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="cursor-pointer"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="cursor-pointer"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
