/**
 * Approval Workflow Service
 *
 * Handles routing of resource requests to approvers, approval/rejection logic,
 * partial approval determination, and alternate suggestions.
 */

import { prisma } from "@/lib/prisma";
import { calculateBandwidth } from "@/lib/services/bandwidth.service";
import {
  calculateMatchScore,
  PROFICIENCY_VALUES,
  type ProficiencyLevel,
  type SearchCriteria,
} from "@/lib/services/match-score.service";
import type { ApprovalStatus, ResourceRequest, RequestAssociate } from "@prisma/client";

/**
 * Routes a request to the appropriate approver for each associate.
 * Creates ApprovalAction records for each associate's manager.
 */
export async function routeRequest(
  request: ResourceRequest & { requestAssociates?: RequestAssociate[] }
) {
  const requestAssociates = request.requestAssociates ??
    await prisma.requestAssociate.findMany({
      where: { requestId: request.id },
    });

  for (const ra of requestAssociates) {
    const approver = await findAvailableApprover(ra.associateId);

    if (!approver) {
      // No approver found - mark request as unroutable
      await prisma.resourceRequest.update({
        where: { id: request.id },
        data: { status: "Pending_Unroutable" },
      });

      // Notify requestor
      await prisma.notification.create({
        data: {
          userId: request.requestorId,
          requestId: request.id,
          type: "StatusChange",
          title: "Request Unroutable",
          body: `Your request ${request.referenceNumber} cannot be routed - no available approver found for one or more associates.`,
        },
      });
      return;
    }

    // Create approval action
    await prisma.approvalAction.create({
      data: {
        requestId: request.id,
        approverId: approver.id,
        associateId: ra.associateId,
        action: "Approve", // placeholder action type - will be updated on actual action
        dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      },
    });

    // Update request associate with approver
    await prisma.requestAssociate.update({
      where: { id: ra.id },
      data: { approverId: approver.id },
    });

    // Notify approver
    await prisma.notification.create({
      data: {
        userId: approver.id,
        requestId: request.id,
        type: "StatusChange",
        title: "New Approval Request",
        body: `You have a new resource request (${request.referenceNumber}) awaiting your approval for project "${request.projectName}".`,
      },
    });
  }
}

/**
 * Finds an available approver for an associate by traversing up to 3 levels
 * of the reporting chain, skipping managers who are on leave.
 */
export async function findAvailableApprover(associateId: string) {
  // Get the associate's team to find the team manager
  const associate = await prisma.associate.findUnique({
    where: { id: associateId },
    include: { team: true },
  });

  if (!associate) return null;

  // Find the team manager
  const teamManager = await prisma.user.findFirst({
    where: {
      teamId: associate.teamId,
      role: { in: ["Manager", "Senior_Leader", "Admin"] },
    },
  });

  if (!teamManager) {
    // Try to find via managerId on team
    if (associate.team.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: associate.team.managerId },
      });
      if (manager && !manager.isOnLeave) return manager;
    }
  } else if (!teamManager.isOnLeave) {
    return teamManager;
  }

  // Traverse up the reporting chain (up to 3 levels)
  let currentUserId = teamManager?.reportsTo ?? associate.team.managerId;
  let level = 0;

  while (currentUserId && level < 3) {
    const manager = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!manager) break;

    if (!manager.isOnLeave) {
      return manager;
    }

    currentUserId = manager.reportsTo;
    level++;
  }

  return null;
}

/**
 * Approve a request for specific associates.
 * Updates approval status and recalculates bandwidth.
 */
export async function approveRequest(requestId: string, associateIds: string[]) {
  const request = await prisma.resourceRequest.findUnique({
    where: { id: requestId },
    include: { requestAssociates: true, targetProcess: true },
  });

  if (!request) throw new Error("Request not found.");

  // Update each associate's approval status
  for (const associateId of associateIds) {
    await prisma.requestAssociate.updateMany({
      where: { requestId, associateId },
      data: {
        approvalStatus: "Approved",
        actedAt: new Date(),
      },
    });

    // Recalculate bandwidth for approved associate
    const todayEntries = await prisma.timeEntry.findMany({
      where: {
        associateId,
        entryDate: new Date(new Date().toISOString().split("T")[0]),
      },
      include: { process: true },
    });

    const bandwidthInput = todayEntries.map((entry) => ({
      hours: entry.hours,
      processComplexityFactor: entry.process.complexityFactor,
    }));

    // Add the new commitment to bandwidth calculation
    bandwidthInput.push({
      hours: request.hoursPerDay,
      processComplexityFactor: request.targetProcess.complexityFactor,
    });

    const newBandwidth = calculateBandwidth(bandwidthInput);

    await prisma.associate.update({
      where: { id: associateId },
      data: {
        bandwidthCache: newBandwidth,
        bandwidthUpdatedAt: new Date(),
      },
    });
  }

  // Determine overall status
  const allAssociates = await prisma.requestAssociate.findMany({
    where: { requestId },
  });

  const overallStatus = determineOverallStatus(
    allAssociates.map((a) => ({
      associateId: a.associateId,
      status: a.approvalStatus,
    }))
  );

  await prisma.resourceRequest.update({
    where: { id: requestId },
    data: { status: overallStatus },
  });

  // Notify requestor
  await prisma.notification.create({
    data: {
      userId: request.requestorId,
      requestId: request.id,
      type: "StatusChange",
      title: "Request Updated",
      body: `Your request ${request.referenceNumber} has been updated to "${overallStatus}".`,
    },
  });

  return { status: overallStatus };
}

