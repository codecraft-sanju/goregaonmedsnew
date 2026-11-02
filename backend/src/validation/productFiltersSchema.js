//src/validation/productFiltersSchema.js
import { z } from 'zod';

const price = z.coerce.number().finite().min(0).max(1_000_000);

// Query strings are untrusted; validate before constructing database queries.
export const productFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(80).default(''),
  category: z.string().trim().max(60).default('All'),
  kind: z.enum(['medicine', 'non_medicine']).optional(),
  minPrice: price.optional(),
  maxPrice: price.optional(),
  availability: z.enum(['available', 'out_of_stock', 'all']).default('available'),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name_asc']).default('newest'),
}).strict().refine(
  (v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice,
  { path: ['maxPrice'], message: 'maxPrice must be >= minPrice' }
);
