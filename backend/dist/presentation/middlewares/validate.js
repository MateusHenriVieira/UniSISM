"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
function validateBody(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success)
            return next(result.error);
        req.body = result.data;
        next();
    };
}
function validateQuery(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success)
            return next(result.error);
        req.validatedQuery = result.data;
        next();
    };
}
//# sourceMappingURL=validate.js.map