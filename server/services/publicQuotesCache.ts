/**
 * @AI_INSTRUCTION: PUBLIC API CACHING RULE
 * This cache service is used for all public API requests.
 * All public data fetching MUST check this cache before querying the database.
 */
import { CacheService } from './cacheService';
import { getPublicQuotesCacheSizeMB } from '../constants/env';

export const publicQuotesCache = new CacheService('public_quotes', getPublicQuotesCacheSizeMB());
