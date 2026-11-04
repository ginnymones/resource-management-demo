"use client";

import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Pending_Unroutable: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Partially_Approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Active: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  Completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const displayStatus = status.replace(/_/g, " ");
  const className = STATUS_STYLES[status] ?? STATUS_STYLES.Draft;

  return (
    <Badge variant="outline" className={`${className} border-0`}>
      {displayStatus}
    </Badge>
  );
}
