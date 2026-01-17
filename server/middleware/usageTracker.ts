import { Request, Response, NextFunction } from 'express';
import ApiUsage from '../models/ApiUsage';
import SecurityAlert from '../models/SecurityAlert';

// In-memory cache for tracking suspicious patterns
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const SUSPICIOUS_THRESHOLD = 50; // requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window

/**
 * Middleware to track API usage for statistics and security monitoring
 */
export const usageTracker = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Capture endpoint early to avoid issues with req.url mutation in mounted routers
  // Use originalUrl to get the full path, stripping query parameters
  const currentEndpoint = (req.originalUrl || req.url).split('?')[0];

  // console.log(`[USAGE_TRACKER] Starting for ${req.method} ${currentEndpoint}`);

  // Track request count for this IP
  trackRequestPattern(ip);

  // Capture response details after response is sent
  res.on('finish', async () => {
    // console.log(`[USAGE_TRACKER] Finishing for ${req.method} ${currentEndpoint}. Status: ${res.statusCode}`);
    try {
      const responseTime = Date.now() - startTime;

      // Don't log static file requests or health checks
      if (currentEndpoint.startsWith('/assets') || currentEndpoint === '/health') {
        return;
      }

      const usageRecord = new ApiUsage({
        userId: req.session?.user?._id,
        sessionId: req.sessionID,
        endpoint: currentEndpoint,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: responseTime,
        ipAddress: ip,
        userAgent: req.headers['user-agent']?.substring(0, 500),
        timestamp: new Date(),
        requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : undefined,
        responseSize: res.getHeader('content-length')
          ? parseInt(res.getHeader('content-length') as string, 10)
          : undefined,
        rateLimited: res.statusCode === 429,
      });

      await usageRecord.save();
      // console.log(`[USAGE_TRACKER] Saved usage for ${currentEndpoint}`);

      // Check for suspicious patterns
      await checkSuspiciousActivity(ip, req, res.statusCode, currentEndpoint);

    } catch (error) {
      // Don't fail the request if logging fails
      console.error('[USAGE_TRACKER] Failed to log usage:', error);
      if (error instanceof Error) {
        console.error(error.stack);
      }
    }
  });

  next();
};

/**
 * Track request patterns in memory for quick anomaly detection
 */
function trackRequestPattern(ip: string): void {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now - record.windowStart > WINDOW_MS) {
    // Start new window
    requestCounts.set(ip, { count: 1, windowStart: now });
  } else {
    record.count++;
  }

  // Clean up old entries periodically (simple cleanup)
  if (requestCounts.size > 10000) {
    const cutoff = now - WINDOW_MS;
    for (const [key, value] of requestCounts) {
      if (value.windowStart < cutoff) {
        requestCounts.delete(key);
      }
    }
  }
}

/**
 * Check for suspicious activity patterns and create alerts
 */
async function checkSuspiciousActivity(
  ip: string,
  req: Request,
  statusCode: number,
  endpoint: string
): Promise<void> {
  const record = requestCounts.get(ip);

  // Check for high request rate
  if (record && record.count >= SUSPICIOUS_THRESHOLD) {
    await createSecurityAlert({
      type: 'unusual_traffic',
      severity: record.count >= SUSPICIOUS_THRESHOLD * 2 ? 'high' : 'medium',
      message: `High request rate detected from IP: ${ip}`,
      details: {
        requestCount: record.count,
        windowMs: WINDOW_MS,
        endpoint: endpoint,
        userAgent: req.headers['user-agent']?.substring(0, 200),
      },
      ipAddress: ip,
      userId: req.session?.user?._id,
    });
  }

  // Check for many failed login attempts
  if (endpoint.includes('/login') && statusCode === 401) {
    const recentFailures = await ApiUsage.countDocuments({
      ipAddress: ip,
      endpoint: { $regex: /login/i },
      statusCode: 401,
      timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 min
    });

    if (recentFailures >= 5) {
      await createSecurityAlert({
        type: 'failed_login_spike',
        severity: recentFailures >= 10 ? 'high' : 'medium',
        message: `Multiple failed login attempts from IP: ${ip}`,
        details: {
          failedAttempts: recentFailures,
          timeWindowMinutes: 15,
        },
        ipAddress: ip,
      });
    }
  }

  // Check for rate limit hits
  if (statusCode === 429) {
    await createSecurityAlert({
      type: 'rate_limit_exceeded',
      severity: 'low',
      message: `Rate limit exceeded for IP: ${ip}`,
      details: {
        endpoint: endpoint,
        method: req.method,
      },
      ipAddress: ip,
      userId: req.session?.user?._id,
    });
  }
}

/**
 * Create a security alert if a similar one doesn't exist recently
 */
async function createSecurityAlert(alertData: {
  type: string;
  severity: string;
  message: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userId?: string;
}): Promise<void> {
  try {
    // Check if a similar alert exists in the last hour (debounce)
    const recentAlert = await SecurityAlert.findOne({
      type: alertData.type,
      ipAddress: alertData.ipAddress,
      timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });

    if (!recentAlert) {
      const alert = new SecurityAlert(alertData);
      await alert.save();
      console.log('[SECURITY_ALERT]', alertData.type, alertData.message);
    }
  } catch (error) {
    console.error('[SECURITY_ALERT] Failed to create alert:', error);
  }
}

export { checkSuspiciousActivity, createSecurityAlert };
