"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Clock, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMyProcesses,
  logMyTime,
  getMyTodayEntries,
  getMyTimeHistory,
  deleteMyTimeEntry,
  editMyTimeEntry,
} from "@/app/actions/associate-time";

type ProcessOption = { id: string; name: string };
type TodayEntry = {
  id: string;
  processName: string;
  processId: string;
  hours: number;
  notes: string | null;
  createdAt: string;
};
type HistoryEntry = {
  id: string;
  processName: string;
  processId: string;
  hours: number;
  notes: string | null;
  date: string;
  createdAt: string;
};

export default function AssociateDashboard() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userName = session?.user?.name ?? "Associate";
  const userRole = session?.user?.role ?? "Associate";

  // Form state
  const [processes, setProcesses] = useState<ProcessOption[]>([]);
  const [selectedProcess, setSelectedProcess] = useState("");
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [hours, setHours] = useState("0.25");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Today's entries
  const [todayEntries, setTodayEntries] = useState<TodayEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [dateFilter, setDateFilter] = useState("last30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Load processes
  useEffect(() => {
    if (!userId) return;
    getMyProcesses(userId).then(setProcesses).catch(console.error);
  }, [userId]);

  // Load today's entries
  const loadTodayEntries = useCallback(async () => {
    if (!userId) return;
    try {
      const entries = await getMyTodayEntries(userId);
      setTodayEntries(entries);
    } catch (err) {
      console.error("Failed to load today's entries:", err);
    }
  }, [userId]);

  useEffect(() => {
    loadTodayEntries();
  }, [loadTodayEntries]);

  // Load history
  const loadHistory = useCallback(async () => {
    if (!userId) return;

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dateFilter === "last7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString().split("T")[0];
    } else if (dateFilter === "last30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString().split("T")[0];
    } else if (dateFilter === "custom") {
      startDate = customStart || undefined;
      endDate = customEnd || undefined;
    }

    try {
      const result = await getMyTimeHistory(userId, {
        startDate,
        endDate,
        page: historyPage,
      });
      setHistory(result.entries);
      setHistoryTotalPages(result.totalPages);
      setHistoryTotal(result.total);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, [userId, dateFilter, customStart, customEnd, historyPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Submit time entry
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !selectedProcess) return;

    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    try {
      const result = await logMyTime({
        userId,
        processId: selectedProcess,
        date: entryDate,
        hours: parseFloat(hours),
        notes: notes || undefined,
      });
      setFormSuccess(`Logged ${result.hours}h for ${result.processName}`);
      setSelectedProcess("");
      setHours("0.25");
      setNotes("");
      loadTodayEntries();
      loadHistory();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to log time");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete entry
  async function handleDelete(entryId: string) {
    if (!userId) return;
    try {
      await deleteMyTimeEntry(entryId, userId);
      loadTodayEntries();
      loadHistory();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  // Start editing
  function startEdit(entry: TodayEntry) {
    setEditingId(entry.id);
    setEditHours(String(entry.hours));
    setEditNotes(entry.notes || "");
  }

  // Save edit
  async function handleSaveEdit(entryId: string) {
    if (!userId) return;
    try {
      await editMyTimeEntry(entryId, userId, {
        hours: parseFloat(editHours),
        notes: editNotes || undefined,
      });
      setEditingId(null);
      loadTodayEntries();
      loadHistory();
    } catch (err) {
      console.error("Failed to edit:", err);
    }
  }

  // Generate hour options (0.25 to 7.5 in 0.25 steps)
  const hourOptions: number[] = [];
  for (let h = 0.25; h <= 7.5; h += 0.25) {
    hourOptions.push(h);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {userName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Role: {userRole} • Log your time and track your hours
        </p>
      </div>

      {/* Time Entry Form */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" aria-hidden="true" />
          Log Time
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Process select */}
            <div className="space-y-2">
              <Label htmlFor="process">Process</Label>
              <Select
                value={selectedProcess}
                onValueChange={setSelectedProcess}
              >
                <SelectTrigger id="process">
                  <SelectValue placeholder="Select a process" />
                </SelectTrigger>
                <SelectContent>
                  {processes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="entry-date">Date</Label>
              <input
                id="entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Hours */}
            <div className="space-y-2">
              <Label htmlFor="hours">Hours (0.25 - 7.5)</Label>
              <Select value={hours} onValueChange={setHours}>
                <SelectTrigger id="hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hourOptions.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <input
                id="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Task context or description"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          {formSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {formSuccess}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !selectedProcess}
            className="cursor-pointer"
          >
            {submitting ? "Logging..." : "Log Time"}
          </Button>
        </form>
      </section>

      {/* Today's Entries */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Today&apos;s Entries</h2>
        {todayEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No entries logged today yet.
          </p>
        ) : (
          <div className="space-y-3">
            {todayEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                {editingId === entry.id ? (
                  <div className="flex flex-1 items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium">
                      {entry.processName}
                    </span>
                    <Select value={editHours} onValueChange={setEditHours}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {hourOptions.map((h) => (
                          <SelectItem key={h} value={String(h)}>
                            {h}h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes"
                      className="flex h-9 w-40 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(entry.id)}
                      className="cursor-pointer"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">
                        {entry.processName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {entry.hours}h
                      </span>
                      {entry.notes && (
                        <span className="text-xs text-muted-foreground italic">
                          {entry.notes}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(entry)}
                        aria-label={`Edit ${entry.processName} entry`}
                        className="cursor-pointer h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry.id)}
                        aria-label={`Delete ${entry.processName} entry`}
                        className="cursor-pointer h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Timesheet History */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Timesheet History</h2>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setHistoryPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7">Last 7 days</SelectItem>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => { setCustomStart(e.target.value); setHistoryPage(1); }}
                className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
                aria-label="Start date"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => { setCustomEnd(e.target.value); setHistoryPage(1); }}
                className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
                aria-label="End date"
              />
            </div>
          )}

          <span className="text-xs text-muted-foreground">
            {historyTotal} entries
          </span>
        </div>

        {/* Table */}
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium">Date</th>
                  <th className="text-left py-2 px-3 font-medium">Process</th>
                  <th className="text-left py-2 px-3 font-medium">Hours</th>
                  <th className="text-left py-2 px-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 px-3">{entry.date}</td>
                    <td className="py-2 px-3">{entry.processName}</td>
                    <td className="py-2 px-3">{entry.hours}h</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {entry.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {historyTotalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={historyPage <= 1}
              onClick={() => setHistoryPage((p) => p - 1)}
              className="cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {historyPage} of {historyTotalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={historyPage >= historyTotalPages}
              onClick={() => setHistoryPage((p) => p + 1)}
              className="cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
