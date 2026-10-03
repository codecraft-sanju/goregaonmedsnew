export const validateBody = (schema) => (req, _res, next) => {
  req.body = schema.parse(req.body ?? {});
  next();
};

export const validateQuery = (schema) => (req, _res, next) => {
  // Express 5 exposes req.query as a getter, so parsed values are stored separately.
  req.validatedQuery = schema.parse(req.query ?? {});
  next();
};
