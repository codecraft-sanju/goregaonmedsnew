// src/models/Product.js

import mongoose from 'mongoose';
export function formatCategory(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
      set: formatCategory, // Auto-normalizes category on create & save
    }, // e.g., 'Cosmetics', 'Baby Care'
    description: { type: String, trim: true, maxlength: 500, default: '' },
    price: { type: Number, required: true, min: 0 },
    kind: { type: String, enum: ['medicine', 'non_medicine'], required: true, default: 'non_medicine' },
    trackStock: { type: Boolean, default: false },
    stockQuantity: { type: Number, default: 0, min: 0 },
    imageUrl: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', category: 'text' });

export const Product = mongoose.models.Product ?? mongoose.model('Product', productSchema);