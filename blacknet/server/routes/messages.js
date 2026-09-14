const router = require('express').Router();
const messages = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

router.get('/', requireAuth, messages.getConversations);
router.post('/', requireAuth, messages.createConversation);
router.get('/search', requireAuth, messages.searchMessages);
router.get('/:conversationId', requireAuth, messages.getMessages);
router.post('/:conversationId', requireAuth, messages.sendMessage);
router.put('/message/:messageId', requireAuth, messages.editMessage);
router.delete('/message/:messageId', requireAuth, messages.deleteMessage);

router.post('/:conversationId/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
