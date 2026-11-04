"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, BarChart3, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { ClimateTable, type ClimateTableRow } from "@/components/climate/climate-table";
import { ClimateCalendar } from "@/components/climate/climate-calendar";
import { getTeams, getClimateData } from "@/app/actions/data";
import { isClimateEnabled } from "@/app/actions/settings";
import { getProgramStatus, getHCSummary, getProgramCategories } from "@/app/actions/climate";

type ViewMode = "programs" | "team" | "users";

interface ProgramData {
  id: string;
  name: string;
  team: string;
  category: string;
  vertical: string | null;
  isActive: boolean;
  plannedHC: number;
  actualHC: number;
  trainedHC: number;
  deficit: number;
  poc: string | null;
}

interface HCSummary {
  totalPrograms: number;
  activePrograms: number;
  inactivePrograms: number;
  totalPlannedHC: number;
  totalActualHC: number;
  totalTrainedHC: number;
  activePlannedHC: number;
  activeActualHC: number;
  activeTrainedHC: number;
}

export default function ClimatePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "SME";

  const [viewMode, setViewMode] = useState<ViewMode>("programs");
  const [pageEnabled, setPageEnabled] = useState<boolean | null>(null);

  // Program status state
  const [programs, setPrograms] = useState<ProgramData[]>([]);
  const [summary, setSummary] = useState<HCSummary | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);

  // Team/User view state
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [tableData, setTableData] = useState<ClimateTableRow[]>([]);

  useEffect(() => {
    async function checkEnabled() {
      try {
        const enabled = await isClimateEnabled();
        setPageEnabled(enabled);
      } catch {
        setPageEnabled(true);
      }
    }
    checkEnabled();
  }, []);

  // Load program data
  useEffect(() => {
    async function loadPrograms() {
      try {
        const [programData, summaryData, cats] = await Promise.all([
          getProgramStatus(selectedCategories.length > 0 ? { categories: selectedCategories } : undefined),
          getHCSummary(),
          getProgramCategories(),
        ]);
        setPrograms(programData);
        setSummary(summaryData);
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load program status:", err);
      }
    }
    loadPrograms();
  }, [selectedCategories]);

  // Load team/user data
  useEffect(() => {
    async function loadTeamData() {
      if (viewMode !== "team" && viewMode !== "users") return;
      try {
        const [teamsData, climateData] = await Promise.all([
          getTeams(),
          getClimateData({ teamId: selectedTeamId }),
        ]);
        setTeams(teamsData);
        setTableData(
          climateData.map((d) => ({
            associateId: d.associateId,
            associateName: d.associateName,
            team: d.team,
            utilizedHours: d.utilizedHours,
            bandwidth: d.bandwidth,
          }))
        );
      } catch (err) {
        console.error("Failed to load team data:", err);
      }
    }
    loadTeamData();
  }, [viewMode, selectedTeamId]);

  function handleRowClick(associateId: string) {
    router.push(`/climate/${associateId}`);
  }

  if (pageEnabled === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Climate</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!pageEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Climate</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">This page is temporarily unavailable</h2>
            <p className="text-muted-foreground max-w-md">
              The Resource Climate page has been disabled by an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredPrograms = showInactive ? programs : programs.filter((p) => p.isActive);
  const maxHC = Math.max(...filteredPrograms.map((p) => Math.max(p.plannedHC, p.actualHC, p.trainedHC)), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Climate</h1>
          <p className="text-muted-foreground">
            Program headcount status, team workload, and user utilization.
          </p>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden">
          <Button
            variant={viewMode === "programs" ? "default" : "ghost"}
            size="sm"
            className="rounded-none cursor-pointer gap-1"
            onClick={() => setViewMode("programs")}
          >
            <BarChart3 className="h-4 w-4" /> Programs
          </Button>
          <Button
            variant={viewMode === "team" ? "default" : "ghost"}
            size="sm"
            className="rounded-none cursor-pointer gap-1"
            onClick={() => setViewMode("team")}
          >
            <Calendar className="h-4 w-4" /> Team
          </Button>
          <Button
            variant={viewMode === "users" ? "default" : "ghost"}
            size="sm"
            className="rounded-none cursor-pointer gap-1"
            onClick={() => setViewMode("users")}
          >
            <Users className="h-4 w-4" /> Users
          </Button>
        </div>
      </div>

      {/* Program Status View (Default) */}
      {viewMode === "programs" && (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Active Programs</p>
                  <p className="text-2xl font-bold">{summary.activePrograms}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Planned HC</p>
                  <p className="text-2xl font-bold">{summary.activePlannedHC}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Actual HC</p>
                  <p className="text-2xl font-bold">{summary.activeActualHC}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Trained HC</p>
                  <p className="text-2xl font-bold">{summary.activeTrainedHC}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="cursor-pointer gap-1">
                  {selectedCategories.length > 0
                    ? `${selectedCategories.length} categor${selectedCategories.length > 1 ? "ies" : "y"}`
                    : "All Categories"}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2" align="start">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start cursor-pointer"
                  onClick={() => { setSelectedCategories([]); setCatPopoverOpen(false); }}
                >
                  All Categories
                </Button>
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-muted">
                    <Checkbox
                      checked={selectedCategories.includes(cat)}
                      className="cursor-pointer"
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCategories((prev) => [...prev, cat]);
                        } else {
                          setSelectedCategories((prev) => prev.filter((c) => c !== cat));
                        }
                      }}
                    />
                    {cat}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={showInactive}
                onCheckedChange={(v) => setShowInactive(!!v)}
                className="cursor-pointer"
              />
              Show Inactive
            </label>
          </div>

          {/* Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Headcount by Program</CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Planned</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Actual</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Trained</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPrograms.map((program) => (
                  <div key={program.id} className="flex items-center gap-3">
                    <div className="w-[200px] min-w-[140px] shrink-0">
                      <p className="text-xs font-medium truncate" title={program.name}>{program.name}</p>
                      <p className="text-xs text-muted-foreground">{program.team}</p>
                    </div>
                    <div className="flex-1 space-y-1">
                      {/* Planned */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-sm"
                            style={{ width: `${(program.plannedHC / maxHC) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs w-8 text-right">{program.plannedHC}</span>
                      </div>
                      {/* Actual */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-sm"
                            style={{ width: `${(program.actualHC / maxHC) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs w-8 text-right">{program.actualHC}</span>
                      </div>
                      {/* Trained */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-sm"
                            style={{ width: `${(program.trainedHC / maxHC) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs w-8 text-right">{program.trainedHC}</span>
                      </div>
                    </div>
                    <div className="w-[80px] shrink-0 text-right">
                      {!program.isActive ? (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      ) : program.deficit < 0 ? (
                        <Badge variant="destructive" className="text-xs">{program.deficit}</Badge>
                      ) : program.deficit > 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">+{program.deficit}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">On target</Badge>
                      )}
                    </div>
                  </div>
                ))}
                {filteredPrograms.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No programs match the selected filters.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Team View */}
      {viewMode === "team" && (
        <>
          <div className="flex items-center gap-3">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-[200px] cursor-pointer">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Teams</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="cursor-pointer">{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ClimateCalendar selectedTeamId={selectedTeamId} userRole={userRole} />
        </>
      )}

      {/* Users View */}
      {viewMode === "users" && (
        <>
          <div className="flex items-center gap-3">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-[200px] cursor-pointer">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Teams</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="cursor-pointer">{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ClimateTable data={tableData} onRowClick={handleRowClick} />
        </>
      )}
    </div>
  );
}
