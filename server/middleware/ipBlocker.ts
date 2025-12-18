import { Request, Response, NextFunction } from 'express';
import BlockedIP from '../models/BlockedIP';
import { createSecurityAlert } from './usageTracker';

// In-memory cache of blocked IPs for fast lookup
let blockedIPCache: Set<string> = new Set();
let cacheLastUpdated = 0;
const CACHE_TTL_MS = 60 * 1000; // Refresh cache every minute

/**
 * Refresh the blocked IP cache from database
 */
async function refreshBlockedIPCache(): Promise<void> {
  try {
    const now = new Date();
    const blockedIPs = await BlockedIP.find({
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    }).select('ipAddress').lean();
    
    blockedIPCache = new Set(blockedIPs.map(ip => ip.ipAddress));
    cacheLastUpdated = Date.now();
    
    console.log(`[IP_BLOCKER] Cache refreshed with ${blockedIPCache.size} blocked IPs`);
  } catch (error) {
    console.error('[IP_BLOCKER] Failed to refresh cache:', error);
  }
}

/**
 * Middleware to block requests from blocked IP addresses
 */
export const ipBlocker = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Refresh cache if stale
  if (Date.now() - cacheLastUpdated > CACHE_TTL_MS) {
    await refreshBlockedIPCache();
  }
  
  // Check if IP is blocked
  if (blockedIPCache.has(ip)) {
    // Update hit count in database (async, don't wait)
    BlockedIP.findOneAndUpdate(
      { ipAddress: ip },
      { 
        $inc: { hitCount: 1 },
        $set: { lastHitAt: new Date() },
      }
    ).catch(err => console.error('[IP_BLOCKER] Failed to update hit count:', err));
    
    console.log('[IP_BLOCKER] Blocked request from:', ip, 'path:', req.path);
    
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address has been blocked',
    });
  }
  
  next();
};

/**
 * Block an IP address
 */
export async function blockIP(
  ipAddress: string,
  reason: string,
  options?: {
    blockedBy?: string;
    blockedByName?: string;
    expiresInMinutes?: number;
    isAutoBlocked?: boolean;
  }
): Promise<void> {
  try {
    const existingBlock = await BlockedIP.findOne({ ipAddress });
    
    if (existingBlock) {
      // Update existing block
      existingBlock.reason = reason;
      if (options?.expiresInMinutes) {
        existingBlock.expiresAt = new Date(Date.now() + options.expiresInMinutes * 60 * 1000);
      }
      await existingBlock.save();
    } else {
      // Create new block
      const block = new BlockedIP({
        ipAddress,
        reason,
        blockedBy: options?.blockedBy,
        blockedByName: options?.blockedByName,
        expiresAt: options?.expiresInMinutes 
          ? new Date(Date.now() + options.expiresInMinutes * 60 * 1000)
          : undefined,
        isAutoBlocked: options?.isAutoBlocked || false,
      });
      await block.save();
    }
    
    // Add to cache immediately
    blockedIPCache.add(ipAddress);
    
    // Create security alert
    await createSecurityAlert({
      type: 'ip_blocked',
      severity: 'medium',
      message: `IP address blocked: ${ipAddress}`,
      details: {
        reason,
        blockedBy: options?.blockedByName || 'system',
        expiresInMinutes: options?.expiresInMinutes,
        isAutoBlocked: options?.isAutoBlocked,
      },
      ipAddress,
    });
    
    console.log('[IP_BLOCKER] Blocked IP:', ipAddress, 'reason:', reason);
  } catch (error) {
    console.error('[IP_BLOCKER] Failed to block IP:', error);
    throw error;
  }
}

/**
 * Unblock an IP address
 */
export async function unblockIP(ipAddress: string): Promise<boolean> {
  try {
    const result = await BlockedIP.deleteOne({ ipAddress });
    
    if (result.deletedCount > 0) {
      blockedIPCache.delete(ipAddress);
      console.log('[IP_BLOCKER] Unblocked IP:', ipAddress);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[IP_BLOCKER] Failed to unblock IP:', error);
    throw error;
  }
}

/**
 * Get list of all blocked IPs
 */
export async function getBlockedIPs() {
  return BlockedIP.find().sort({ blockedAt: -1 }).lean();
}

/**
 * Auto-block an IP after detecting abuse
 * Uses exponential backoff for block duration
 */
export async function autoBlockIP(ipAddress: string, reason: string): Promise<void> {
  // Check how many times this IP was auto-blocked before
  const existingBlock = await BlockedIP.findOne({ ipAddress, isAutoBlocked: true });
  
  // Exponential backoff: 5min, 30min, 2h, 24h, permanent
  let expiresInMinutes: number | undefined;
  if (!existingBlock) {
    expiresInMinutes = 5;
  } else if (existingBlock.hitCount < 3) {
    expiresInMinutes = 30;
  } else if (existingBlock.hitCount < 5) {
    expiresInMinutes = 120;
  } else if (existingBlock.hitCount < 10) {
    expiresInMinutes = 24 * 60;
  }
  // After 10 hits, permanent block (no expiry)
  
  await blockIP(ipAddress, reason, {
    expiresInMinutes,
    isAutoBlocked: true,
  });
}

// Note: Cache will be refreshed on first request, not at module load
// This prevents blocking server startup before DB connection is ready
