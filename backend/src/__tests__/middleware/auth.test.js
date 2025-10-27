import { jest } from '@jest/globals';

// Mock Supabase client before importing middleware
const mockGetUser = jest.fn();
jest.unstable_mockModule('../../services/supabaseClient.js', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
  },
}));

// Import middleware after mocking
const { verifyToken } = await import('../../middleware/auth.js');

describe('auth middleware - verifyToken', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      headers: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  test('should reject requests without Authorization header', async () => {
    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  test('should reject requests with malformed Authorization header (missing Bearer)', async () => {
    req.headers.authorization = 'InvalidToken123';

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  test('should reject requests with invalid token (Supabase returns error)', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid token' }
    });

    await verifyToken(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith('invalid-token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject requests when Supabase returns no user', async () => {
    req.headers.authorization = 'Bearer expired-token';
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null
    });

    await verifyToken(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith('expired-token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should authenticate valid token and attach user to request', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      created_at: '2025-01-01T00:00:00Z',
    };

    req.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null
    });

    await verifyToken(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith('valid-token');
    expect(req.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('should handle unexpected errors gracefully', async () => {
    req.headers.authorization = 'Bearer valid-token';
    mockGetUser.mockRejectedValueOnce(new Error('Network error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await verifyToken(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith('valid-token');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Auth middleware error:', expect.any(Error));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
