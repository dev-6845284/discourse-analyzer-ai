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
import connectToDatabase from './db';

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy is required for secure cookies behind Vercel/Nginx proxies
app.set('trust proxy', 1);

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(helmet());
app.use(express.json());

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

const allowedOrigins = [
  'http://localhost:3000',
  'https://discourse-analyzer-ai-preview.vercel.app',
  'https://discourse-analyzer-ai.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
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

    const allowedUsers = (process.env.ALLOWED_USERS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    if (!allowedUsers.includes(payload.email.toLowerCase())) {
      return res.status(403).json({ message: 'User not allowed' });
    }

    req.session.user = {
      email: payload.email,
      name: payload.name || '',
      picture: payload.picture || '',
    };

    res.status(200).json({ user: req.session.user });
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed', error });
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

app.listen(port, async () => {
  try {
    await connectToDatabase();
    console.log(`Server is running on http://localhost:${port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
});
