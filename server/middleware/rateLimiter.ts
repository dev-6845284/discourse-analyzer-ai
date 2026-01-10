import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { Request, Response } from 'express';
import { RedisStore } from 'rate-limit-redis';
import { isLocal } from '../constants/env';
const redisClient = require('../services/redis').default;

// Helper to create rate limiter with memory or Redis store
function createRateLimiter(options: Partial<Options>): RateLimitRequestHandler {
  const store = redisClient
    ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(...args),
    })
    : undefined; // Default to memory store

  const baseOptions: Partial<Options> = {
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    store: store,
    keyGenerator: (req: Request) => {
      // Use IP address + user ID if authenticated
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userId = req.session?.user?._id || 'anonymous';
      return `${ip}:${userId}`;
    },
    handler: (req: Request, res: Response) => {
      console.warn('[RATE_LIMIT] Rate limit exceeded:', {
        ip: req.ip,
        path: req.path,
        userId: req.session?.user?._id || 'anonymous',
      });
      res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
    ...options,
  };

  return rateLimit(baseOptions);
}

/**
 * Strict rate limiter for login endpoints
 * - 5 attempts per 15 minutes per IP (Production)
 * - 100 attempts per 15 minutes per IP (Development)
 * - Prevents brute force attacks
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isLocal() ? 100 : 5, // Relaxed for local
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: isLocal(), // Don't count successful logins in local
  keyGenerator: (req: Request) => {
    // For login, only use IP (user not authenticated yet)
    // The provided snippet for dev-only endpoints was syntactically incorrect and has been omitted.
    // If you intended to add specific logic for dev-only endpoints, please provide a complete and correct implementation.
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Moderate rate limiter for authenticated API endpoints
 * - 100 requests per minute per user
 * - Prevents API abuse while allowing normal usage
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many API requests, please slow down',
  skipSuccessfulRequests: false,
});

/**
 * Very strict rate limiter for expensive operations (AI calls)
 * - 20 requests per minute per user
 * - Protects expensive AI API calls
 */
export const aiOperationRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI operations per minute
  message: 'Too many AI operation requests, please wait before trying again',
});

/**
 * Lenient rate limiter for general requests
 * - 200 requests per minute per IP
 * - Basic protection against floods
 */
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: 'Too many requests from this IP, please slow down',
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});
