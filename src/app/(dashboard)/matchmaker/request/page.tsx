"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  IntakeForm,
  type IntakeFormData,
  type SelectedAssociate,
} from "@/components/requests/intake-form";
import { getSkills, getProcesses, getAssociatesByIds } from "@/app/actions/data";
import { createRequest, saveDraft, submitDraft, deleteDraft } from "@/app/actions/requests";

export default function RequestIntakePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const associateIds = searchParams.getAll("associate");
  const draftId = searchParams.get("draft");

  const [selectedAssociates, setSelectedAssociates] = useState<SelectedAssociate[]>([]);
  const [processes, setProcesses] = useState<{ id: string; name: string; complexityFactor: number }[]>([]);
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ referenceNumber: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftData, setDraftData] = useState<{
    projectName?: string;
    targetProcessId?: string;
    startDate?: string;
    endDate?: string;
    hoursPerDay?: number;
    businessJustification?: string;
  } | null>(null);

  const userId = session?.user?.id;

  // Load data on mount (and draft data if editing)
  useEffect(() => {
    async function loadData() {
      try {
        // If editing a draft, load the draft details
        let draftAssociateIds = associateIds;
        if (draftId) {
          const { getRequestDetail } = await import("@/app/actions/requests");
          const draft = await getRequestDetail(draftId);
          draftAssociateIds = draft.requestAssociates.map((ra: { associate: { id: string } }) => ra.associate.id);
          setDraftData({
            projectName: draft.projectName,
            targetProcessId: draft.targetProcessId,
            startDate: draft.startDate instanceof Date ? draft.startDate.toISOString().split("T")[0] : String(draft.startDate).split("T")[0],
            endDate: draft.endDate instanceof Date ? draft.endDate.toISOString().split("T")[0] : String(draft.endDate).split("T")[0],
            hoursPerDay: draft.hoursPerDay,
            businessJustification: draft.businessJustification,
          });
        }

        const [skillsData, processesData, associatesData] = await Promise.all([
          getSkills(),
          getProcesses(),
          getAssociatesByIds(draftAssociateIds),
        ]);
        setSkills(skillsData);
        setProcesses(processesData.map((p) => ({
          id: p.id,
          name: p.name,
          complexityFactor: p.complexityFactor,
        })));
        setSelectedAssociates(associatesData);
      } catch (err) {
        console.error("Failed to load request form data:", err);
      }
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(data: IntakeFormData) {
    if (!userId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      let result;
      if (draftId) {
        // Editing an existing draft — update it in place
        result = await submitDraft(draftId, {
          requestorId: userId,
          projectName: data.projectName,
          targetProcessId: data.targetProcessId,
          startDate: data.startDate,
          endDate: data.endDate,
          hoursPerDay: data.hoursPerDay,
          businessJustification: data.businessJustification,
          associateIds: data.associateIds,
        });
      } else {
        // New request
        result = await createRequest({
          requestorId: userId,
          projectName: data.projectName,
          targetProcessId: data.targetProcessId,
          startDate: data.startDate,
          endDate: data.endDate,
          hoursPerDay: data.hoursPerDay,
          businessJustification: data.businessJustification,
          associateIds: data.associateIds,
        });
      }
      setSubmitted({ referenceNumber: result.referenceNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveDraft(data: IntakeFormData) {
    if (!userId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await saveDraft({
        requestorId: userId,
        projectName: data.projectName,
        targetProcessId: data.targetProcessId,
        startDate: data.startDate,
        endDate: data.endDate,
        hoursPerDay: data.hoursPerDay,
        businessJustification: data.businessJustification,
        associateIds: data.associateIds,
      });
      router.push("/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!draftId) return;
    if (!confirm("Are you sure you want to delete this draft? This cannot be undone.")) return;
    setIsSubmitting(true);
    try {
      await deleteDraft(draftId);
      router.push("/requests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete draft.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show success confirmation
  if (submitted) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Request Submitted Successfully</h2>
            <p className="text-muted-foreground">
              Your cross-utilization request has been submitted for approval.
            </p>
            <p className="text-sm font-mono bg-muted px-3 py-1 rounded inline-block">
              Reference: {submitted.referenceNumber}
            </p>
            <div className="pt-4">
              <Button onClick={() => router.push("/requests")} className="cursor-pointer">
                View My Requests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer"
          onClick={() => router.push("/requests")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {draftData?.projectName || "Request Cross-Utilization"}
          </h1>
          <p className="text-muted-foreground">
            {draftId ? "Edit your draft and submit when ready." : "Fill out the intake form to request cross-utilization of selected associates."}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <IntakeForm
        selectedAssociates={selectedAssociates}
        processes={processes}
        skills={skills}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        onDelete={draftId ? handleDelete : undefined}
        isSubmitting={isSubmitting}
        defaultValues={draftData ?? undefined}
      />
    </div>
  );
}
