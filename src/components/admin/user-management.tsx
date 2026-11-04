"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getAllSkills,
  getManagedAssociates,
  addAssociateSkill,
  updateAssociateSkillProficiency,
  removeAssociateSkill,
} from "@/app/actions/skill-management";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface ManagedAssociate {
  id: string;
  name: string;
  login: string;
  email: string;
  team: string;
  skills: { skillId: string; skillName: string; proficiency: string }[];
}

interface SkillOption {
  id: string;
  name: string;
  category: string | null;
}

interface UserManagementProps {
  users: UserRow[];
  onChangeRole?: (userId: string, newRole: string) => void;
  onDeactivate?: (userId: string) => void;
  isAdmin: boolean;
}

const ROLES = ["Associate", "SME", "POC", "Manager", "Senior_Leader", "Admin"];
const PROFICIENCY_LEVELS = ["Trained", "Proficient", "Expert"];

const proficiencyColors: Record<string, string> = {
  Expert: "bg-purple-100 text-purple-800",
  Proficient: "bg-blue-100 text-blue-800",
  Trained: "bg-green-100 text-green-800",
};

export function UserManagement({ users, onChangeRole, onDeactivate, isAdmin }: UserManagementProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Role change dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [newRole, setNewRole] = useState("");

  // Skill editing state
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [selectedAssociate, setSelectedAssociate] = useState<ManagedAssociate | null>(null);
  const [managedAssociates, setManagedAssociates] = useState<ManagedAssociate[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Add skill sub-dialog
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [newSkillId, setNewSkillId] = useState("");
  const [newProficiency, setNewProficiency] = useState("Trained");

  // Search
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadSkillData() {
      if (!userId) return;
      try {
        const [skillsData, associatesData] = await Promise.all([
          getAllSkills(),
          getManagedAssociates(userId),
        ]);
        setSkills(skillsData);
        setManagedAssociates(associatesData);
        setDataLoaded(true);
      } catch (err) {
        console.error("Failed to load skill data:", err);
      }
    }
    loadSkillData();
  }, [userId]);

  function openRoleDialog(user: UserRow) {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  }

  function handleRoleChange() {
    if (selectedUser && newRole && onChangeRole) {
      onChangeRole(selectedUser.id, newRole);
      setRoleDialogOpen(false);
    }
  }

  function openSkillDialog(userEmail: string) {
    const login = userEmail.replace(/@.*$/, "");
    const associate = managedAssociates.find((a) => a.login === login || a.email === userEmail);
    if (associate) {
      setSelectedAssociate(associate);
      setSkillDialogOpen(true);
    }
  }

  async function refreshAssociates() {
    if (!userId) return;
    const updated = await getManagedAssociates(userId);
    setManagedAssociates(updated);
    if (selectedAssociate) {
      const refreshed = updated.find((a) => a.id === selectedAssociate.id);
      if (refreshed) setSelectedAssociate(refreshed);
    }
  }

  async function handleAddSkill() {
    if (!selectedAssociate || !newSkillId) return;
    try {
      await addAssociateSkill(
        selectedAssociate.id,
        newSkillId,
        newProficiency as "Trained" | "Proficient" | "Expert"
      );
      await refreshAssociates();
      setAddSkillOpen(false);
      setNewSkillId("");
      setNewProficiency("Trained");
    } catch (err) {
      console.error("Failed to add skill:", err);
    }
  }

  async function handleUpdateProficiency(skillId: string, proficiency: string) {
    if (!selectedAssociate) return;
    try {
      await updateAssociateSkillProficiency(
        selectedAssociate.id,
        skillId,
        proficiency as "Trained" | "Proficient" | "Expert"
      );
      await refreshAssociates();
    } catch (err) {
      console.error("Failed to update proficiency:", err);
    }
  }

  async function handleRemoveSkill(skillId: string) {
    if (!selectedAssociate) return;
    try {
      await removeAssociateSkill(selectedAssociate.id, skillId);
      await refreshAssociates();
    } catch (err) {
      console.error("Failed to remove skill:", err);
    }
  }

  function canEditSkills(userEmail: string): boolean {
    if (!dataLoaded) return false;
    const login = userEmail.replace(/@.*$/, "");
    return managedAssociates.some((a) => a.login === login || a.email === userEmail);
  }

  // For SME/Manager: show managed associates as the table
  // For Admin: show all users
  const displayData = isAdmin ? users : managedAssociates.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    role: "Associate",
    isActive: true,
    login: a.login,
    team: a.team,
    skills: a.skills,
  }));

  const filteredData = search
    ? displayData.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : displayData;

  return (
    <>
      <div className="mb-4">
        <Input
          placeholder="Search by name or login..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Login</TableHead>
            <TableHead>{isAdmin ? "Name" : "Login"}</TableHead>
            {!isAdmin && <TableHead>Team</TableHead>}
            {!isAdmin && <TableHead>Skills</TableHead>}
            {isAdmin && <TableHead>Role</TableHead>}
            {isAdmin && <TableHead>Status</TableHead>}
            <TableHead className="w-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 5 : 5} className="text-center text-muted-foreground py-8">
                {isAdmin ? "No users found." : "No associates mapped to you."}
              </TableCell>
            </TableRow>
          ) : isAdmin ? (
            (filteredData as UserRow[]).map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email.replace(/@.*$/, "")}</TableCell>
                <TableCell className="text-muted-foreground">{user.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEditSkills(user.email) && (
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => openSkillDialog(user.email)}
                        >
                          Edit Skills
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => openRoleDialog(user)}
                      >
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive"
                        onClick={() => onDeactivate?.(user.id)}
                        disabled={!user.isActive}
                      >
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            (filteredData as (typeof managedAssociates[0] & { id: string; name: string; email: string; role: string; isActive: boolean; login: string; team: string; skills: { skillId: string; skillName: string; proficiency: string }[] })[]).map((associate) => (
              <TableRow key={associate.id}>
                <TableCell className="font-medium">{associate.login}</TableCell>
                <TableCell className="text-muted-foreground">{associate.name}</TableCell>
                <TableCell className="text-muted-foreground">{associate.team}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {associate.skills.slice(0, 3).map((s) => (
                      <Badge
                        key={s.skillId}
                        variant="outline"
                        className={proficiencyColors[s.proficiency] || ""}
                      >
                        {s.skillName}
                      </Badge>
                    ))}
                    {associate.skills.length > 3 && (
                      <Badge variant="secondary">+{associate.skills.length - 3}</Badge>
                    )}
                    {associate.skills.length === 0 && (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedAssociate(associate);
                          setSkillDialogOpen(true);
                        }}
                      >
                        Edit Skills
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Change Role Dialog (Admin only) */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.name} ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role} className="cursor-pointer">
                    {role.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleRoleChange} className="cursor-pointer">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Skills Dialog */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Skills — {selectedAssociate?.name}</DialogTitle>
            <DialogDescription>
              {selectedAssociate?.login} • {selectedAssociate?.team}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {selectedAssociate?.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">No skills assigned yet.</p>
            )}
            {selectedAssociate?.skills.map((skill) => (
              <div key={skill.skillId} className="flex items-center gap-3 rounded-md border p-3">
                <span className="flex-1 font-medium text-sm">{skill.skillName}</span>
                <Select
                  value={skill.proficiency}
                  onValueChange={(v) => handleUpdateProficiency(skill.skillId, v)}
                >
                  <SelectTrigger className="w-[130px] cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level} className="cursor-pointer">
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive cursor-pointer"
                  onClick={() => handleRemoveSkill(skill.skillId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                setNewSkillId("");
                setNewProficiency("Trained");
                setAddSkillOpen(true);
              }}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Skill
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setSkillDialogOpen(false)} className="cursor-pointer">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Skill Sub-Dialog */}
      <Dialog open={addSkillOpen} onOpenChange={setAddSkillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
            <DialogDescription>
              Select a skill from the global list and set the proficiency level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Skill</Label>
              <Select value={newSkillId} onValueChange={setNewSkillId}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder="Select a skill..." />
                </SelectTrigger>
                <SelectContent>
                  {skills
                    .filter((s) => !selectedAssociate?.skills.some((as) => as.skillId === s.id))
                    .map((skill) => (
                      <SelectItem key={skill.id} value={skill.id} className="cursor-pointer">
                        {skill.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proficiency</Label>
              <Select value={newProficiency} onValueChange={setNewProficiency}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFICIENCY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level} className="cursor-pointer">
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSkillOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleAddSkill} disabled={!newSkillId} className="cursor-pointer">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
