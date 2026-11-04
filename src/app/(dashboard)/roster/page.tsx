"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpDown, Users, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { getTeams, getRosterData, getSkills, getManagers } from "@/app/actions/data";
import { ActivityStatusBadge as StatusBadge } from "@/components/roster/activity-status-badge";

interface RosterEntry {
  id: string;
  name: string;
  email: string;
  team: string;
  level: string | null;
  location: string | null;
  jobTitle: string | null;
  skills: string[];
  manager: string | null;
  managerEmail: string | null;
  currentStatus: string | null;
  currentSubStatus: string | null;
}

type SortField = "name" | "team" | "level" | "location" | "manager" | "status";
type SortDir = "asc" | "desc";

export default function RosterPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [skills, setSkills] = useState<{ id: string; name: string; category: string | null }[]>([]);
  const [managers, setManagersList] = useState<{ id: string; name: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedSkillCategory, setSelectedSkillCategory] = useState("all");
  const [selectedProficiency, setSelectedProficiency] = useState("all");
  const [selectedManagerId, setSelectedManagerId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedActivity, setSelectedActivity] = useState("all");
  const [skillPopoverOpen, setSkillPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [displayMode, setDisplayMode] = useState<"name" | "login">("login");
  const [rosterData, setRosterData] = useState<RosterEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load filters on mount
  useEffect(() => {
    async function loadFilters() {
      try {
        const [teamsData, skillsData, managersData] = await Promise.all([
          getTeams(),
          getSkills(),
          getManagers(),
        ]);
        setTeams(teamsData);
        setSkills(skillsData);
        setManagersList(managersData);
      } catch (err) {
        console.error("Failed to load filters:", err);
      }
    }
    loadFilters();
  }, []);

  // Load roster data
  const loadRoster = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getRosterData({
        teamId: selectedTeamId !== "all" ? selectedTeamId : undefined,
        search: debouncedSearch || undefined,
        skillIds: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
        skillCategory: selectedSkillCategory !== "all" ? selectedSkillCategory : undefined,
        proficiency: selectedProficiency !== "all" ? selectedProficiency : undefined,
        managerId: selectedManagerId !== "all" ? selectedManagerId : undefined,
        page: currentPage,
      });
      setRosterData(result.data);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      console.error("Failed to load roster:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId, debouncedSearch, selectedSkillIds, selectedSkillCategory, selectedProficiency, selectedManagerId, currentPage]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  function handleRowClick(associateId: string) {
    router.push(`/climate/${associateId}`);
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Client-side sort (within the current page)
  const sortedData = [...rosterData].sort((a, b) => {
    const mod = sortDir === "asc" ? 1 : -1;
    let aVal: string;
    let bVal: string;
    switch (sortField) {
      case "name":
        aVal = displayMode === "login" ? a.email : a.name;
        bVal = displayMode === "login" ? b.email : b.name;
        break;
      case "team": aVal = a.team; bVal = b.team; break;
      case "level": aVal = a.level ?? ""; bVal = b.level ?? ""; break;
      case "location": aVal = a.location ?? ""; bVal = b.location ?? ""; break;
      case "manager":
        aVal = a.managerEmail?.replace(/@.*$/, "") ?? "";
        bVal = b.managerEmail?.replace(/@.*$/, "") ?? "";
        break;
      case "status": aVal = a.currentStatus ?? ""; bVal = b.currentStatus ?? ""; break;
      default: aVal = ""; bVal = "";
    }
    return aVal.localeCompare(bVal) * mod;
  });

  // Client-side status + activity filter
  const statusFiltered = selectedStatus === "all"
    ? sortedData
    : sortedData.filter((e) => e.currentStatus === selectedStatus);

  const filteredData = selectedActivity === "all"
    ? statusFiltered
    : statusFiltered.filter((e) => e.currentSubStatus === selectedActivity);

  // Compute unique activities from current data
  const activities = Array.from(
    new Set(rosterData.map((e) => e.currentSubStatus).filter(Boolean) as string[])
  ).sort();

  // Select all logic based on filtered visible data
  const allVisibleSelected = filteredData.length > 0 && filteredData.every((e) => selectedIds.includes(e.id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredData.some((e) => e.id === id)));
    } else {
      setSelectedIds((prev) => {
        const newIds = new Set(prev);
        filteredData.forEach((e) => newIds.add(e.id));
        return Array.from(newIds);
      });
    }
  }

  function SortableHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="cursor-pointer -ml-3 h-8 font-medium"
        onClick={() => handleSort(field)}
      >
        {children}
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    );
  }

  return (
    <>
      <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roster</h1>
        <p className="text-muted-foreground">
          Browse all associates across teams and programs.
        </p>
      </div>

        {/* Filters - Row 1 */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or login..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex rounded-md border border-border overflow-hidden">
              <Button
                variant={displayMode === "name" ? "default" : "ghost"}
                size="sm"
                className="rounded-none cursor-pointer"
                onClick={() => setDisplayMode("name")}
              >
                Name
              </Button>
              <Button
                variant={displayMode === "login" ? "default" : "ghost"}
                size="sm"
                className="rounded-none cursor-pointer"
                onClick={() => setDisplayMode("login")}
              >
                Login
              </Button>
            </div>
            <span className="text-sm text-muted-foreground ml-auto">
              {total} associate{total !== 1 ? "s" : ""}
            </span>
          </div>
          {/* Filters - Row 2 */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={selectedTeamId} onValueChange={(v) => { setSelectedTeamId(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[200px] cursor-pointer">
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
            <Select value={selectedManagerId} onValueChange={(v) => { setSelectedManagerId(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[160px] cursor-pointer">
                <SelectValue placeholder="All Managers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Managers</SelectItem>
                {managers.map((mgr) => (
                  <SelectItem key={mgr.id} value={mgr.id} className="cursor-pointer">
                    {mgr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover open={skillPopoverOpen} onOpenChange={setSkillPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between cursor-pointer">
                  <span className="truncate text-sm">
                    {selectedSkillCategory !== "all"
                      ? `All ${selectedSkillCategory}`
                      : selectedSkillIds.length > 0
                        ? `${selectedSkillIds.length} skill${selectedSkillIds.length > 1 ? "s" : ""} selected`
                        : "All Skills"}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <div className="p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start cursor-pointer text-sm"
                    onClick={() => {
                      setSelectedSkillIds([]);
                      setSelectedSkillCategory("all");
                      setCurrentPage(1);
                      setSkillPopoverOpen(false);
                    }}
                  >
                    All Skills
                  </Button>
                </div>
                <div className="p-2 border-b">
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-1">By Category</p>
                  {Array.from(new Set(skills.map(s => s.category).filter(Boolean))).sort().map(cat => (
                    <Button
                      key={cat}
                      variant={selectedSkillCategory === cat ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start cursor-pointer text-sm"
                      onClick={() => {
                        setSelectedSkillCategory(cat as string);
                        setSelectedSkillIds([]);
                        setCurrentPage(1);
                        setSkillPopoverOpen(false);
                      }}
                    >
                      All {cat}
                    </Button>
                  ))}
                </div>
                <div className="p-2 max-h-[200px] overflow-y-auto">
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-1">
                    Individual Skills (max 3)
                  </p>
                  {skills.map((skill) => {
                    const isSelected = selectedSkillIds.includes(skill.id);
                    const isDisabled = !isSelected && selectedSkillIds.length >= 3;
                    return (
                      <label
                        key={skill.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-muted ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isDisabled}
                          className="cursor-pointer"
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSkillIds((prev) => [...prev, skill.id]);
                            } else {
                              setSelectedSkillIds((prev) => prev.filter((id) => id !== skill.id));
                            }
                            setSelectedSkillCategory("all");
                            setCurrentPage(1);
                          }}
                        />
                        <span className="truncate">{skill.name}</span>
                      </label>
                    );
                  })}
                </div>
                {selectedSkillIds.length > 0 && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full cursor-pointer text-xs text-muted-foreground"
                      onClick={() => { setSelectedSkillIds([]); setCurrentPage(1); }}
                    >
                      <X className="mr-1 h-3 w-3" /> Clear selection
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Select value={selectedProficiency} onValueChange={(v) => { setSelectedProficiency(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[175px] cursor-pointer">
                <SelectValue placeholder="All Proficiency Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Proficiency Levels</SelectItem>
                <SelectItem value="Expert" className="cursor-pointer">Expert</SelectItem>
                <SelectItem value="Proficient" className="cursor-pointer">Proficient</SelectItem>
                <SelectItem value="Trained" className="cursor-pointer">Trained</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[155px] cursor-pointer">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Statuses</SelectItem>
                <SelectItem value="Production" className="cursor-pointer">Production</SelectItem>
                <SelectItem value="Meeting" className="cursor-pointer">Meeting</SelectItem>
                <SelectItem value="Break" className="cursor-pointer">Break</SelectItem>
                <SelectItem value="Leave" className="cursor-pointer">Leave</SelectItem>
                <SelectItem value="Stop" className="cursor-pointer">Stop</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedActivity} onValueChange={(v) => { setSelectedActivity(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[155px] cursor-pointer">
                <SelectValue placeholder="All Activities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="cursor-pointer">All Activities</SelectItem>
                {activities.map((activity) => (
                  <SelectItem key={activity} value={activity} className="cursor-pointer">
                    {activity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className="cursor-pointer"
                  />
                </TableHead>
                <TableHead className="min-w-[120px]"><SortableHeader field="name">Name</SortableHeader></TableHead>
                <TableHead className="min-w-[120px]"><SortableHeader field="team">Team</SortableHeader></TableHead>
                <TableHead className="w-[55px]"><SortableHeader field="level">Level</SortableHeader></TableHead>
                <TableHead className="hidden lg:table-cell w-[55px]"><SortableHeader field="location">Site</SortableHeader></TableHead>
                <TableHead className="hidden md:table-cell min-w-[130px]">Job Title</TableHead>
                <TableHead className="hidden xl:table-cell min-w-[140px]">Skills</TableHead>
                <TableHead className="hidden md:table-cell min-w-[90px]"><SortableHeader field="manager">Manager</SortableHeader></TableHead>
                <TableHead className="w-[90px]"><SortableHeader field="status">Status</SortableHeader></TableHead>
                <TableHead className="min-w-[110px]">Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <div className="h-5 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No associates found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(entry.id)}
                  >
                    <TableCell className="w-[40px]" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(entry.id)}
                        onCheckedChange={() => toggleSelection(entry.id)}
                        aria-label={`Select ${entry.name}`}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {displayMode === "name"
                        ? entry.name
                        : entry.email.replace(/@.*$/, "")}
                    </TableCell>
                    <TableCell className="text-xs">{entry.team}</TableCell>
                    <TableCell>
                      {entry.level && (
                        <Badge variant="outline" className="text-xs">
                          {entry.level}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs">
                      {entry.location ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {entry.jobTitle ?? "—"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex gap-1 flex-wrap max-w-[180px]">
                        {entry.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {entry.skills.length > 3 && (
                          <Badge
                            variant="secondary"
                            className="text-xs cursor-help"
                            title={entry.skills.slice(3).join(", ")}
                          >
                            +{entry.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs">
                      {entry.managerEmail?.replace(/@.*$/, "") ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.currentStatus} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.currentSubStatus ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="cursor-pointer"
              >
                Previous
              </Button>
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
          </div>
        )}

        {/* Selection bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-lg">
            <div className="container mx-auto flex items-center justify-between px-6 py-3">
              <span className="text-sm font-medium">
                {selectedIds.length} selected
              </span>
              <Button
                className="cursor-pointer"
                onClick={() => {
                  const params = selectedIds.map((id) => `associate=${id}`).join("&");
                  router.push(`/matchmaker/request?${params}`);
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                Request Cross-Utilization
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
