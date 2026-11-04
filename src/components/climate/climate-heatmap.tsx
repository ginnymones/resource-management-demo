"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface HeatmapDataPoint {
  associateId: string;
  associateName: string;
  team: string;
  utilizedHours: number;
  bandwidth: number;
  dayIndex: number;
  dayLabel: string;
}

interface ClimateHeatmapProps {
  data: HeatmapDataPoint[];
}

// Lazy-load the chart component to avoid blocking page load with Recharts bundle
const HeatmapChart = dynamic(() => import("./heatmap-chart"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center">
      <Skeleton className="w-full h-full" />
    </div>
  ),
});

export function ClimateHeatmap({ data }: ClimateHeatmapProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            No data available for the selected filters. Adjust your team or process filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Workload Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <HeatmapChart data={data} />

        {/* Color Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#2CC156" }} />
            <span>≤ 6.5h (Adequate)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#E47927" }} />
            <span>6.5–7.5h (Warning)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#E34848" }} />
            <span>&gt; 7.5h (Over-capacity)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
