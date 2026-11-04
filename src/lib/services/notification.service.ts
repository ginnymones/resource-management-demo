/**
 * Notification Service
 *
 * Handles creation, retrieval, and management of in-app notifications.
 * Supports status changes, reminders, escalations, and suggestions.
 */

import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

export interface CreateNotificationInput {
  userId: string;
  requestId?: string;
  type: "StatusChange" | "Reminder" | "Escalation" | "Suggestion";
  title: string;
  body: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Creates a notification record.
 */
export async function createNotification(data: CreateNotificationInput) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      requestId: data.requestId ?? null,
      type: data.type,
      title: data.title,
      body: data.body,
      metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
      isRead: false,
      expiresAt,
    },
  });

  return notification;
}

/**
 * Gets the count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return count;
}

/**
 * Gets paginated notifications for a user in reverse chronological order.
 */
export async function getNotifications(userId: string, page: number = 1) {
  const skip = (page - 1) * PAGE_SIZE;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        request: {
          select: { id: true, referenceNumber: true, projectName: true, status: true },
        },
      },
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    data: notifications,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    },
  };
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(notificationId: string) {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

/**
 * Marks all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Deletes notifications older than 90 days.
 * Returns the count of deleted notifications.
 */
export async function cleanupExpired(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

/**
 * Formats the badge count for display.
 * Returns '' for 0, the number as string for 1-99, '99+' for >99.
 */
export function formatBadgeCount(count: number): string {
  if (count <= 0) return "";
  if (count > 99) return "99+";
  return count.toString();
}
