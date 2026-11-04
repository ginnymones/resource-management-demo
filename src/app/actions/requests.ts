"use server";

import { prisma } from "@/lib/prisma";
import { validateRequestForm } from "@/lib/validators";
import { validateRequestDates } from "@/lib/validators";
import { hasEffectiveBandwidth, calculateBandwidth } from "@/lib/services/bandwidth.service";

export interface CreateRequestInput {
  requestorId: string;
  projectName: string;
  targetProcessId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  hoursPerDay: number;
  businessJustification: string;
  associateIds: string[];
}

/**
 * Generates a unique reference number in format RR-YYYYMMDD-XXXX
 */
function generateReferenceNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `RR-${dateStr}-${random}`;
}

/**
 * Create a new resource request with status "Pending".
 * Validates form, checks bandwidth, generates reference number, triggers approval routing.
 */
export async function createRequest(data: CreateRequestInput) {
  // Validate form fields
  const formValidation = validateRequestForm({
    projectName: data.projectName,
    businessJustification: data.businessJustification,
    hoursPerDay: data.hoursPerDay,
  });

  if (!formValidation.valid) {
    throw new Error(formValidation.error);
  }

  // Validate dates
  const dateValidation = validateRequestDates(
    new Date(data.startDate),
    new Date(data.endDate)
  );

  if (!dateValidation.valid) {
    throw new Error(dateValidation.error);
  }

  // Get target process for complexity factor
  const targetProcess = await prisma.process.findUnique({
    where: { id: data.targetProcessId },
  });

  if (!targetProcess) {
    throw new Error("Target process not found.");
  }

  // Check bandwidth for each associate
  for (const associateId of data.associateIds) {
    const associate = await prisma.associate.findUnique({
      where: { id: associateId },
      include: {
        timeEntries: {
          where: {
            entryDate: new Date(new Date().toISOString().split("T")[0]),
          },
          include: { process: true },
        },
      },
    });

    if (!associate) {
      throw new Error(`Associate ${associateId} not found.`);
    }

    const bandwidthInput = associate.timeEntries.map((entry) => ({
      hours: entry.hours,
      processComplexityFactor: entry.process.complexityFactor,
    }));

    const bandwidth = associate.bandwidthCache ?? calculateBandwidth(bandwidthInput);

    if (!hasEffectiveBandwidth(bandwidth, data.hoursPerDay, targetProcess.complexityFactor)) {
      throw new Error(
        `Associate "${associate.name}" does not have sufficient bandwidth for the requested hours.`
      );
    }
  }

  // Generate unique reference number
  let referenceNumber = generateReferenceNumber();
  let exists = await prisma.resourceRequest.findUnique({
    where: { referenceNumber },
  });
  while (exists) {
    referenceNumber = generateReferenceNumber();
    exists = await prisma.resourceRequest.findUnique({
      where: { referenceNumber },
    });
  }

  // Create the request
  const request = await prisma.resourceRequest.create({
    data: {
      referenceNumber,
      requestorId: data.requestorId,
      projectName: data.projectName,
      targetProcessId: data.targetProcessId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      hoursPerDay: data.hoursPerDay,
      businessJustification: data.businessJustification,
      status: "Pending",
      isDraft: false,
      submittedAt: new Date(),
      requestAssociates: {
        create: data.associateIds.map((associateId) => ({
          associateId,
          approvalStatus: "Pending",
        })),
      },
    },
    include: {
      requestAssociates: true,
    },
  });

  // Trigger approval routing (import dynamically to avoid circular deps)
  const { routeRequest } = await import("@/lib/services/approval-workflow.service");
  await routeRequest(request);

  return request;
}

/**
 * Save a request as draft with 30-day expiration.
 */
export async function saveDraft(data: Omit<CreateRequestInput, "associateIds"> & { associateIds?: string[] }) {
  const draftExpiresAt = new Date();
  draftExpiresAt.setDate(draftExpiresAt.getDate() + 30);

  const referenceNumber = generateReferenceNumber();

  const request = await prisma.resourceRequest.create({
    data: {
      referenceNumber,
      requestorId: data.requestorId,
      projectName: data.projectName || "",
      targetProcessId: data.targetProcessId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      hoursPerDay: data.hoursPerDay || 0.5,
      businessJustification: data.businessJustification || "",
      status: "Draft",
      isDraft: true,
      draftExpiresAt,
      requestAssociates: data.associateIds
        ? {
            create: data.associateIds.map((associateId) => ({
              associateId,
              approvalStatus: "Pending",
            })),
          }
        : undefined,
    },
  });

  return request;
}

/**
 * Get user's requests with status, paginated.
 */
