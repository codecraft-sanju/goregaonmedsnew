// src/models/User.js
import mongoose from 'mongoose';


const savedAddressSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      match: /^[a-f0-9]{64}$/ // SHA-256 hash length
    },
    flat: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    area: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    landmark: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    }
  },
  { _id: false } 
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    fullName: { type: String, trim: true, maxlength: 80, default: 'Customer' },
    
    // Email Auth Fields
    otp: { type: String, default: null }, 
    otpExpires: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 }, 
    lockUntil: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
    
    // Order Counters
    totalOrders: { type: Number, default: 0, min: 0 },
    deliveredOrders: { type: Number, default: 0, min: 0 },
    
    // Offers
    offerClaimed: { type: Boolean, default: false },
    offerClaimedOrderId: { type: String, default: null },
    
    
    savedPhones: {
      type: [{
        type: String,
        match: /^[6-9]\d{9}$/
      }],
      default: []
    },
    savedAddresses: {
      type: [savedAddressSchema],
      default: []
    },

    // Cart
    cart: {
      type: [
        {
          productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
          quantity: { type: Number, required: true, min: 1, max: 100 }
        }
      ],
      default: []
    }
  },
  { timestamps: true },
);

// Indexes
userSchema.index({ email: 1 });
export const User = mongoose.models.User ?? mongoose.model('User', userSchema);