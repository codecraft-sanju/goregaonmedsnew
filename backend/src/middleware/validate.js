//src/middleware/validate.js
export const validateBody = (schema) => (req, _res, next) => {
  req.body = schema.parse(req.body ?? {});
  next();
};

export const validateQuery = (schema) => (req, _res, next) => {
 
  req.validatedQuery = schema.parse(req.query ?? {});
  next();
};
