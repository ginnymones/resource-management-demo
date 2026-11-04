"use client";

import { Badge } from "@/components/ui/badge";
import { Coffee, Users, Zap, Calendar, Square } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Coffee }> = {
  Break: {
    label: "Break",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: Coffee,
  },
  Meeting: {
    label: "Meeting",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: Users,
  },
  Production: {
    label: "Production",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: Zap,
  },
  Leave: {
    label: "Leave",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    icon: Calendar,
  },
  Stop: {
    label: "Not on shift",
    color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    icon: Square,
  },
};

interface ActivityStatusBadgeProps {
  status: string | null;
  subStatus?: string | null;
}

export function ActivityStatusBadge({ status }: ActivityStatusBadgeProps) {
  const config = STATUS_CONFIG[status ?? "Stop"] ?? STATUS_CONFIG.Stop;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} border-0 text-xs inline-flex items-center gap-1 w-fit`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
