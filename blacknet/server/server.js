require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSimple = require('connect-pg-simple')(session);
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./config/db');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 900000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Session
const sessionStore = process.env.LOAD_PGMEM === 'true'
  ? new session.MemoryStore()
  : new PgSimple({ pool, tableName: 'sessions', createTableIfMissing: true });
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'blacknet-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/forums', require('./routes/forums'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/communities', require('./routes/communities'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/moderation', require('./routes/moderation'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve Vue app (production build)
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Socket.IO
const setupSocket = require('./utils/socket');
setupSocket(io);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

async function start() {
  if (process.env.LOAD_PGMEM === 'true') {
    const { migrate } = require('./config/migrate');
    await migrate();
  }
  server.listen(PORT, () => {
    console.log(`BlackNet server running on port ${PORT}`);
  });
}

start();

module.exports = { app, server, io };
