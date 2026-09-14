const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authMiddleware } = require('../middleware');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = getCategory(file.mimetype, file.originalname);
    const dir = path.join(UPLOAD_DIR, category);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

function getCategory(mimetype, filename) {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf' || mimetype === 'application/epub+zip' || filename?.endsWith('.epub')) return 'documents';
  return 'other';
}

function getFileCategory(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf' || mimetype === 'application/epub+zip') return 'document';
  return 'other';
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
  'application/pdf', 'application/epub+zip'
];

const MAX_SIZES = {
  image: 10 * 1024 * 1024,   // 10MB
  video: 100 * 1024 * 1024,  // 100MB
  audio: 20 * 1024 * 1024,   // 20MB
  document: 50 * 1024 * 1024 // 50MB
};

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Upload file
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const category = getFileCategory(req.file.mimetype);
    const maxSize = MAX_SIZES[category] || 10 * 1024 * 1024;
    
    if (req.file.size > maxSize) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `File too large for ${category} (max ${Math.round(maxSize/1024/1024)}MB)` });
    }

    // Check storage quota
    const user = db.prepare('SELECT storage_used, storage_limit FROM users WHERE id = ?').get(req.user.id);
    if (user.storage_used + req.file.size > user.storage_limit) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Storage limit reached' });
    }

    const categoryDir = getCategory(req.file.mimetype, req.file.originalname);
    const relativePath = `/uploads/${categoryDir}/${req.file.filename}`;

    const id = uuidv4();
    db.prepare('INSERT INTO files (id, user_id, filename, original_name, mime_type, file_size, file_path, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, relativePath, category);

    db.prepare('UPDATE users SET storage_used = storage_used + ? WHERE id = ?').run(req.file.size, req.user.id);

    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);
    res.status(201).json(file);
  } catch (err) {
    console.error('Upload error:', err);
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch(e) {}
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get user files
router.get('/', authMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const category = req.query.category;

    let query = 'SELECT * FROM files WHERE user_id = ?';
    const params = [req.user.id];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const files = db.prepare(query).all(...params);
    
    let countQuery = 'SELECT COUNT(*) as count FROM files WHERE user_id = ?';
    const countParams = [req.user.id];
    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }
    const total = db.prepare(countQuery).get(...countParams).count;

    res.json({ files, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get storage info
router.get('/storage', authMiddleware, (req, res) => {
  try {
    const user = db.prepare('SELECT storage_used, storage_limit FROM users WHERE id = ?').get(req.user.id);
    
    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(file_size) as size
      FROM files WHERE user_id = ?
      GROUP BY category
    `).all(req.user.id);

    const recentFiles = db.prepare('SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC LIMIT 10').all(req.user.id);

    res.json({
      used: user.storage_used,
      limit: user.storage_limit,
      percentage: Math.round((user.storage_used / user.storage_limit) * 100),
      categories: byCategory,
      recent_files: recentFiles
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch storage info' });
  }
});

// Delete file
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if file is attached to any posts
    const attached = db.prepare('SELECT 1 FROM post_media WHERE file_id = ?').get(file.id);
    if (attached) {
      return res.status(400).json({ error: 'File is attached to posts and cannot be deleted' });
    }

    // Delete physical file
    const fullPath = path.join(__dirname, '..', file.file_path);
    try { fs.unlinkSync(fullPath); } catch(e) {}

    db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
    db.prepare('UPDATE users SET storage_used = MAX(0, storage_used - ?) WHERE id = ?').run(file.file_size, req.user.id);

    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Error handling for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message === 'File type not allowed') {
    return res.status(400).json({ error: 'File type not allowed' });
  }
  next(err);
});

module.exports = router;
