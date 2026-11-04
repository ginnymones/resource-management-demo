"use server";

import {
  getUnreadCount,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "@/lib/services/notification.service";

export async function getUnreadCountAction(userId: string) {
  return getUnreadCount(userId);
}

export async function getNotificationsAction(userId: string, page: number = 1) {
  return getNotifications(userId, page);
}

export async function markAsReadAction(notificationId: string) {
  return markAsRead(notificationId);
}

export async function markAllAsReadAction(userId: string) {
  return markAllAsRead(userId);
}
