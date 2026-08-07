/**
 * validate.js — Centralised Joi validation middleware factory.
 *
 * Applies validation to req.body, req.params, and/or req.query.
 * On failure returns HTTP 422 with a structured field-level error array.
 * On success, replaces the validated target with the sanitised Joi output
 * (strips unknown fields, applies defaults).
 *
 * Usage:
 *   const { validate } = require('../validators/validate');
 *   const { createProject } = require('../validators/schemas/project.schema');
 *
 *   router.post('/', protect, validate(createProject), projectController.create);
 *   router.get('/',  protect, validate(listQuery, 'query'), projectController.list);
 */

'use strict';

const AppError = require('../utils/AppError');

/**
 * Format a Joi ValidationError into an array of { field, message } objects.
 * @param {import('joi').ValidationError} error
 * @returns {Array<{ field: string, message: string }>}
 */
function formatJoiErrors(error) {
  return error.details.map((d) => ({
    field   : d.path.join('.'),
    message : d.message.replace(/['"]/g, ''),
  }));
}

/**
 * Create an Express middleware that validates a request segment.
 *
 * @param {import('joi').Schema} schema        Joi schema to validate against.
 * @param {'body'|'params'|'query'} [target]   Which segment of the request to validate.
 * @param {import('joi').ValidationOptions} [options]  Override default Joi options.
 * @returns {import('express').RequestHandler}
 */
function validate(schema, target = 'body', options = {}) {
  const joiOptions = {
    abortEarly    : false,   // collect ALL errors, not just the first
    stripUnknown  : true,    // strip fields not defined in schema
    allowUnknown  : true,
    ...options,
  };

  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], joiOptions);

    if (error) {
      const errors = formatJoiErrors(error);
      return next(AppError.validation('Validation failed', errors));
    }

    // Replace the segment with the sanitised/defaulted Joi output
    req[target] = value;
    next();
  };
}

/**
 * Convenience: validate body and query in a single middleware call.
 * @param {{ body?: Schema, query?: Schema, params?: Schema }} schemas
 * @returns {import('express').RequestHandler[]}
 */
function validateMany(schemas) {
  const middlewares = [];
  if (schemas.params) middlewares.push(validate(schemas.params, 'params'));
  if (schemas.query)  middlewares.push(validate(schemas.query,  'query'));
  if (schemas.body)   middlewares.push(validate(schemas.body,   'body'));
  return middlewares;
}

module.exports = { validate, validateMany };
