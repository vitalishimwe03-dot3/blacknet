function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const pool = require('../config/db');
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.session.userId]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }
      if (!roles.includes(result.rows[0].role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.userRole = result.rows[0].role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

function optionalAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return requireAuth(req, res, next);
  }
  next();
}

module.exports = { requireAuth, requireRole, optionalAuth };
