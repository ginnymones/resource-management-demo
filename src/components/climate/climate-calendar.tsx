"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCalendarData, getManagers } from "@/app/actions/data";

export interface CalendarDayData {
  date: string;
  utilizedHours: number;
  bandwidth: number;
  commitments: number;
}

interface ClimateCalendarProps {
  selectedTeamId: string;
  userRole?: string;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCapacityColor(utilizedHours: number, bandwidth: number): string {
  if (bandwidth === 0) return "bg-muted";
  const ratio = utilizedHours / bandwidth;
  if (ratio >= 0.9) return "bg-red-200 dark:bg-red-900/50 border-red-300 dark:border-red-800";
  if (ratio >= 0.6) return "bg-orange-200 dark:bg-orange-900/50 border-orange-300 dark:border-orange-800";
  return "bg-green-200 dark:bg-green-900/50 border-green-300 dark:border-green-800";
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function ClimateCalendar({ selectedTeamId, userRole }: ClimateCalendarProps) {
  const canViewManagerViews = ["Manager", "Senior_Leader", "Admin"].includes(userRole ?? "");
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [viewType, setViewType] = useState<"team" | "manager" | "associate">("team");
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [calendarData, setCalendarData] = useState<CalendarDayData[]>([]);
  const [loading, setLoading] = useState(false);

  // Load managers list
  useEffect(() => {
    async function loadManagers() {
      try {
        const data = await getManagers();
        setManagers(data);
      } catch (err) {
        console.error("Failed to load managers:", err);
      }
    }
    loadManagers();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCalendarData({
        month: currentMonth,
        year: currentYear,
        teamId: selectedTeamId !== "all" ? selectedTeamId : undefined,
        viewType,
        managerId: viewType === "manager" && selectedManagerId ? selectedManagerId : undefined,
      });
      setCalendarData(data);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, selectedTeamId, viewType, selectedManagerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Build calendar grid
  const calendarCells: (CalendarDayData | null)[] = [];
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayData = calendarData.find((d) => d.date === dateStr);
    calendarCells.push(
      dayData || { date: dateStr, utilizedHours: 0, bandwidth: 7.5, commitments: 0 }
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg">Capacity Calendar</CardTitle>
          <div className="flex items-center gap-3">
            {/* View Type Toggle */}
            <Select value={viewType} onValueChange={(v) => setViewType(v as "team" | "manager" | "associate")}>
              <SelectTrigger className="w-[150px] cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team" className="cursor-pointer">Team View</SelectItem>
                {canViewManagerViews && (
                  <>
                    <SelectItem value="manager" className="cursor-pointer">Manager View</SelectItem>
                    <SelectItem value="associate" className="cursor-pointer">Associate View</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Manager Filter (shown only in manager view) */}
            {viewType === "manager" && (
              <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
                <SelectTrigger className="w-[180px] cursor-pointer">
                  <SelectValue placeholder="Select Manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((mgr) => (
                    <SelectItem key={mgr.id} value={mgr.id} className="cursor-pointer">
                      {mgr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={goToPreviousMonth} className="cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold">{monthName}</h3>
          <Button variant="ghost" size="icon" onClick={goToNextMonth} className="cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900/50 border border-green-300 dark:border-green-800" />
            <span>Available (&lt;60%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-200 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-800" />
            <span>Moderate (60-90%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900/50 border border-red-300 dark:border-red-800" />
            <span>At Capacity (&gt;90%)</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {/* Calendar cells */}
            {calendarCells.map((cell, index) => {
              if (!cell) {
                return <div key={`empty-${index}`} className="h-16" />;
              }
              const dayNum = parseInt(cell.date.split("-")[2], 10);
              const isToday =
                cell.date ===
                `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
              const colorClass = getCapacityColor(cell.utilizedHours, cell.bandwidth);

              return (
                <div
                  key={cell.date}
                  className={`h-16 rounded border p-1 text-xs flex flex-col ${colorClass} ${
                    isToday ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <span className={`font-medium ${isToday ? "text-primary" : ""}`}>
                    {dayNum}
                  </span>
                  <span className="text-[10px] mt-auto">
                    {cell.utilizedHours.toFixed(1)}h / {cell.bandwidth.toFixed(1)}h
                  </span>
                  {cell.commitments > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {cell.commitments} req
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
