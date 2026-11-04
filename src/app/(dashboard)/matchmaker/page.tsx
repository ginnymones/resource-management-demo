"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchForm, type SearchFormCriteria } from "@/components/matchmaker/search-form";
import { ResultCard, NoResults, type MatchResult } from "@/components/matchmaker/result-card";
import {
  PendingApprovalsPanel,
  type PendingApproval,
} from "@/components/matchmaker/pending-approvals-panel";
import { searchAssociates } from "@/app/actions/matchmaker";
import { getSkills, getPendingApprovals } from "@/app/actions/data";
import { approveRequestAction, rejectRequestAction } from "@/app/actions/approvals";

export default function MatchmakerPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);

  const userRole = (session?.user?.role as string) ?? "SME";
  const userId = session?.user?.id;
  const showApprovals = ["Manager", "Senior_Leader", "Admin"].includes(userRole);

  // Load skills and pending approvals on mount
  useEffect(() => {
    async function loadData() {
      try {
        const skillsData = await getSkills();
        setSkills(skillsData);
      } catch (err) {
        console.error("Failed to load matchmaker data:", err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadApprovals() {
      if (!showApprovals || !userId) return;
      try {
        const approvals = await getPendingApprovals(userId);
        setPendingApprovals(approvals);
      } catch (err) {
        console.error("Failed to load pending approvals:", err);
      }
    }
    loadApprovals();
  }, [showApprovals, userId]);

  async function handleSearch(criteria: SearchFormCriteria) {
    setIsLoading(true);
    setHasSearched(true);
    setSelectedIds([]);

    try {
      const response = await searchAssociates({
        requiredSkills: criteria.requiredSkills.map((s) => ({
          skillId: s.skillId,
          minProficiency: s.minProficiency as "Expert" | "Proficient" | "Trained" | "Not_Trained",
        })),
        minBandwidth: criteria.minBandwidth,
        targetProcessComplexity: 1, // Simplified — no complexity factor in search
      });
      setResults(
        response.data.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          team: r.team,
          bandwidth: r.bandwidth,
          matchScore: r.matchScore,
          skills: r.skills.map((s) => ({ name: s.name, proficiency: s.proficiency })),
          supervisorName: r.supervisorName,
        }))
      );
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleRequestCrossUtilization() {
    const params = new URLSearchParams();
    selectedIds.forEach((id) => params.append("associate", id));
    router.push(`/matchmaker/request?${params.toString()}`);
  }

  async function handleApprove(requestId: string) {
    try {
      // Approve all associates on the request
      const request = pendingApprovals.find((a) => a.id === requestId);
      if (!request) return;
      await approveRequestAction(requestId, []);
      setPendingApprovals((prev) => prev.filter((a) => a.id !== requestId));
    } catch (err) {
      console.error("Approve failed:", err);
    }
  }

  async function handleReject(requestId: string) {
    try {
      await rejectRequestAction(requestId, [], "Rejected from matchmaker panel - insufficient justification provided");
      setPendingApprovals((prev) => prev.filter((a) => a.id !== requestId));
    } catch (err) {
      console.error("Reject failed:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Matchmaker</h1>
        <p className="text-muted-foreground">
          Search for associates by skills, bandwidth, and proficiency to find the best match for cross-utilization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content: search + results */}
        <div className={`space-y-6 ${showApprovals ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <SearchForm
            skills={skills}
            onSearch={handleSearch}
            isLoading={isLoading}
          />

          {/* Results Section */}
          {hasSearched && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Results {results.length > 0 && `(${results.length})`}
                </h2>
              </div>

              {results.length === 0 ? (
                <NoResults />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((result) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      isSelected={selectedIds.includes(result.id)}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}

              {/* Request Cross-Utilization button below results */}
              {selectedIds.length > 0 && (
                <div className="sticky bottom-4 z-10 flex justify-center pt-4">
                  <Button
                    onClick={handleRequestCrossUtilization}
                    size="lg"
                    className="cursor-pointer shadow-lg"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Request Cross-Utilization ({selectedIds.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Approvals Panel */}
        {showApprovals && (
          <div className="lg:col-span-1">
            <PendingApprovalsPanel
              approvals={pendingApprovals}
              onApprove={handleApprove}
              onReject={handleReject}
              isVisible={showApprovals}
            />
          </div>
        )}
      </div>
    </div>
  );
}
