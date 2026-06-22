import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200): Response {
  return res.status(statusCode).json({
    data,
    error: null,
    status: statusCode,
  });
}
