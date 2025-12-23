import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { isAuthenticated } from './middleware/auth';
import apiRoutes from './routes/api';
import userRoutes from './routes/users';
import analysisRoutes from './routes/analysis';
import adminRoutes from './routes/admin';
import connectToDatabase from './db';
import User from './models/User';
import { generalRateLimiter, loginRateLimiter, apiRateLimiter } from './middleware/rateLimiter';
import { ipBlocker } from './middleware/ipBlocker';
import { usageTracker } from './middleware/usageTracker';

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy is required for secure cookies behind Vercel/Nginx proxies
app.set('trust proxy', 1);

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================
// SECURITY MIDDLEWARE - DDoS Protection Layer
// ============================================

// 1. IP Blocker - Block known bad IPs first (before any processing)
app.use(ipBlocker);

// 2. General rate limiter - Basic flood protection for all requests
app.use(generalRateLimiter);

// 3. Usage tracker - Log all API requests for monitoring
app.use(usageTracker);

// ============================================

// Ensure database connection for every request (serverless friendly)
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const mongoUri = process.env.MONGODB_URI;

// Session middleware with detailed logging
app.use((req, res, next) => {
  console.log('[SESSION_MIDDLEWARE_BEFORE]', {
    timestamp: new Date().toISOString(),
    sessionID: req.sessionID,
    path: req.path,
    hasSession: !!req.session,
    hasUser: !!req.session?.user
  });
  next();
});

// Configure session store
const sessionConfig: session.SessionOptions = {
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true, // Changed to true to ensure session ID is generated for all visitors
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
};

// Use MongoDB store if connection string is available, otherwise use memory store with warning
if (mongoUri) {
  console.log('[SESSION_STORE] Configuring MongoDB session store');
  const collectionSuffix = process.env.DB_COLLECTION_SUFFIX || '';
  sessionConfig.store = MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: `sessions${collectionSuffix}`,
    ttl: 24 * 60 * 60, // 24 hours
    touchAfter: 24 * 3600, // Lazy session update
    crypto: {
      secret: sessionSecret,
    },
  }) as any;
} else {
  console.warn('[SESSION_STORE] WARNING: Using in-memory session store. This is NOT suitable for production!');
}

app.use(session(sessionConfig));

// Log after session middleware
app.use((req, res, next) => {
  console.log('[SESSION_MIDDLEWARE_AFTER]', {
    timestamp: new Date().toISOString(),
    sessionID: req.sessionID,
    path: req.path,
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    userEmail: req.session?.user?.email || 'NONE'
  });
  next();
});

const allowedOrigins = [
  'http://localhost:3000',
  'https://discourse-analyzer-ai-preview.vercel.app',
  'https://discourse-analyzer-ai.vercel.app'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is in allowedOrigins or is a subdomain of pasitikrink.org
      const isAllowed =
        allowedOrigins.indexOf(origin) !== -1 ||
        /^https:\/\/([a-zA-Z0-9-]+\.)*pasitikrink\.org$/.test(origin);

      if (!isAllowed) {
        const msg =
          'The CORS policy for this site does not ' +
          'allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// PUBLIC ROUTES (no authentication required)
// Apply strict rate limiting to login endpoints
app.post('/api/login', loginRateLimiter, async (req, res) => {
  const { token } = req.body;
  console.log('[LOGIN_GOOGLE]', {
    timestamp: new Date().toISOString(),
    sessionID: req.sessionID,
    hasToken: !!token
  });

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      console.log('[LOGIN_FAILED] Invalid token payload');
      return res.status(401).json({ message: 'Invalid token' });
    }

    const email = payload.email.toLowerCase();
    let userRole = 'viewer';
    let userAlias = payload.name || '';
    let userId: string | undefined;

    // Check if user exists in DB
    const dbUser = await User.findOne({ email });
    
    if (dbUser) {
      userRole = dbUser.role;
      userAlias = dbUser.alias;
      userId = dbUser._id.toString();
      console.log('[LOGIN_DB_USER_FOUND]', { email, userId });
    } else {
      // Fallback to ALLOWED_USERS env var
      const allowedUsers = (process.env.ALLOWED_USERS || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0);

      if (!allowedUsers.includes(email)) {
        console.log('[LOGIN_DENIED] User not in allowed list:', email);
        return res.status(403).json({ message: 'User not allowed' });
      }
      console.log('[LOGIN_ALLOWED_LIST] User allowed via env var:', email);
    }

    const sessionData = {
      _id: userId,
      email: email,
      name: userAlias,
      picture: payload.picture || '',
      role: userRole,
    };

    req.session.user = sessionData;

    console.log('[SESSION_USER_SET]', {
      sessionID: req.sessionID,
      email: email,
      role: userRole
    });

    req.session.save((err) => {
      if (err) {
        console.error('[SESSION_SAVE_ERROR]', { error: err.message, sessionID: req.sessionID });
        return res.status(500).json({ message: 'Failed to establish session' });
      }
      console.log('[LOGIN_SUCCESS]', {
        sessionID: req.sessionID,
        email: email,
        role: userRole
      });
      res.status(200).json({ user: req.session.user });
    });
  } catch (error) {
    console.error('[LOGIN_ERROR]', { error: (error as any).message });
    res.status(401).json({ message: 'Authentication failed', error });
  }
});

