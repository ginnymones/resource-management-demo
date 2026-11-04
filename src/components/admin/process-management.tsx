"use client";

import { useState } from "react";
import { Plus, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ProcessRow {
  id: string;
  name: string;
  complexityFactor: number;
  description?: string;
  parentName?: string;
  category?: string;
  parentId?: string;
  isActive?: boolean;
  plannedHC?: number;
  actualHC?: number;
  trainedHC?: number;
}

interface ProcessOwnerRow {
  id: string;
  processId: string;
  processName: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
}

interface EligibleOwner {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ProcessManagementProps {
  processes: ProcessRow[];
  onCreate?: (data: { name: string; complexityFactor: number; description?: string }) => void;
  onUpdate?: (id: string, data: { name: string; complexityFactor: number; description?: string; plannedHC?: number; actualHC?: number; trainedHC?: number; isActive?: boolean }) => void;
  processOwners: ProcessOwnerRow[];
  eligibleOwners: EligibleOwner[];
  onAssignOwner?: (processId: string, userId: string) => void;
  onRemoveOwner?: (processId: string, userId: string) => void;
  isAdmin: boolean;
}

export function ProcessManagement({
  processes,
  onCreate,
  onUpdate,
  processOwners,
  eligibleOwners,
  onAssignOwner,
  onRemoveOwner,
  isAdmin,
}: ProcessManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessRow | null>(null);
  const [name, setName] = useState("");
  const [complexityFactor, setComplexityFactor] = useState("1.0");
  const [description, setDescription] = useState("");
  const [selectedPocId, setSelectedPocId] = useState("");
  const [editPlannedHC, setEditPlannedHC] = useState("");
  const [editActualHC, setEditActualHC] = useState("");
  const [editTrainedHC, setEditTrainedHC] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [error, setError] = useState("");

  // Owner assignment state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignProcessId, setAssignProcessId] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  function openCreateDialog() {
    setEditingProcess(null);
    setName("");
    setComplexityFactor("1.0");
    setDescription("");
    setSelectedPocId("");
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(process: ProcessRow) {
    setEditingProcess(process);
    setName(process.name);
    setComplexityFactor(process.complexityFactor.toString());
    setDescription(process.description ?? "");
    setEditPlannedHC(process.plannedHC?.toString() ?? "");
    setEditActualHC(process.actualHC?.toString() ?? "");
    setEditTrainedHC(process.trainedHC?.toString() ?? "");
    setEditIsActive(process.isActive ?? true);
    // Find the current POC (owner) for this process
    const currentOwners = processOwners.filter((po) => po.processId === process.id);
    setSelectedPocId(currentOwners.length > 0 ? currentOwners[0].userId : "");
    setError("");
    setDialogOpen(true);
  }

  function handleSave() {
    if (!name.trim()) {
      setError("Process name is required.");
      return;
    }

    const factor = parseFloat(complexityFactor);
    if (isNaN(factor) || factor < 0.5 || factor > 3.0) {
      setError("Complexity factor must be between 0.5 and 3.0.");
      return;
    }

    const data = {
      name: name.trim(),
      complexityFactor: factor,
      description: description.trim() || undefined,
      plannedHC: editPlannedHC ? parseInt(editPlannedHC, 10) : undefined,
      actualHC: editActualHC ? parseInt(editActualHC, 10) : undefined,
      trainedHC: editTrainedHC ? parseInt(editTrainedHC, 10) : undefined,
      isActive: editIsActive,
    };

    if (editingProcess && onUpdate) {
      onUpdate(editingProcess.id, data);

      // Handle POC assignment change
      if (onAssignOwner && onRemoveOwner) {
        const currentOwners = processOwners.filter((po) => po.processId === editingProcess.id);
        const currentPocId = currentOwners.length > 0 ? currentOwners[0].userId : "";
        const newPocId = selectedPocId === "none" ? "" : selectedPocId;

        if (newPocId !== currentPocId) {
          // Remove old POC
          if (currentPocId) {
            onRemoveOwner(editingProcess.id, currentPocId);
          }
          // Assign new POC
          if (newPocId) {
            onAssignOwner(editingProcess.id, newPocId);
          }
        }
      }
    } else if (onCreate) {
      onCreate(data);
      // For new process, we'd need the processId back to assign POC
      // This is handled via the separate Assign button for now
    }

    setDialogOpen(false);
  }

  function openAssignDialog(processId: string) {
    setAssignProcessId(processId);
    setSelectedOwnerId("");
    setAssignDialogOpen(true);
  }

  function handleAssignSave() {
    if (selectedOwnerId && onAssignOwner) {
      onAssignOwner(assignProcessId, selectedOwnerId);
      setAssignDialogOpen(false);
    }
  }

  function getOwnersForProcess(processId: string) {
    return processOwners.filter((po) => po.processId === processId);
  }

  return (
    <>
      {isAdmin && onCreate && (
        <div className="flex justify-end mb-3">
          <Button size="sm" onClick={openCreateDialog} className="cursor-pointer">
            <Plus className="mr-1 h-4 w-4" />
            New Process
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[12%] min-w-[80px]">Team</TableHead>
            <TableHead className="w-[28%] min-w-[140px]">Program</TableHead>
            <TableHead className="w-[14%] min-w-[80px]">Category</TableHead>
            <TableHead className="w-[10%] min-w-[70px]">Complexity</TableHead>
            <TableHead className="w-[22%] min-w-[120px]">POC</TableHead>
            {isAdmin && <TableHead className="w-[60px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {processes.filter((p) => p.parentId).length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                No programs configured.
              </TableCell>
            </TableRow>
          ) : (
            processes
              .filter((p) => p.parentId) // Only show child programs, not top-level parents
              .map((process) => {
              const owners = getOwnersForProcess(process.id);
              return (
                <TableRow key={process.id}>
                  <TableCell className="text-muted-foreground text-sm">{process.parentName || "—"}</TableCell>
                  <TableCell className="font-medium">{process.name}</TableCell>
                  <TableCell>
                    {process.category && (
                      <Badge variant="outline">{process.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell>×{process.complexityFactor.toFixed(1)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {owners.map((owner) => (
                        <Badge key={owner.id} variant="secondary" className="flex items-center gap-1">
                          {owner.userEmail.replace(/@.*$/, "")}
                          {isAdmin && onRemoveOwner && (
                            <button
                              onClick={() => onRemoveOwner(process.id, owner.userId)}
                              className="ml-1 hover:text-destructive"
                              aria-label={`Remove ${owner.userName}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                      {isAdmin && onAssignOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs cursor-pointer"
                          onClick={() => openAssignDialog(process.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Assign
                        </Button>
                      )}
                      {owners.length === 0 && !isAdmin && (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 cursor-pointer"
                        onClick={() => openEditDialog(process)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Create/Edit Process Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProcess ? "Edit Process" : "Create Process"}</DialogTitle>
            <DialogDescription>
              {editingProcess
                ? "Update the process details."
                : "Add a new process with a complexity factor."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="process-name">Name</Label>
              <Input
                id="process-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Process name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complexity-factor">Complexity Factor (0.5 – 3.0)</Label>
              <Input
                id="complexity-factor"
                type="number"
                min="0.5"
                max="3.0"
                step="0.1"
                value={complexityFactor}
                onChange={(e) => setComplexityFactor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="process-description">Description (optional)</Label>
              <Input
                id="process-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="process-poc">POC (Point of Contact)</Label>
              <Select value={selectedPocId} onValueChange={setSelectedPocId}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select a POC..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="cursor-pointer text-muted-foreground">
                    None
                  </SelectItem>
                  {eligibleOwners.map((user) => (
                    <SelectItem key={user.id} value={user.id} className="cursor-pointer">
                      {user.name} ({user.email.replace(/@.*$/, "")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="planned-hc">Planned HC</Label>
                <Input
                  id="planned-hc"
                  type="number"
                  min="0"
                  value={editPlannedHC}
                  onChange={(e) => setEditPlannedHC(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actual-hc">Actual HC</Label>
                <Input
                  id="actual-hc"
                  type="number"
                  min="0"
                  value={editActualHC}
                  onChange={(e) => setEditActualHC(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trained-hc">Trained HC</Label>
                <Input
                  id="trained-hc"
                  type="number"
                  min="0"
                  value={editTrainedHC}
                  onChange={(e) => setEditTrainedHC(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-active"
                checked={editIsActive}
                onCheckedChange={(v) => setEditIsActive(!!v)}
                className="cursor-pointer"
              />
              <Label htmlFor="is-active" className="cursor-pointer">Active</Label>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleSave} className="cursor-pointer">
              {editingProcess ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Owner Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign SME/Manager to Process</DialogTitle>
            <DialogDescription>
              Select an SME or Manager to assign as the owner of this process.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="owner-select">SME / Manager</Label>
            <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
              <SelectTrigger className="cursor-pointer mt-2">
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleOwners
                  .filter((u) => !getOwnersForProcess(assignProcessId).some((o) => o.userId === u.id))
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id} className="cursor-pointer">
                      {user.name} ({user.email.replace(/@.*$/, "")}) — {user.role}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleAssignSave} disabled={!selectedOwnerId} className="cursor-pointer">
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
