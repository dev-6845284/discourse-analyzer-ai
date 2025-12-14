# MongoDB Session Storage Setup

## Overview

The application now uses MongoDB for session storage instead of the default in-memory store. This ensures sessions persist across server restarts and support multiple server instances in production.

## Changes Made

### 1. Dependencies
- **Installed**: `connect-mongo` - MongoDB session store for Express
  ```bash
  npm install connect-mongo --save
  ```

### 2. Database Migration
- **File**: `server/migrations/20251204000000-setup-sessions-collection.js`
- **Purpose**: Creates the `sessions` collection with proper indexes
- **Features**:
  - TTL (Time To Live) index: Automatically deletes expired sessions after 24 hours
  - Session ID index: Optimizes session lookups
  
- **Run migration**:
  ```bash
  npm run migrate:up
  ```

### 3. Backend Configuration
- **File**: `server/index.ts`
- **Changes**:
  - Imported `MongoStore` from `connect-mongo`
  - Updated session middleware to use MongoDB store when `MONGODB_URI` is available
  - Falls back to in-memory store if MongoDB URI is not configured (with warning)
  - Added logging for session store initialization

## Session Configuration

```typescript
sessionConfig.store = MongoStore.create({
  mongoUrl: mongoUri,
  collectionName: 'sessions',
  ttl: 24 * 60 * 60,           // 24 hours
  touchAfter: 24 * 3600,        // Lazy session update (only update on changes)
  crypto: {
    secret: sessionSecret,      // Encrypt session data
  },
});
```

## Deployment Instructions

### For Production

1. **Ensure MONGODB_URI is set** in your environment variables
2. **Run migrations** before deploying the new version:
   ```bash
   npm run migrate:up
   ```
3. **Deploy** the updated application

### For Local Development

1. Sessions are automatically stored in MongoDB if `MONGODB_URI` is configured
2. No additional setup needed beyond running migrations

## Verification

### Check Session Store Status

Call the debug endpoint to verify session store is working:

```bash
curl http://localhost:3001/api/session/debug
```

Look for logs like:
```
[SESSION_STORE] Configuring MongoDB session store
```

### Monitor Sessions

Check active sessions in MongoDB:

```bash
db.sessions.find().count()        # Total sessions
db.sessions.find().limit(1)       # View a session document
```

## Session Expiration

- **TTL**: 24 hours (86400 seconds)
- **Automatic Cleanup**: MongoDB automatically removes expired session documents
- **Manual Cleanup**: Can manually delete old sessions:
  ```bash
  db.sessions.deleteMany({ "createdAt": { "$lt": new Date(Date.now() - 24*60*60*1000) } })
  ```

## Rollback (if needed)

If you need to revert to in-memory sessions:

```bash
npm run migrate:down
```

Then remove the MongoStore configuration from `server/index.ts`

## Troubleshooting

### Sessions Not Persisting

1. Check if `MONGODB_URI` is set in environment
2. Verify MongoDB connection is working: `npm run migrate:status`
3. Check logs for `[SESSION_STORE]` entries
4. Verify the `sessions` collection exists: `db.collections | grep sessions`

### Session Errors

Check MongoDB logs and verify:
- MongoDB service is running
- Connection string is correct
- User has permission to write to the database

### TTL Index Not Working

Verify the index exists:
```bash
db.sessions.getIndexes()
```

Look for `sessions_ttl_index` with `expireAfterSeconds: 86400`
