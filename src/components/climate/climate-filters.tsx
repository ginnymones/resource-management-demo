"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ClimateFiltersProps {
  viewMode: "table" | "calendar";
  onViewModeChange: (mode: "table" | "calendar") => void;
  timeGranularity: "daily" | "weekly" | "monthly";
  onTimeGranularityChange: (granularity: "daily" | "weekly" | "monthly") => void;
  teams: { id: string; name: string }[];
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  processes: { id: string; name: string }[];
  selectedProcessId: string;
  onProcessChange: (processId: string) => void;
}

export function ClimateFilters({
  viewMode,
  onViewModeChange,
  timeGranularity,
  onTimeGranularityChange,
  teams,
  selectedTeamId,
  onTeamChange,
  processes,
  selectedProcessId,
  onProcessChange,
}: ClimateFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
      {/* Time Granularity */}
      <div className="flex rounded-md border border-border overflow-hidden">
        {(["daily", "weekly", "monthly"] as const).map((g) => (
          <Button
            key={g}
            variant={timeGranularity === g ? "default" : "ghost"}
            size="sm"
            className="rounded-none cursor-pointer capitalize"
            onClick={() => onTimeGranularityChange(g)}
          >
            {g}
          </Button>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex rounded-md border border-border overflow-hidden">
        <Button
          variant={viewMode === "table" ? "default" : "ghost"}
          size="sm"
          className="rounded-none cursor-pointer"
          onClick={() => onViewModeChange("table")}
        >
          Table
        </Button>
        <Button
          variant={viewMode === "calendar" ? "default" : "ghost"}
          size="sm"
          className="rounded-none cursor-pointer"
          onClick={() => onViewModeChange("calendar")}
        >
          Calendar
        </Button>
      </div>

      {/* Team Filter */}
      <Select value={selectedTeamId} onValueChange={onTeamChange}>
        <SelectTrigger className="w-[160px] cursor-pointer">
          <SelectValue placeholder="All Teams" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="cursor-pointer">All Teams</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id} className="cursor-pointer">
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Process Filter */}
      <Select value={selectedProcessId} onValueChange={onProcessChange}>
        <SelectTrigger className="w-[180px] cursor-pointer">
          <SelectValue placeholder="All Processes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="cursor-pointer">All Processes</SelectItem>
          {processes.map((process) => (
            <SelectItem key={process.id} value={process.id} className="cursor-pointer">
              {process.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
