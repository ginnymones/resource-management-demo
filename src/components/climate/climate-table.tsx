"use client";

import { useState } from "react";
import { ArrowUpDown } from "lucide-react";
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
import { getCapacityColorClass } from "@/lib/utils/capacity-color";

export interface ClimateTableRow {
  associateId: string;
  associateName: string;
  team: string;
  utilizedHours: number;
  bandwidth: number;
}

interface ClimateTableProps {
  data: ClimateTableRow[];
  onRowClick?: (associateId: string) => void;
}

type SortField = "associateName" | "team" | "utilizedHours" | "bandwidth";
type SortDirection = "asc" | "desc";

export function ClimateTable({ data, onRowClick }: ClimateTableProps) {
  const [sortField, setSortField] = useState<SortField>("associateName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const modifier = sortDirection === "asc" ? 1 : -1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * modifier;
    }
    return ((aVal as number) - (bVal as number)) * modifier;
  });

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            No data available for the selected filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Utilization Table</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer -ml-3 h-8"
                  onClick={() => handleSort("associateName")}
                >
                  Associate
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer -ml-3 h-8"
                  onClick={() => handleSort("team")}
                >
                  Team
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer -ml-3 h-8"
                  onClick={() => handleSort("utilizedHours")}
                >
                  Utilized Hours
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer -ml-3 h-8"
                  onClick={() => handleSort("bandwidth")}
                >
                  Bandwidth
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow
                key={row.associateId}
                className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                onClick={() => onRowClick?.(row.associateId)}
              >
                <TableCell className="font-medium">{row.associateName}</TableCell>
                <TableCell>{row.team}</TableCell>
                <TableCell>{row.utilizedHours.toFixed(1)}h</TableCell>
                <TableCell>{row.bandwidth.toFixed(1)}h</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCapacityColorClass(row.utilizedHours)}`}
                  >
                    {row.utilizedHours > 7.5
                      ? "Over-capacity"
                      : row.utilizedHours > 6.5
                        ? "Warning"
                        : "Adequate"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Color Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs border-t pt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>≤ 6.5h (Adequate)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-orange-500" />
            <span>6.5–7.5h (Warning)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>&gt; 7.5h (Over-capacity)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
