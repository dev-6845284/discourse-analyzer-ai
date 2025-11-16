import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { isAuthenticated } from './middleware/auth';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
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
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use('/api', apiRoutes);

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

    const allowedUsers = (process.env.ALLOWED_USERS || '').split(',');
    if (!allowedUsers.includes(payload.email)) {
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

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(buildPath));

  // For any other request, serve the index.html file
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(buildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Discourse Analyzer AI Server is running in development mode!');
  });
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