/**
 * Reject a request for specific associates.
 * Requires a reason (min 20 chars) and generates alternate suggestions.
 */
export async function rejectRequest(
  requestId: string,
  associateIds: string[],
  reason: string
) {
  if (!reason || reason.length < 20) {
    throw new Error("Rejection reason must be at least 20 characters.");
  }

  const request = await prisma.resourceRequest.findUnique({
    where: { id: requestId },
    include: { requestAssociates: true, targetProcess: true },
  });

  if (!request) throw new Error("Request not found.");

  // Update each associate's approval status
  for (const associateId of associateIds) {
    await prisma.requestAssociate.updateMany({
      where: { requestId, associateId },
      data: {
        approvalStatus: "Rejected",
        rejectionReason: reason,
        actedAt: new Date(),
      },
    });
  }

  // Determine overall status
  const allAssociates = await prisma.requestAssociate.findMany({
    where: { requestId },
  });

  const overallStatus = determineOverallStatus(
    allAssociates.map((a) => ({
      associateId: a.associateId,
      status: a.approvalStatus,
    }))
  );

  await prisma.resourceRequest.update({
    where: { id: requestId },
    data: { status: overallStatus },
  });

  // Generate alternate suggestions
  const criteria: SearchCriteria = {
    requiredSkills: [], // Will be populated from request context
    minBandwidth: request.hoursPerDay,
    targetProcessComplexity: request.targetProcess.complexityFactor,
  };

  const alternates = await getAlternateSuggestions(criteria, associateIds, 5);

  // Notify requestor with alternates
  await prisma.notification.create({
    data: {
      userId: request.requestorId,
      requestId: request.id,
      type: "Suggestion",
      title: "Request Rejected",
      body: `Your request ${request.referenceNumber} has been rejected. Reason: ${reason}`,
      metadata: alternates.length > 0 ? { alternates } : undefined,
    },
  });

  return { status: overallStatus, alternates };
}

/**
 * Determines the overall request status based on individual associate approvals.
 */
export function determineOverallStatus(
  associateApprovals: { associateId: string; status: ApprovalStatus }[]
): "Approved" | "Rejected" | "Partially_Approved" | "Pending" {
  const allApproved = associateApprovals.every((a) => a.status === "Approved");
  const allRejected = associateApprovals.every((a) => a.status === "Rejected");
  const anyPending = associateApprovals.some((a) => a.status === "Pending");

  if (anyPending) return "Pending";
  if (allApproved) return "Approved";
  if (allRejected) return "Rejected";
  return "Partially_Approved";
}

/**
 * Finds alternate associate suggestions based on original criteria,
 * excluding specified associate IDs.
 */
export async function getAlternateSuggestions(
  criteria: SearchCriteria,
  excludeIds: string[],
  limit: number = 5
) {
  const associates = await prisma.associate.findMany({
    where: {
      id: { notIn: excludeIds },
      bandwidthCache: { gt: 0 },
    },
    include: {
      team: true,
      skills: { include: { skill: true } },
    },
  });

  const scored = associates
    .map((associate) => {
      const skills = associate.skills.map((as) => ({
        skillId: as.skillId,
        proficiency: as.proficiency as ProficiencyLevel,
      }));

      const bandwidth = associate.bandwidthCache ?? 0;

      // Check if associate has all required skills
      if (criteria.requiredSkills.length > 0) {
        const hasAllSkills = criteria.requiredSkills.every((req) => {
          const assocSkill = skills.find((s) => s.skillId === req.skillId);
          return (
            assocSkill &&
            PROFICIENCY_VALUES[assocSkill.proficiency] >=
              PROFICIENCY_VALUES[req.minProficiency]
          );
        });
        if (!hasAllSkills) return null;
      }

      const matchScore = calculateMatchScore({
        associate: { skills, bandwidth },
        criteria,
      });

      return {
        id: associate.id,
        name: associate.name,
        team: associate.team.name,
        bandwidth,
        matchScore,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scored;
}
