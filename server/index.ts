import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import helmet from 'helmet';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { isAuthenticated } from './middleware/auth';
import apiRoutes from './routes/api';
import userRoutes from './routes/users';
import analysisRoutes from './routes/analysis';
import connectToDatabase from './db';
import User from './models/User';

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy is required for secure cookies behind Vercel/Nginx proxies
app.set('trust proxy', 1);

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(helmet());
app.use(express.json());

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

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  })
);

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

app.post('/api/login', async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
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
    } else {
      // Fallback to ALLOWED_USERS env var
      const allowedUsers = (process.env.ALLOWED_USERS || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0);

      if (!allowedUsers.includes(email)) {
        return res.status(403).json({ message: 'User not allowed' });
      }
    }

    req.session.user = {
      _id: userId,
      email: email,
      name: userAlias,
      picture: payload.picture || '',
      role: userRole,
    };

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Failed to establish session' });
      }
      res.status(200).json({ user: req.session.user });
    });
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed', error });
  }
});

app.post('/api/login/password', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    req.session.user = {
      _id: user._id.toString(),
      email: user.email,
      name: user.alias,
      picture: '', // No picture for password users
      role: user.role,
    };

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: 'Failed to establish session' });
      }
      res.status(200).json({ user: req.session.user });
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error });
  }
});

app.get('/api/user', isAuthenticated, (req, res) => {
  res.json({ user: req.session.user });
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

app.use('/api/users', userRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api', apiRoutes);

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

if (require.main === module) {
  app.listen(port, async () => {
    try {
      await connectToDatabase();
      console.log(`Server is running on http://localhost:${port}`);
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });
}

export default app;
