"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { getCapacityColorClass } from "@/lib/utils/capacity-color";
import { getAssociatesList, getProcesses } from "@/app/actions/data";
import { recordTimeEntry } from "@/app/actions/time-entries";

interface UtilizationRow {
  associateId: string;
  associateName: string;
  totalHours: number;
  bandwidth: number;
}

export default function EfficiencyTrackerPage() {
  const { data: session } = useSession();
  const [selectedAssociate, setSelectedAssociate] = useState("");
  const [selectedProcess, setSelectedProcess] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("1.0");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ hours: number } | null>(null);
  const [utilization, setUtilization] = useState<UtilizationRow[]>([]);

  const [associates, setAssociates] = useState<{ id: string; name: string }[]>([]);
  const [processes, setProcesses] = useState<{ id: string; name: string }[]>([]);

  const userId = session?.user?.id;

  useEffect(() => {
    async function loadData() {
      try {
        const [associatesData, processesData] = await Promise.all([
          getAssociatesList(),
          getProcesses(),
        ]);
        setAssociates(associatesData);
        setProcesses(processesData.map((p) => ({ id: p.id, name: p.name })));
      } catch (err) {
        console.error("Failed to load efficiency data:", err);
      }
    }
    loadData();
  }, []);

  async function submitEntry(overwrite: boolean = false) {
    if (!userId) return;
    setError("");
    setSuccess("");

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 7.5) {
      setError("Hours must be between 0 and 7.5.");
      return;
    }

    if (hoursNum % 0.25 !== 0) {
      setError("Hours must be in increments of 0.25.");
      return;
    }

    if (!selectedAssociate) {
      setError("Please select an associate.");
      return;
    }

    if (!selectedProcess) {
      setError("Please select a process.");
      return;
    }

    try {
      const result = await recordTimeEntry(
        {
          associateId: selectedAssociate,
          processId: selectedProcess,
          date: selectedDate,
          hours: hoursNum,
          enteredBy: userId,
        },
        overwrite
      );

      if (result.duplicate && !overwrite) {
        setDuplicateInfo({ hours: result.existing!.hours });
        setShowDuplicateDialog(true);
        return;
      }

      setSuccess("Time entry recorded successfully.");

      // Update utilization summary
      const associateName = associates.find((a) => a.id === selectedAssociate)?.name ?? "";
      setUtilization((prev) => {
        const existing = prev.find((r) => r.associateId === selectedAssociate);
        if (existing) {
          return prev.map((r) =>
            r.associateId === selectedAssociate
              ? { ...r, totalHours: r.totalHours + hoursNum }
              : r
          );
        }
        return [
          ...prev,
          {
            associateId: selectedAssociate,
            associateName,
            totalHours: hoursNum,
            bandwidth: 7.5 - hoursNum,
          },
        ];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record time entry.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitEntry(false);
  }

  function handleOverwrite() {
    setShowDuplicateDialog(false);
    submitEntry(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Efficiency Tracker</h1>
        <p className="text-muted-foreground">
          Record time entries and track associate utilization across processes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Entry Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Record Time Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="associate-select">Associate</Label>
                <Select value={selectedAssociate} onValueChange={setSelectedAssociate}>
                  <SelectTrigger id="associate-select" className="cursor-pointer">
                    <SelectValue placeholder="Select associate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {associates.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="cursor-pointer">
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="process-select">Process</Label>
                <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                  <SelectTrigger id="process-select" className="cursor-pointer">
                    <SelectValue placeholder="Select process..." />
                  </SelectTrigger>
                  <SelectContent>
                    {processes.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="cursor-pointer">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry-date">Date</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry-hours">Hours (0 – 7.5, step 0.25)</Label>
                <Input
                  id="entry-hours"
                  type="number"
                  min="0"
                  max="7.5"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full cursor-pointer">
                Record Entry
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Utilization Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Utilization Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {utilization.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No utilization data available. Record time entries to see the summary.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Associate</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Bandwidth</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utilization.map((row) => (
                    <TableRow key={row.associateId}>
                      <TableCell className="font-medium">{row.associateName}</TableCell>
                      <TableCell>{row.totalHours.toFixed(1)}h</TableCell>
                      <TableCell>{row.bandwidth.toFixed(1)}h</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCapacityColorClass(row.totalHours)}`}
                        >
                          {row.totalHours > 7.5
                            ? "Over"
                            : row.totalHours > 6.5
                              ? "Warning"
                              : "OK"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Entry Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Entry Detected</DialogTitle>
            <DialogDescription>
              A time entry already exists for this associate, process, and date
              {duplicateInfo && ` (${duplicateInfo.hours}h)`}. Do you want to overwrite it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleOverwrite} className="cursor-pointer">
              Overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
