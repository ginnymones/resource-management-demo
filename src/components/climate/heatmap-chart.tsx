"use client";

import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  Cell,
  ZAxis,
} from "recharts";
import type { HeatmapDataPoint } from "./climate-heatmap";

function getHeatColor(hours: number): string {
  if (hours > 7.5) return "#E34848";
  if (hours > 6.5) return "#E47927";
  return "#2CC156";
}

export default function HeatmapChart({ data }: { data: HeatmapDataPoint[] }) {
  const associates = Array.from(new Set(data.map((d) => d.associateName)));
  const days = Array.from(new Set(data.map((d) => d.dayLabel)));

  const scatterData = data.map((d) => ({
    x: days.indexOf(d.dayLabel),
    y: associates.indexOf(d.associateName),
    z: d.utilizedHours,
    name: d.associateName,
    day: d.dayLabel,
    hours: d.utilizedHours,
    bandwidth: d.bandwidth,
  }));

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 100 }}>
          <XAxis
            type="number"
            dataKey="x"
            domain={[0, Math.max(days.length - 1, 0)]}
            tickCount={days.length}
            tickFormatter={(val) => days[val] ?? ""}
            name="Day"
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, Math.max(associates.length - 1, 0)]}
            tickCount={Math.min(associates.length, 15)}
            tickFormatter={(val) => associates[val] ?? ""}
            name="Associate"
            width={90}
          />
          <ZAxis type="number" dataKey="z" range={[200, 600]} />
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const item = payload[0]?.payload;
              if (!item) return null;
              return (
                <div className="rounded-md border bg-popover p-2 text-sm shadow-md">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">{item.day}</p>
                  <p>Utilized: {item.hours.toFixed(1)}h</p>
                  <p>Bandwidth: {item.bandwidth.toFixed(1)}h</p>
                </div>
              );
            }}
          />
          <Scatter data={scatterData}>
            {scatterData.map((entry, index) => (
              <Cell key={index} fill={getHeatColor(entry.hours)} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
