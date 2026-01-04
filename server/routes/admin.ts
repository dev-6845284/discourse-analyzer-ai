import express, { Request, Response } from 'express';
import { requireAdmin } from '../middleware/admin';
import ApiUsage from '../models/ApiUsage';
import adminCategoriesRouter from './adminCategories';
import BlockedIP from '../models/BlockedIP';
import SecurityAlert from '../models/SecurityAlert';
import { blockIP, unblockIP, getBlockedIPs } from '../middleware/ipBlocker';

const router = express.Router();

// All admin routes require admin authentication
router.use(requireAdmin);
// Additionally enforce configured role permissions where applicable
import authorizeMiddleware from '../middleware/authorize';
router.use(authorizeMiddleware);

/**
 * GET /api/admin/usage-stats
 * Get aggregated API usage statistics
 */
router.get('/usage-stats', async (req: Request, res: Response) => {
  try {
    const { hours = 24 } = req.query;
    const hoursNum = Math.min(parseInt(hours as string, 10) || 24, 168); // Max 7 days
    const since = new Date(Date.now() - hoursNum * 60 * 60 * 1000);

    // Parallel aggregation queries for better performance
    const [
      totalRequests,
      requestsByEndpoint,
      requestsByStatus,
      requestsByHour,
      topIPs,
      averageResponseTime,
      errorRate,
      rateLimitHits,
    ] = await Promise.all([
      // Total requests count
      ApiUsage.countDocuments({ timestamp: { $gte: since } }),

      // Requests by endpoint (top 10)
      ApiUsage.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$endpoint', count: { $sum: 1 }, avgTime: { $avg: '$responseTimeMs' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Requests by status code
      ApiUsage.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$statusCode', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Requests per hour
      ApiUsage.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' },
            },
            count: { $sum: 1 },
            errors: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top 10 IPs by request count
      ApiUsage.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: '$ipAddress',
            count: { $sum: 1 },
            errors: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
            },
            rateLimited: {
              $sum: { $cond: ['$rateLimited', 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Average response time
      ApiUsage.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$responseTimeMs' },
            maxTime: { $max: '$responseTimeMs' },
            minTime: { $min: '$responseTimeMs' },
          },
        },
      ]),

      // Error rate
      ApiUsage.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            errors: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
            },
          },
        },
      ]),

      // Rate limit hits
      ApiUsage.countDocuments({
        timestamp: { $gte: since },
        rateLimited: true,
      }),
    ]);

    const stats = {
      timeRange: {
        hours: hoursNum,
        since: since.toISOString(),
        until: new Date().toISOString(),
      },
      summary: {
        totalRequests,
        rateLimitHits,
        averageResponseTime: averageResponseTime[0]?.avgTime?.toFixed(2) || 0,
        maxResponseTime: averageResponseTime[0]?.maxTime || 0,
        errorRate: errorRate[0]
          ? ((errorRate[0].errors / errorRate[0].total) * 100).toFixed(2)
          : 0,
        errorCount: errorRate[0]?.errors || 0,
      },
      requestsByEndpoint,
      requestsByStatus,
      requestsByHour,
      topIPs,
    };

    res.json(stats);
  } catch (error) {
    console.error('[ADMIN] Failed to get usage stats:', error);
    res.status(500).json({ error: 'Failed to get usage statistics' });
  }
});

/**
 * GET /api/admin/security-alerts
 * Get security alerts
 */
