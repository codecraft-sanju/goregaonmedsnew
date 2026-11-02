//src/services/productCatalogService.js
import { Product } from '../models/Product.js';
import { buildProductFilter, SORT_OPTIONS } from './productFilters.js';

export async function listPublicProducts(params) {
  const { page, limit, sort, q } = params;
  const filter = buildProductFilter(params);
  const skip = (page - 1) * limit;

  let products, total;

  if (q) {
    const pipeline = [
      {
        $search: {
          text: { query: q, path: ["name", "category", "description"], fuzzy: {} }
        }
      },
      { $match: filter },
      { $sort: SORT_OPTIONS[sort] },
      { $skip: skip },
      { $limit: limit }
    ];

    const countPipeline = [
      { $search: { text: { query: q, path: ["name", "category", "description"], fuzzy: {} } } },
      { $match: filter },
      { $count: "total" }
    ];

    const [result, countResult] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate(countPipeline)
    ]);

    products = result;
    total = countResult[0] ? countResult[0].total : 0;

  } else {
    
    [products, total] = await Promise.all([
      Product.find(filter)
        .select('name category description kind price imageUrl inStock stockQuantity trackStock createdAt')
        .sort(SORT_OPTIONS[sort])
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);
  }

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
    },
  };
}
