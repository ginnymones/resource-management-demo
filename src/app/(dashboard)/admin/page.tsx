"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { UserManagement, type UserRow } from "@/components/admin/user-management";
import { ProcessManagement, type ProcessRow } from "@/components/admin/process-management";
import { CSVImport } from "@/components/admin/csv-import";
import { getUsers, getProcesses, getTeams } from "@/app/actions/data";
import {
  updateUserRole,
  deactivateUser,
  createUser,
  hashPin,
  createProcess,
  updateProcess,
  importCSV,
  exportCSV,
} from "@/app/actions/admin";
import { getProcessOwners, assignProcessOwner, removeProcessOwner, getEligibleProcessOwners } from "@/app/actions/process-owners";
import { getSetting, setSetting } from "@/app/actions/settings";
import type { Role } from "@prisma/client";

export default function AdminPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    email: "",
    pin: "",
    role: "SME" as Role,
    teamId: "",
    level: "",
    location: "",
    jobTitle: "",
  });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [climateEnabled, setClimateEnabled] = useState(true);
  const [climateToggleLoading, setClimateToggleLoading] = useState(false);
  const [processOwners, setProcessOwners] = useState<{ id: string; processId: string; processName: string; userId: string; userName: string; userEmail: string; userRole: string }[]>([]);
  const [eligibleOwners, setEligibleOwners] = useState<{ id: string; name: string; email: string; role: string }[]>([]);

  const userId = session?.user?.id;
  const userRole = session?.user?.role as string | undefined;
  const isAdmin = userRole === "Admin";

  useEffect(() => {
    async function loadData() {
      try {
        const [usersData, processesData, teamsData, climateSetting, ownersData, eligibleData] = await Promise.all([
          getUsers(),
          getProcesses(),
          getTeams(),
          getSetting("climate_enabled"),
          getProcessOwners(),
          getEligibleProcessOwners(),
        ]);
        setUsers(usersData);
        setProcesses(
          processesData.map((p) => ({
            id: p.id,
            name: p.name,
            complexityFactor: p.complexityFactor,
            description: p.description ?? undefined,
            parentName: p.parentName ?? undefined,
            category: p.category ?? undefined,
            parentId: p.parentId ?? undefined,
            isActive: p.isActive ?? true,
            plannedHC: p.plannedHC ?? undefined,
            actualHC: p.actualHC ?? undefined,
            trainedHC: p.trainedHC ?? undefined,
          }))
        );
        setTeams(teamsData);
        setClimateEnabled(climateSetting !== "false");
        setProcessOwners(ownersData);
        setEligibleOwners(eligibleData);
      } catch (err) {
        console.error("Failed to load admin data:", err);
      }
    }
    loadData();
  }, []);

  async function handleChangeRole(targetUserId: string, newRole: string) {
    if (!userId) return;
    try {
      await updateUserRole(targetUserId, newRole as Role, userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      console.error("Failed to change role:", err);
    }
  }

  async function handleDeactivate(targetUserId: string) {
    if (!userId) return;
    try {
      await deactivateUser(targetUserId, userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isActive: false } : u))
      );
    } catch (err) {
      console.error("Failed to deactivate user:", err);
    }
  }

  async function handleCreateProcess(data: { name: string; complexityFactor: number; description?: string }) {
    if (!userId) return;
    try {
      const newProcess = await createProcess(data, userId);
      setProcesses((prev) => [
        ...prev,
        {
          id: newProcess.id,
          name: newProcess.name,
          complexityFactor: newProcess.complexityFactor,
          description: newProcess.description ?? undefined,
        },
      ]);
    } catch (err) {
      console.error("Failed to create process:", err);
    }
  }

  async function handleUpdateProcess(id: string, data: { name: string; complexityFactor: number; description?: string; plannedHC?: number; actualHC?: number; trainedHC?: number; isActive?: boolean }) {
    if (!userId) return;
    try {
      const updated = await updateProcess(id, data, userId);
      setProcesses((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name: updated.name,
                complexityFactor: updated.complexityFactor,
                description: (updated as { description?: string | null }).description ?? undefined,
                plannedHC: (updated as { plannedHC?: number | null }).plannedHC ?? undefined,
                actualHC: (updated as { actualHC?: number | null }).actualHC ?? undefined,
                trainedHC: (updated as { trainedHC?: number | null }).trainedHC ?? undefined,
                isActive: (updated as { isActive?: boolean }).isActive ?? true,
              }
            : p
        )
      );
    } catch (err) {
      console.error("Failed to update process:", err);
    }
  }

  async function handleImport(csvContent: string) {
    if (!userId) throw new Error("Not authenticated");
    const result = await importCSV(csvContent, userId);
    // Reload users after import
    const usersData = await getUsers();
    setUsers(usersData);
    return result;
  }

  async function handleExport(teamId?: string) {
    try {
      const csvContent = await exportCSV(teamId ? { teamId } : undefined);
      // Trigger download
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `associates-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CSV:", err);
    }
  }

  async function handleCreateUser() {
    if (!userId) return;
    if (!createUserForm.name || !createUserForm.email || !createUserForm.pin) return;
    if (createUserForm.pin.length < 6 || createUserForm.pin.length > 8 || !/^\d+$/.test(createUserForm.pin)) return;

    setCreateUserLoading(true);
    try {
      const passwordHash = await hashPin(createUserForm.pin);

      const newUser = await createUser(
        {
          name: createUserForm.name,
          email: createUserForm.email,
          passwordHash,
          role: createUserForm.role,
          teamId: createUserForm.teamId || undefined,
          level: createUserForm.level || undefined,
          location: createUserForm.location || undefined,
          jobTitle: createUserForm.jobTitle || undefined,
        },
        userId
      );

      setUsers((prev) => [
        ...prev,
        {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          isActive: true,
        },
      ]);
      setCreateUserOpen(false);
      setCreateUserForm({
        name: "",
        email: "",
        pin: "",
        role: "SME",
        teamId: "",
        level: "",
        location: "",
        jobTitle: "",
      });
    } catch (err) {
      console.error("Failed to create user:", err);
    } finally {
      setCreateUserLoading(false);
    }
  }

  async function handleClimateToggle(enabled: boolean) {
    setClimateToggleLoading(true);
    try {
      await setSetting("climate_enabled", enabled ? "true" : "false");
      setClimateEnabled(enabled);
    } catch (err) {
      console.error("Failed to update climate setting:", err);
    } finally {
      setClimateToggleLoading(false);
    }
  }

  async function handleAssignOwner(processId: string, ownerId: string) {
    try {
      await assignProcessOwner(processId, ownerId);
      const updated = await getProcessOwners();
      setProcessOwners(updated);
    } catch (err) {
      console.error("Failed to assign process owner:", err);
    }
  }

  async function handleRemoveOwner(processId: string, ownerId: string) {
    try {
      await removeProcessOwner(processId, ownerId);
      setProcessOwners((prev) => prev.filter((po) => !(po.processId === processId && po.userId === ownerId)));
    } catch (err) {
      console.error("Failed to remove process owner:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, processes, data imports, and system configuration.
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="cursor-pointer">User Management</TabsTrigger>
          <TabsTrigger value="processes" className="cursor-pointer">Process Management</TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="data" className="cursor-pointer">Data Import/Export</TabsTrigger>
              <TabsTrigger value="settings" className="cursor-pointer">Platform Settings</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isAdmin ? "Users" : "My Associates"}</CardTitle>
              {isAdmin && (
                <Button onClick={() => setCreateUserOpen(true)} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <UserManagement
                users={users}
                onChangeRole={isAdmin ? handleChangeRole : undefined}
                onDeactivate={isAdmin ? handleDeactivate : undefined}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>

          {/* Create User Dialog */}
          <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create User Account</DialogTitle>
                <DialogDescription>
                  Add a new user to the platform.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Name *</Label>
                  <Input
                    id="create-name"
                    value={createUserForm.name}
                    onChange={(e) => setCreateUserForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email *</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-pin">PIN (6-8 digits) *</Label>
                  <Input
                    id="create-pin"
                    type="password"
                    value={createUserForm.pin}
                    onChange={(e) => setCreateUserForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                    placeholder="123456"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-role">Role</Label>
                  <Select value={createUserForm.role} onValueChange={(v) => setCreateUserForm((f) => ({ ...f, role: v as Role }))}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SME" className="cursor-pointer">SME</SelectItem>
                      <SelectItem value="POC" className="cursor-pointer">POC</SelectItem>
                      <SelectItem value="Manager" className="cursor-pointer">Manager</SelectItem>
                      <SelectItem value="Senior_Leader" className="cursor-pointer">Senior Leader</SelectItem>
                      <SelectItem value="Admin" className="cursor-pointer">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-team">Team</Label>
                  <Select value={createUserForm.teamId} onValueChange={(v) => setCreateUserForm((f) => ({ ...f, teamId: v }))}>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id} className="cursor-pointer">
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-level">Level</Label>
                  <Input
                    id="create-level"
                    value={createUserForm.level}
                    onChange={(e) => setCreateUserForm((f) => ({ ...f, level: e.target.value }))}
                    placeholder="e.g. L3, L4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-location">Location</Label>
                  <Input
                    id="create-location"
                    value={createUserForm.location}
                    onChange={(e) => setCreateUserForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Seattle, WA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-jobtitle">Job Title</Label>
                  <Input
                    id="create-jobtitle"
                    value={createUserForm.jobTitle}
                    onChange={(e) => setCreateUserForm((f) => ({ ...f, jobTitle: e.target.value }))}
                    placeholder="e.g. Data Associate"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateUserOpen(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserLoading || !createUserForm.name || !createUserForm.email || createUserForm.pin.length < 6}
                  className="cursor-pointer"
                >
                  {createUserLoading ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="processes">
          <Card>
            <CardHeader>
              <CardTitle>Processes</CardTitle>
            </CardHeader>
            <CardContent>
              <ProcessManagement
                processes={processes}
                onCreate={isAdmin ? handleCreateProcess : undefined}
                onUpdate={isAdmin ? handleUpdateProcess : undefined}
                processOwners={processOwners}
                eligibleOwners={eligibleOwners}
                onAssignOwner={isAdmin ? handleAssignOwner : undefined}
                onRemoveOwner={isAdmin ? handleRemoveOwner : undefined}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="data">
            <CSVImport
              onImport={handleImport}
              onExport={handleExport}
              teams={teams}
            />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="climate-toggle" className="text-base font-medium">
                      Resource Climate Page
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      When disabled, the Climate page will show an unavailability message to all users.
                    </p>
                  </div>
                  <Switch
                    id="climate-toggle"
                    checked={climateEnabled}
                    onCheckedChange={handleClimateToggle}
                    disabled={climateToggleLoading}
                    aria-label="Toggle Resource Climate page visibility"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
