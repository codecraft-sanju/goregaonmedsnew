// src/models/Product.js
import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 60 }, // e.g., 'Cosmetics', 'Baby Care'
    description: { type: String, trim: true, maxlength: 500, default: '' },
    price: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: null }, // Product ki photo dikhane ke liye
    isActive: { type: Boolean, default: true }, // Admin chahye toh product hide kar sake
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Product = mongoose.models.Product ?? mongoose.model('Product', productSchema);