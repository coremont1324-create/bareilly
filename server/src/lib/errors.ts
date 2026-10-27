import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, type ZodTypeAny, type infer as ZodInfer } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, 'BAD_REQUEST', message, details);
export const notFound = (message = 'Not found') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message: string, details?: unknown) => new HttpError(409, 'CONFLICT', message, details);
export const forbidden = (message = 'You do not have permission to do this') => new HttpError(403, 'FORBIDDEN', message);
export const unauthorized = (message = 'Please sign in') => new HttpError(401, 'UNAUTHORIZED', message);
export const unprocessable = (code: string, message: string, details?: unknown) => new HttpError(422, code, message, details);

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): ZodInfer<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw zodToHttp(result.error);
  return result.data;
}

export function zodToHttp(err: ZodError): HttpError {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return new HttpError(400, 'VALIDATION_ERROR', 'Some fields are invalid', { fields });
}

/** Wrap async route handlers so rejections reach the error middleware. */
export const ah =
  (fn: (...args: Parameters<RequestHandler>) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

const PG_ERRORS: Record<string, [number, string, string]> = {
  '23503': [400, 'INVALID_REFERENCE', 'A referenced record (category, department, mandal or scheme) does not exist'],
  '23505': [409, 'DUPLICATE', 'A record with the same unique value already exists'],
  '23514': [400, 'CONSTRAINT', 'A value failed a database constraint'],
  '22P02': [400, 'BAD_REQUEST', 'Malformed identifier'],
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    const h = zodToHttp(err);
    res.status(h.status).json({ error: { code: h.code, message: h.message, details: h.details } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request body is too large' } });
    return;
  }
  const pgCode = typeof err?.code === 'string' ? PG_ERRORS[err.code] : undefined;
  if (pgCode) {
    res.status(pgCode[0]).json({ error: { code: pgCode[1], message: pgCode[2] } });
    return;
  }
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
};
