import type { Request, Response, NextFunction } from 'express';
import { errorHandler, asyncHandler } from '../../middleware/errorHandler.js';

function createMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('errorHandler middleware', () => {
  const req = {} as Request;
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses default status, message, and code', () => {
    const res = createMockResponse();
    const err = new Error('Something broke');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Something broke',
      code: 'INTERNAL_ERROR',
    });
  });

  it('falls back to default message when error has no message', () => {
    const res = createMockResponse();
    const err = {} as import('../../middleware/errorHandler.js').ApiError;

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  it('respects custom status and code on ApiError', () => {
    const res = createMockResponse();
    const err = Object.assign(new Error('Not found'), {
      status: 404,
      code: 'NOT_FOUND',
    });

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Not found',
      code: 'NOT_FOUND',
    });
  });

  it('includes stack trace in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const res = createMockResponse();
    const err = new Error('Dev error');

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Dev error',
        stack: expect.any(String),
      })
    );

    process.env.NODE_ENV = originalEnv;
  });
});

describe('asyncHandler', () => {
  it('forwards resolved handlers to Express', async () => {
    const req = {} as Request;
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;
    const handler = asyncHandler(async (_req, _res) => {
      _res.json({ ok: true });
    });

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards rejected promises to next', async () => {
    const req = {} as Request;
    const res = createMockResponse();
    const next = jest.fn() as NextFunction;
    const failure = new Error('Async failure');
    const handler = asyncHandler(async () => {
      throw failure;
    });

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});