router.get('/security-alerts', async (req: Request, res: Response) => {
  try {
    const { acknowledged, severity, limit = 50 } = req.query;

    const filter: Record<string, unknown> = {};
    if (acknowledged !== undefined) {
      filter.acknowledged = acknowledged === 'true';
    }
    if (severity) {
      filter.severity = severity;
    }

    const alerts = await SecurityAlert.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string, 10))
      .lean();

    // Count unacknowledged by severity
    const unacknowledgedCounts = await SecurityAlert.aggregate([
      { $match: { acknowledged: false } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]);

    res.json({
      alerts,
      unacknowledgedCounts: unacknowledgedCounts.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error('[ADMIN] Failed to get security alerts:', error);
    res.status(500).json({ error: 'Failed to get security alerts' });
  }
});

/**
 * POST /api/admin/security-alerts/:id/acknowledge
 * Acknowledge a security alert
 */
router.post('/security-alerts/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.session?.user?._id;

    const alert = await SecurityAlert.findByIdAndUpdate(
      id,
      {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('[ADMIN] Failed to acknowledge alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

/**
 * GET /api/admin/blocked-ips
 * Get list of blocked IPs
 */
router.get('/blocked-ips', async (req: Request, res: Response) => {
  try {
    const blockedIPs = await getBlockedIPs();
    res.json(blockedIPs);
  } catch (error) {
    console.error('[ADMIN] Failed to get blocked IPs:', error);
    res.status(500).json({ error: 'Failed to get blocked IPs' });
  }
});

/**
 * POST /api/admin/blocked-ips
 * Block an IP address
 */
router.post('/blocked-ips', async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason, expiresInMinutes } = req.body;

    if (!ipAddress || !reason) {
      return res.status(400).json({ error: 'ipAddress and reason are required' });
    }

    await blockIP(ipAddress, reason, {
      blockedBy: req.session?.user?._id,
      blockedByName: req.session?.user?.name || req.session?.user?.email,
      expiresInMinutes: expiresInMinutes ? parseInt(expiresInMinutes, 10) : undefined,
      isAutoBlocked: false,
    });

    res.json({ success: true, message: `IP ${ipAddress} has been blocked` });
  } catch (error) {
    console.error('[ADMIN] Failed to block IP:', error);
    res.status(500).json({ error: 'Failed to block IP' });
  }
});

/**
 * DELETE /api/admin/blocked-ips/:ipAddress
 * Unblock an IP address
 */
router.delete('/blocked-ips/:ipAddress', async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.params;
    const success = await unblockIP(decodeURIComponent(ipAddress));

    if (success) {
      res.json({ success: true, message: `IP ${ipAddress} has been unblocked` });
    } else {
      res.status(404).json({ error: 'IP not found in blocked list' });
    }
  } catch (error) {
    console.error('[ADMIN] Failed to unblock IP:', error);
    res.status(500).json({ error: 'Failed to unblock IP' });
  }
});

/**
 * GET /api/admin/dashboard-summary
 * Get a quick summary for the admin alert banner
 */
router.get('/dashboard-summary', async (req: Request, res: Response) => {
  try {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const [
      unacknowledgedAlerts,
      criticalAlerts,
      rateLimitHitsLastHour,
      blockedIPCount,
      requestsLastHour,
    ] = await Promise.all([
      SecurityAlert.countDocuments({ acknowledged: false }),
      SecurityAlert.countDocuments({ acknowledged: false, severity: { $in: ['critical', 'high'] } }),
      ApiUsage.countDocuments({ timestamp: { $gte: lastHour }, rateLimited: true }),
      BlockedIP.countDocuments(),
      ApiUsage.countDocuments({ timestamp: { $gte: lastHour } }),
    ]);

    res.json({
      unacknowledgedAlerts,
      criticalAlerts,
      rateLimitHitsLastHour,
      blockedIPCount,
      requestsLastHour,
      hasIssues: criticalAlerts > 0 || rateLimitHitsLastHour > 10,
    });
  } catch (error) {
    console.error('[ADMIN] Failed to get dashboard summary:', error);
    res.status(500).json({ error: 'Failed to get dashboard summary' });
  }
});

// Mount admin categories management endpoints
router.use('/categories', adminCategoriesRouter);

// Access control management (role assignments for endpoints)
import accessControlRouter from './adminAccessControl';
router.use('/access-control', accessControlRouter);

// Admin API key sets management
import adminApiKeysRouter from './adminApiKeys';
router.use('/api-key-sets', adminApiKeysRouter);

export default router;
