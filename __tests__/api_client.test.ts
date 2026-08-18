import 'react-native';
import api, { ApiError } from '../src/api/client';

describe('API Client', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return data on 200 OK JSON response', async () => {
    const mockResponse = { success: true, message: 'OTP Sent' };
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
    } as any);

    const result = await api.post('/auth/send-signup-otp', { email: 'test@example.com' });
    expect(result).toEqual(mockResponse);
  });

  it('should throw ApiError with response structure on 400 Bad Request JSON response', async () => {
    const mockResponse = { error: 'Email already registered' };
    global.fetch = jest.fn().mockResolvedValue({
      status: 400,
      ok: false,
      text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
    } as any);

    try {
      await api.post('/auth/send-signup-otp', { email: 'test@example.com' });
      throw new Error('Should have thrown an error');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.response?.status).toBe(400);
      expect(e.response?.data?.error).toBe('Email already registered');
      expect(e.message).toBe('Email already registered');
    }
  });

  it('should throw ApiError with generic message on non-JSON HTML response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 502,
      ok: false,
      text: jest.fn().mockResolvedValue('<!DOCTYPE html><html><body>502 Bad Gateway</body></html>'),
    } as any);

    try {
      await api.post('/auth/send-signup-otp', { email: 'test@example.com' });
      throw new Error('Should have thrown an error');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ApiError);
      expect(e.response?.status).toBe(502);
      expect(e.message).toContain('Server error (502)');
      expect(e.message).not.toContain('JSON Parse error');
    }
  });
});
