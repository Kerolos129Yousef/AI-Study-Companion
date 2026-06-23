import { sendSuccess } from '../../utils/response.js';
import type { Response } from 'express';

function createMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('response utils', () => {
  describe('sendSuccess', () => {
    it('responds with the standard success envelope', () => {
      const res = createMockResponse();
      const payload = { id: '1', name: 'Test' };

      sendSuccess(res, payload);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: payload,
        error: null,
        status: 200,
      });
    });

    it('supports a custom status code', () => {
      const res = createMockResponse();

      sendSuccess(res, { created: true }, 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: { created: true },
        error: null,
        status: 201,
      });
    });
  });
});
