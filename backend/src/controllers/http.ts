import type { Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ZodError } from 'zod';

export function parseBody<T>(schema: ZodTypeAny, body: unknown): T {
  return schema.parse(body) as T;
}

export function jsonError(res: Response, status: number, message: string, extra?: Record<string, unknown>) {
  return res.status(status).json({ error: message, ...(extra ?? {}) });
}

export function validationMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Invalid request payload';
  }

  return null;
}
