import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Normalized 10-digit Indian mobile number (see utils/phone.js).
    mobileNumber: { type: String, required: true, unique: true, match: /^[6-9]\d{9}$/ },
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    totalOrders: { type: Number, default: 0, min: 0 },
    deliveredOrders: { type: Number, default: 0, min: 0 },
    offerClaimed: { type: Boolean, default: false },
    offerClaimedOrderId: { type: String, default: null },
  },
  { timestamps: true },
);

userSchema.index({ fullName: 1 });

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
