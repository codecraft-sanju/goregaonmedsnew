//src/models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['order', 'offer', 'info'], default: 'info' },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    orderId: { type: String, default: null }, 
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexed for fast pagination and unread counts
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.models.Notification ?? mongoose.model('Notification', notificationSchema);