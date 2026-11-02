//src/services/notificationService.js
import { Notification } from '../models/Notification.js';

export async function createNotification({ userId, type = 'info', title, message, orderId = null, session = null }) {
  if (!userId) return null;
  const options = session ? { session } : {};
  const notifications = await Notification.create([{ userId, type, title, message, orderId }], options);
  return notifications[0];
}

export async function getUserNotifications(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const query = { userId };
  
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, isRead: false })
  ]);
  
  return {
    notifications: notifications.map(n => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message,
      orderId: n.orderId,
      isRead: n.isRead,
      createdAt: n.createdAt
    })),
    meta: {
      unreadCount,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getUnreadCount(userId) {
  return await Notification.countDocuments({ userId, isRead: false });
}

export async function markNotificationAsRead(userId, notificationId) {
  const result = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { isRead: true } },
    { new: true }
  );
  return Boolean(result);
}

export async function markAllNotificationsAsRead(userId) {
  await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
  return true;
}