export async function getMyRequests(userId: string, page: number = 1) {
  const PAGE_SIZE = 25;
  const skip = (page - 1) * PAGE_SIZE;

  const [requests, total] = await Promise.all([
    prisma.resourceRequest.findMany({
      where: { requestorId: userId },
      include: {
        targetProcess: true,
        requestAssociates: {
          include: { associate: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.resourceRequest.count({ where: { requestorId: userId } }),
  ]);

  return {
    data: requests,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  };
}

/**
 * Get full request details including associates and approval status.
 */
export async function getRequestDetail(requestId: string) {
  const request = await prisma.resourceRequest.findUnique({
    where: { id: requestId },
    include: {
      requestor: {
        select: { id: true, name: true, email: true, role: true },
      },
      targetProcess: true,
      requestAssociates: {
        include: {
          associate: {
            include: {
              team: true,
              skills: { include: { skill: true } },
            },
          },
        },
      },
      approvalActions: {
        include: {
          approver: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!request) {
    throw new Error("Request not found.");
  }

  return request;
}

/**
 * Cancel a request if it's currently Pending.
 */
export async function cancelRequest(requestId: string) {
  const request = await prisma.resourceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Request not found.");
  }

  if (request.status !== "Pending") {
    throw new Error("Only pending requests can be cancelled.");
  }

  const updated = await prisma.resourceRequest.update({
    where: { id: requestId },
    data: { status: "Cancelled" },
  });

  return updated;
}

/**
 * Submit an existing draft — updates the draft in place to "Pending" status.
 * This does NOT create a new request; it transitions the existing draft.
 */
export async function submitDraft(draftId: string, data: CreateRequestInput) {
  const existing = await prisma.resourceRequest.findUnique({
    where: { id: draftId },
    include: { requestAssociates: true },
  });

  if (!existing) throw new Error("Draft not found.");
  if (existing.status !== "Draft") throw new Error("Only drafts can be submitted this way.");

  // Validate form fields
  const formValidation = validateRequestForm({
    projectName: data.projectName,
    businessJustification: data.businessJustification,
    hoursPerDay: data.hoursPerDay,
  });
  if (!formValidation.valid) throw new Error(formValidation.error);

  // Validate dates
  const dateValidation = validateRequestDates(new Date(data.startDate), new Date(data.endDate));
  if (!dateValidation.valid) throw new Error(dateValidation.error);

  // Get target process
  const targetProcess = await prisma.process.findUnique({ where: { id: data.targetProcessId } });
  if (!targetProcess) throw new Error("Target process not found.");

  // Check bandwidth for each associate
  for (const associateId of data.associateIds) {
    const associate = await prisma.associate.findUnique({ where: { id: associateId } });
    if (!associate) throw new Error(`Associate ${associateId} not found.`);
    const bandwidth = associate.bandwidthCache ?? 7.5;
    if (!hasEffectiveBandwidth(bandwidth, data.hoursPerDay, targetProcess.complexityFactor)) {
      throw new Error(`Associate "${associate.name}" does not have sufficient bandwidth.`);
    }
  }

  // Delete old request associates and recreate
  await prisma.requestAssociate.deleteMany({ where: { requestId: draftId } });

  // Update the draft to Pending
  const updated = await prisma.resourceRequest.update({
    where: { id: draftId },
    data: {
      projectName: data.projectName,
      targetProcessId: data.targetProcessId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      hoursPerDay: data.hoursPerDay,
      businessJustification: data.businessJustification,
      status: "Pending",
      isDraft: false,
      draftExpiresAt: null,
      submittedAt: new Date(),
      requestAssociates: {
        create: data.associateIds.map((associateId) => ({
          associateId,
          approvalStatus: "Pending",
        })),
      },
    },
    include: { requestAssociates: true },
  });

  // Trigger approval routing
  const { routeRequest } = await import("@/lib/services/approval-workflow.service");
  await routeRequest(updated);

  return updated;
}

/**
 * Delete a draft request permanently.
 */
export async function deleteDraft(draftId: string) {
  const existing = await prisma.resourceRequest.findUnique({
    where: { id: draftId },
  });

  if (!existing) throw new Error("Draft not found.");
  if (existing.status !== "Draft") throw new Error("Only drafts can be deleted.");

  // Delete associated records first
  await prisma.requestAssociate.deleteMany({ where: { requestId: draftId } });
  await prisma.approvalAction.deleteMany({ where: { requestId: draftId } });
  await prisma.notification.deleteMany({ where: { requestId: draftId } });

  // Delete the request
  await prisma.resourceRequest.delete({ where: { id: draftId } });

  return { success: true };
}