app.post('/api/login/password', loginRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  console.log('[LOGIN_PASSWORD]', {
    timestamp: new Date().toISOString(),
    email,
    sessionID: req.sessionID
  });
  
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('[LOGIN_PASSWORD_FAILED] User not found:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      console.log('[LOGIN_PASSWORD_FAILED] Password mismatch for:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const sessionData = {
      _id: user._id.toString(),
      email: user.email,
      name: user.alias,
      picture: '', // No picture for password users
      role: user.role,
    };

    req.session.user = sessionData;

    console.log('[SESSION_USER_SET]', {
      sessionID: req.sessionID,
      email: user.email,
      role: user.role
    });

    req.session.save((err) => {
      if (err) {
        console.error('[SESSION_SAVE_ERROR]', { error: err.message, sessionID: req.sessionID });
        return res.status(500).json({ message: 'Failed to establish session' });
      }
      console.log('[LOGIN_PASSWORD_SUCCESS]', {
        sessionID: req.sessionID,
        email: user.email,
        role: user.role
      });
      res.status(200).json({ user: req.session.user });
    });
  } catch (error) {
    console.error('[LOGIN_PASSWORD_ERROR]', { error: (error as any).message });
    res.status(500).json({ message: 'Login failed', error });
  }
});

app.get('/api/user', isAuthenticated, (req, res) => {
  res.json({ user: req.session.user });
});

app.get('/api/session/debug', (req, res) => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    sessionID: req.sessionID,
    hasSession: !!req.session,
    session: req.session ? {
      id: req.session.id,
      hasUser: !!req.session.user,
      user: req.session.user || null,
      keys: Object.keys(req.session)
    } : null,
    cookies: {
      hasCookie: !!req.headers.cookie,
      cookieNames: req.headers.cookie?.split('; ').map(c => c.split('=')[0]) || []
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      BYPASS_AUTH: process.env.BYPASS_AUTH
    }
  };
  
  console.log('[SESSION_DEBUG]', JSON.stringify(debugInfo, null, 2));
  res.json(debugInfo);
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out.' });
    }
    res.clearCookie('connect.sid'); // The default session cookie name
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

// PROTECTED ROUTES (authentication required)
// Apply API rate limiting to authenticated endpoints
app.use('/api/admin', apiRateLimiter, adminRoutes);
app.use('/api/users', apiRateLimiter, userRoutes);
app.use('/api/analysis', apiRateLimiter, analysisRoutes);
app.use('/api', apiRateLimiter, apiRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(buildPath));

  // For any other request, serve the index.html file
  app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Discourse Analyzer AI Server is running in development mode!');
  });
}

import { loadCategoriesFromDb } from './services/categoryService';
import mongoose from 'mongoose';

if (require.main === module) {
  app.listen(port, async () => {
    try {
      await connectToDatabase();
      // Initialize dynamic categories from DB (if available). This is best-effort.
      try {
        if (mongoose.connection && mongoose.connection.db) {
          await loadCategoriesFromDb(mongoose.connection.db as any);
        }
      } catch (e) {
        console.warn('Could not load categories from DB at startup:', (e as Error).message);
      }

      console.log(`Server is running on http://localhost:${port}`);
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });
}

export default app;
