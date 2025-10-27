import { jest } from '@jest/globals';
import { errorHandler } from '../../middleware/errorHandler.js';

describe('errorHandler middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('should handle error with status and message', () => {
    const error = new Error('Something went wrong');
    error.status = 400;

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
  });

  test('should default to 500 status when status is not provided', () => {
    const error = new Error('Unexpected error');

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected error' });
  });

  test('should handle error without message (default to "Internal Server Error")', () => {
    const error = {};

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  test('should handle LIMIT_FILE_SIZE multer error with 400 status', () => {
    const error = new Error('File too large');
    error.name = 'MulterError';
    error.code = 'LIMIT_FILE_SIZE';

    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'File too large' });
  });

  test('should handle custom status codes (401, 403, 404)', () => {
    const unauthorizedError = new Error('Unauthorized');
    unauthorizedError.status = 401;
    errorHandler(unauthorizedError, req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);

    const forbiddenError = new Error('Forbidden');
    forbiddenError.status = 403;
    errorHandler(forbiddenError, req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);

    const notFoundError = new Error('Not found');
    notFoundError.status = 404;
    errorHandler(notFoundError, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('should handle validation errors with custom status', () => {
    const validationError = new Error('Invalid input');
    validationError.status = 422;

    errorHandler(validationError, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid input' });
  });

  test('should not call next() (terminal middleware)', () => {
    const error = new Error('Test error');

    errorHandler(error, req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
