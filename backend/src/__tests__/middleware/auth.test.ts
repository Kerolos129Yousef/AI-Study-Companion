import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import {
  authMiddleware,
  optionalAuthMiddleware,
  type AuthRequest,
} from '../../middleware/auth.js';

const JWT_SECRET = 'your-secret-key-change-in-production';

function createMockRequest(authorization?: string): AuthRequest {
  return {
    headers: authorization ? { authorization } : {},
  } as AuthRequest;
}

function createMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('auth middleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('rejects requests without an authorization header', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing or invalid authorization header',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects requests with a malformed authorization header', () => {
      const req = createMockRequest('Token abc');
      const res = createMockResponse();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects invalid tokens', () => {
      const req = createMockRequest('Bearer not-a-valid-token');
      const res = createMockResponse();

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('attaches user info and calls next for valid tokens', () => {
      const token = jwt.sign(
        { sub: 'user-123', email: 'user@example.com' },
        JWT_SECRET
      );
      const req = createMockRequest(`Bearer ${token}`);
      const res = createMockResponse();

      authMiddleware(req, res, next);

      expect(req.userId).toBe('user-123');
      expect(req.userEmail).toBe('user@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('calls next without a token', () => {
      const req = createMockRequest();
      const res = createMockResponse();

      optionalAuthMiddleware(req, res, next);

      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('attaches user info when a valid token is present', () => {
      const token = jwt.sign(
        { sub: 'user-456', email: 'optional@example.com' },
        JWT_SECRET
      );
      const req = createMockRequest(`Bearer ${token}`);
      const res = createMockResponse();

      optionalAuthMiddleware(req, res, next);

      expect(req.userId).toBe('user-456');
      expect(req.userEmail).toBe('optional@example.com');
      expect(next).toHaveBeenCalled();
    });

    it('continues without user info when the token is invalid', () => {
      const req = createMockRequest('Bearer invalid-token');
      const res = createMockResponse();

      optionalAuthMiddleware(req, res, next);

      expect(req.userId).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
