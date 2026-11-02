//src/services/productFilters.js
import { escapeRegex } from '../utils/text.js';

export const SORT_OPTIONS = Object.freeze({
  newest: { createdAt: -1, _id: -1 },
  price_asc: { price: 1, _id: 1 },
  price_desc: { price: -1, _id: -1 },
  name_asc: { name: 1, _id: 1 },
});

export function buildProductFilter({ q, category, kind, minPrice, maxPrice, availability }) {
  const filter = { isActive: true };
  const conditions = [];

  if (category && category !== 'All') filter.category = category;
  if (kind) filter.kind = kind;

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  // if (q) {
  //   // Escape metacharacters: the shopper's query is literal text, not a regex.
  //   const search = new RegExp(escapeRegex(q), 'i');
  //   conditions.push({ $or: [
  //     { name: search },
  //     { category: search },
  //     { description: search },
  //   ] });
  // }

  if (availability === 'available') {
    conditions.push({
      inStock: true,
      $or: [
        { trackStock: false },
        { trackStock: true, stockQuantity: { $gt: 0 } },
      ],
    });
  } else if (availability === 'out_of_stock') {
    conditions.push({ $or: [
      { inStock: false },
      { trackStock: true, stockQuantity: { $lte: 0 } },
    ] });
  }

  if (conditions.length) filter.$and = conditions;
  return filter;
}
