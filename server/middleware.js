const jwt = require('jsonwebtoken');
const { db } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'blacknet_secret_key_change_in_production_2024';
const JWT_EXPIRY = '7d';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('\x1b[31m[SECURITY] WARNING: Using default JWT_SECRET in production! Set JWT_SECRET environment variable.\x1b[0m');
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, email, display_name, avatar, role, is_suspended, storage_used, storage_limit, last_seen FROM users WHERE id = ?').get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    
    db.prepare("UPDATE users SET last_seen = datetime('now') WHERE id = ?").run(user.id);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, username, email, display_name, avatar, role, is_suspended FROM users WHERE id = ?').get(decoded.userId);
      if (user && !user.is_suspended) {
        req.user = user;
      }
    } catch (err) {}
  }
  next();
}

function adminMiddleware(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authMiddleware, optionalAuth, adminMiddleware, JWT_SECRET, JWT_EXPIRY };
