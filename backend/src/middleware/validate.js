// Middleware to run a zod schema against a request part (body/query/params).
function validate(schema, part = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) return next(result.error);
    req[part] = result.data;
    next();
  };
}

module.exports = { validate };