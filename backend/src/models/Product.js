// src/models/Product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 60 }, // e.g., 'Cosmetics', 'Baby Care'
    description: { type: String, trim: true, maxlength: 500, default: '' },
    price: { type: Number, required: true, min: 0 },
    kind: { type: String, enum: ['medicine', 'non_medicine'], required: true, default: 'non_medicine' },
    trackStock: { type: Boolean, default: false }, // Kya iska exact stock track karna hai?
    stockQuantity: { type: Number, default: 0, min: 0 }, // Agar trackStock true hai, toh kitne bache hain?
    imageUrl: { type: String, default: null }, // Product ki photo dikhane ke liye
    isActive: { type: Boolean, default: true }, // Admin chahye toh product hide kar sake
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true }
);
productSchema.index({ name: 'text', category: 'text' });

export const Product = mongoose.models.Product ?? mongoose.model('Product', productSchema);