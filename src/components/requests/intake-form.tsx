"use client";

import { useState } from "react";
import { AlertTriangle, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface SelectedAssociate {
  id: string;
  name: string;
  team: string;
  bandwidth: number;
}

export interface IntakeFormProcess {
  id: string;
  name: string;
  complexityFactor: number;
}

export interface IntakeFormSkill {
  id: string;
  name: string;
}

interface IntakeFormProps {
  selectedAssociates: SelectedAssociate[];
  processes: IntakeFormProcess[];
  skills: IntakeFormSkill[];
  prefilledSkillIds?: string[];
  onSubmit: (data: IntakeFormData) => void;
  onSaveDraft: (data: IntakeFormData) => void;
  onDelete?: () => void;
  isSubmitting?: boolean;
  bandwidthWarning?: string;
  defaultValues?: {
    projectName?: string;
    targetProcessId?: string;
    startDate?: string;
    endDate?: string;
    hoursPerDay?: number;
    businessJustification?: string;
  };
}

export interface IntakeFormData {
  projectName: string;
  requiredSkillIds: string[];
  startDate: string;
  endDate: string;
  hoursPerDay: number;
  targetProcessId: string;
  businessJustification: string;
  associateIds: string[];
}

interface FormErrors {
  projectName?: string;
  startDate?: string;
  endDate?: string;
  hoursPerDay?: string;
  targetProcessId?: string;
  businessJustification?: string;
}

export function IntakeForm({
  selectedAssociates,
  processes,
  skills,
  prefilledSkillIds = [],
  onSubmit,
  onSaveDraft,
  onDelete,
  isSubmitting,
  bandwidthWarning,
  defaultValues,
}: IntakeFormProps) {
  const [projectName, setProjectName] = useState(defaultValues?.projectName ?? "");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(prefilledSkillIds);
  const [startDate, setStartDate] = useState(defaultValues?.startDate ?? "");
  const [endDate, setEndDate] = useState(defaultValues?.endDate ?? "");
  const [hoursPerDay, setHoursPerDay] = useState(defaultValues?.hoursPerDay?.toString() ?? "1");
  const [targetProcessId, setTargetProcessId] = useState(defaultValues?.targetProcessId ?? "");
  const [businessJustification, setBusinessJustification] = useState(defaultValues?.businessJustification ?? "");
  const [errors, setErrors] = useState<FormErrors>({});

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!projectName.trim()) {
      newErrors.projectName = "Project name is required.";
    } else if (projectName.length > 100) {
      newErrors.projectName = "Project name must be 100 characters or less.";
    }

    if (!startDate) {
      newErrors.startDate = "Start date is required.";
    } else if (new Date(startDate) < new Date(new Date().toISOString().split("T")[0])) {
      newErrors.startDate = "Start date cannot be in the past.";
    }

    if (!endDate) {
      newErrors.endDate = "End date is required.";
    } else if (startDate && new Date(endDate) <= new Date(startDate)) {
      newErrors.endDate = "End date must be after start date.";
    }

    const hours = parseFloat(hoursPerDay);
    if (isNaN(hours) || hours < 0.5 || hours > 7.5) {
      newErrors.hoursPerDay = "Hours must be between 0.5 and 7.5.";
    }

    if (!targetProcessId) {
      newErrors.targetProcessId = "Target process is required.";
    }

    if (!businessJustification.trim()) {
      newErrors.businessJustification = "Business justification is required.";
    } else if (businessJustification.length > 1000) {
      newErrors.businessJustification = "Justification must be 1000 characters or less.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function getFormData(): IntakeFormData {
    return {
      projectName: projectName.trim(),
      requiredSkillIds: selectedSkillIds,
      startDate,
      endDate,
      hoursPerDay: parseFloat(hoursPerDay),
      targetProcessId,
      businessJustification: businessJustification.trim(),
      associateIds: selectedAssociates.map((a) => a.id),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) {
      onSubmit(getFormData());
    }
  }

  function handleSaveDraft() {
    onSaveDraft(getFormData());
  }

  function toggleSkill(skillId: string) {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selected Associates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selected Associates</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedAssociates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No associates selected. Go back to the Matchmaker to select associates.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedAssociates.map((associate) => (
                <Badge key={associate.id} variant="secondary" className="text-sm py-1 px-3">
                  {associate.name} ({associate.team}) — {associate.bandwidth.toFixed(1)}h available
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bandwidth Warning */}
      {bandwidthWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{bandwidthWarning}</AlertDescription>
        </Alert>
      )}

      {/* Form Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              maxLength={100}
              placeholder="Enter project name"
            />
            <div className="flex justify-between">
              {errors.projectName && (
                <p className="text-xs text-destructive">{errors.projectName}</p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {projectName.length}/100
              </p>
            </div>
          </div>

          {/* Required Skills */}
          <div className="space-y-2">
            <Label>Required Skills</Label>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge
                  key={skill.id}
                  variant={selectedSkillIds.includes(skill.id) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSkill(skill.id)}
                >
                  {skill.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Hours Per Day */}
          <div className="space-y-2">
            <Label htmlFor="hours-per-day">Hours Per Day Needed</Label>
            <Input
              id="hours-per-day"
              type="number"
              min="0.5"
              max="7.5"
              step="0.5"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(e.target.value)}
            />
            {errors.hoursPerDay && (
              <p className="text-xs text-destructive">{errors.hoursPerDay}</p>
            )}
          </div>

          {/* Target Process */}
          <div className="space-y-2">
            <Label htmlFor="target-process">Target Process</Label>
            <Select value={targetProcessId} onValueChange={setTargetProcessId}>
              <SelectTrigger id="target-process" className="cursor-pointer">
                <SelectValue placeholder="Select a process..." />
              </SelectTrigger>
              <SelectContent>
                {processes.map((process) => (
                  <SelectItem key={process.id} value={process.id} className="cursor-pointer">
                    {process.name} (Complexity: ×{process.complexityFactor})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetProcessId && (
              <p className="text-xs text-destructive">{errors.targetProcessId}</p>
            )}
          </div>

          {/* Business Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">Business Justification</Label>
            <Textarea
              id="justification"
              value={businessJustification}
              onChange={(e) => setBusinessJustification(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Explain why this cross-utilization is needed..."
            />
            <div className="flex justify-between">
              {errors.businessJustification && (
                <p className="text-xs text-destructive">{errors.businessJustification}</p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {businessJustification.length}/1000
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting}
          className="cursor-pointer"
        >
          <Save className="mr-2 h-4 w-4" />
          Save as Draft
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || selectedAssociates.length === 0}
          className="cursor-pointer"
        >
          <Send className="mr-2 h-4 w-4" />
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={isSubmitting}
            className="cursor-pointer ml-auto"
          >
            Delete Draft
          </Button>
        )}
      </div>
    </form>
  );
}
