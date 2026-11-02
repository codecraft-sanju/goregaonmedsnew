// src/models/SystemLog.js
import mongoose from 'mongoose';

const systemLogSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['error', 'inventory_alert'], required: true },
    message: { type: String, required: true },
    stack: { type: String }, 
    context: { type: mongoose.Schema.Types.Mixed }, 
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SystemLog = mongoose.models.SystemLog ?? mongoose.model('SystemLog', systemLogSchema);