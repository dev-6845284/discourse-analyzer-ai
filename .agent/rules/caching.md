# Caching Rules for AI

All public API requests MUST be cached in Redis.

## Public API Scope
The public API is primarily located in `server/routes/public.ts` (mounted at `/api/public`).

## Implementation Guidelines
1. **Always use Redis**: Public data should be served from Redis if available.
2. **Cache Key Generation**: Use unique cache keys based on the request parameters (e.g., query params for GET requests, ID for single resource requests).
3. **TTL (Time To Live)**: 
   - List endpoints (e.g., `/quotes`): Default 5 minutes (300 seconds).
   - Single item endpoints (e.g., `/quotes/:id`): Default 1 hour (3600 seconds) as they change less frequently.
4. **Cache Invalidation**: Currently, manual invalidation is not strictly enforced for public quotes, but be mindful of TTL when adding new features.
5. **Services**: Use `publicQuotesCache` from `server/services/publicQuotesCache.ts` for consistency.

## Example Pattern
```typescript
const cacheKey = `resource:${id}`;
const cached = await publicQuotesCache.get(cacheKey);
if (cached) return res.json(cached);

const result = await fetchFromDb();
await publicQuotesCache.set(cacheKey, result, { ttl: 3600 });
res.json(result);
```
