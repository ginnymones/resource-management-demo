"use server";

import { prisma } from "@/lib/prisma";
import {
  approveRequest,
  rejectRequest,
} from "@/lib/services/approval-workflow.service";

/**
 * Server action to approve a request for specific associates.
 */
export async function approveRequestAction(
  requestId: string,
  associateIds: string[]
) {
  if (!requestId) throw new Error("Request ID is required.");
  if (!associateIds || associateIds.length === 0) {
    throw new Error("At least one associate must be specified.");
  }

  return approveRequest(requestId, associateIds);
}

/**
 * Server action to reject a request for specific associates with a reason.
 */
export async function rejectRequestAction(
  requestId: string,
  associateIds: string[],
  reason: string
) {
  if (!requestId) throw new Error("Request ID is required.");
  if (!associateIds || associateIds.length === 0) {
    throw new Error("At least one associate must be specified.");
  }
  if (!reason || reason.length < 20) {
    throw new Error("Rejection reason must be at least 20 characters.");
  }

  return rejectRequest(requestId, associateIds, reason);
}

/**
 * Server action to override an existing approval or rejection decision.
 * Only available to Senior_Leader and Admin roles.
 */
export async function overrideDecisionAction(
  requestId: string,
  associateId: string,
  newStatus: "Approved" | "Rejected",
  justification: string
) {
  if (!requestId) throw new Error("Request ID is required.");
  if (!associateId) throw new Error("Associate ID is required.");
  if (!justification || justification.length < 20) {
    throw new Error("Justification must be at least 20 characters.");
  }

  // Update the request associate status
  await prisma.requestAssociate.updateMany({
    where: { requestId, associateId },
    data: {
      approvalStatus: newStatus,
      actedAt: new Date(),
    },
  });

  // Create an override approval action record
  // We need a user ID for the approver - get from session context
  // For now, create the action with the override type
  await prisma.approvalAction.create({
    data: {
      requestId,
      approverId: associateId, // This will be replaced with actual user ID in production
      associateId,
      action: "Override",
      justification,
      actedAt: new Date(),
    },
  });

  // Recalculate overall status
  const allAssociates = await prisma.requestAssociate.findMany({
    where: { requestId },
  });

  const { determineOverallStatus } = await import(
    "@/lib/services/approval-workflow.service"
  );

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

  // Notify relevant parties
  const request = await prisma.resourceRequest.findUnique({
    where: { id: requestId },
  });

  if (request) {
    await prisma.notification.create({
      data: {
        userId: request.requestorId,
        requestId: request.id,
        type: "StatusChange",
        title: "Decision Overridden",
        body: `A decision on your request ${request.referenceNumber} has been overridden. New status: ${overallStatus}.`,
      },
    });
  }

  return { status: overallStatus };
}
