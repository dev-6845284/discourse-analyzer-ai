import { CacheService } from './cacheService';
import { getPublicQuotesCacheSizeMB } from '../constants/env';

export const publicQuotesCache = new CacheService('public_quotes', getPublicQuotesCacheSizeMB());
