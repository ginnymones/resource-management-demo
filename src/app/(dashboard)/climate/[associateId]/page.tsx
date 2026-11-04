"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Award, BookOpen, Clock, BarChart3, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAssociateProfile, getAssociateTimeBreakdown, getDeploymentHistory } from "@/app/actions/associates";

interface AssociateProfile {
  id: string;
  name: string;
  team: string;
  bandwidth: number;
  skills: { name: string; proficiency: string }[];
  trainings: { name: string; completionDate: string }[];
  successIndicators: { processName: string; count: number }[];
}

interface TimeBreakdown {
  totalHours: number;
  thisWeekHours: number;
  thisMonthHours: number;
  byProcess: { name: string; hours: number }[];
  dailyEntries: { date: string; process: string; hours: number }[];
}

interface DeploymentHistory {
  scope: string;
  totalDeployments: number;
  totalHours: number;
  deployments: {
    processName: string;
    firstDate: string;
    lastDate: string;
    totalHours: number;
  }[];
}

const proficiencyColors: Record<string, string> = {
  Expert: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Proficient: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Trained: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Not_Trained: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function formatDateRange(firstDate: string, lastDate: string): string {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (firstDate === lastDate) {
    return formatDate(firstDate);
  }
  return `${formatDate(firstDate)} – ${formatDate(lastDate)}`;
}

export default function AssociateProfilePage({
  params,
}: {
  params: { associateId: string };
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<AssociateProfile | null>(null);
  const [timeBreakdown, setTimeBreakdown] = useState<TimeBreakdown | null>(null);
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentHistory | null>(null);
  const [deploymentScope, setDeploymentScope] = useState<"month" | "90days" | "all">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const [data, timeData, deployData] = await Promise.all([
          getAssociateProfile(params.associateId),
          getAssociateTimeBreakdown(params.associateId),
          getDeploymentHistory(params.associateId, "all"),
        ]);
        setProfile({
          id: data.id,
          name: data.name,
          team: data.team.name,
          bandwidth: data.bandwidth,
          skills: data.skills.map((s) => ({
            name: s.skill.name,
            proficiency: s.proficiency,
          })),
          trainings: data.trainings.map((t) => ({
            name: t.trainingName,
            completionDate: t.completionDate.toISOString
              ? t.completionDate.toISOString()
              : String(t.completionDate),
          })),
          successIndicators: data.successIndicators,
        });
        setTimeBreakdown(timeData);
        setDeploymentHistory(deployData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile.");
      }
    }
    loadProfile();
  }, [params.associateId]);

  // Reload deployment history when scope changes
  useEffect(() => {
    // Skip on initial render — the loadProfile effect handles the first fetch
    if (!profile) return;
    async function reloadDeployments() {
      const data = await getDeploymentHistory(params.associateId, deploymentScope);
      setDeploymentHistory(data);
    }
    reloadDeployments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentScope]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}>
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Associate Profile</h1>
            <p className="text-muted-foreground">ID: {params.associateId}</p>
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}>
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Associate Profile</h1>
            <p className="text-muted-foreground">ID: {params.associateId}</p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Loading associate profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}>
          <Button variant="ghost" size="icon" className="cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
          <p className="text-muted-foreground">{profile.team}</p>
        </div>
      </div>

      {/* Current Bandwidth - Prominent Display */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Bandwidth</p>
              <p className="text-3xl font-bold text-primary">
                {profile.bandwidth.toFixed(1)} <span className="text-lg font-normal">hrs/day</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Skills & Proficiency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Skills & Proficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Proficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.skills.map((skill) => (
                    <TableRow key={skill.name}>
                      <TableCell className="font-medium">{skill.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={proficiencyColors[skill.proficiency] ?? ""}
                        >
                          {skill.proficiency.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Training History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Training History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile.trainings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No training records.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profile.trainings.map((training, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{training.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(training.completionDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Deployment History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Deployment History
            </CardTitle>
            <Select
              value={deploymentScope}
              onValueChange={(v) => setDeploymentScope(v as "month" | "90days" | "all")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!deploymentHistory || deploymentHistory.deployments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No deployment records for this period.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{deploymentHistory.totalDeployments} process{deploymentHistory.totalDeployments !== 1 ? "es" : ""}</span>
                <span>•</span>
                <span>{deploymentHistory.totalHours.toFixed(1)} total hours</span>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Process</TableHead>
                      <TableHead>Time Span</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deploymentHistory.deployments.map((dep) => (
                      <TableRow key={dep.processName}>
                        <TableCell className="font-medium">{dep.processName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateRange(dep.firstDate, dep.lastDate)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {dep.totalHours.toFixed(1)}h
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Utilization */}
      {timeBreakdown && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Time Utilization (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{timeBreakdown.thisWeekHours.toFixed(1)}h</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">{timeBreakdown.thisMonthHours.toFixed(1)}h</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">Last 30 Days</p>
                <p className="text-2xl font-bold">{timeBreakdown.totalHours.toFixed(1)}h</p>
              </div>
            </div>

            {/* Process Breakdown */}
            {timeBreakdown.byProcess.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Breakdown by Process</h4>
                <div className="space-y-3">
                  {timeBreakdown.byProcess.map((proc) => {
                    const percentage = timeBreakdown.totalHours > 0
                      ? (proc.hours / timeBreakdown.totalHours) * 100
                      : 0;
                    return (
                      <div key={proc.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{proc.name}</span>
                          <span className="text-muted-foreground">
                            {proc.hours.toFixed(1)}h ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Entries Table */}
            {timeBreakdown.dailyEntries.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Recent Time Entries</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Process</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeBreakdown.dailyEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell className="text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">{entry.process}</TableCell>
                          <TableCell className="text-right">{entry.hours.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {timeBreakdown.byProcess.length === 0 && timeBreakdown.dailyEntries.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No time entries recorded in the last 30 days.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
