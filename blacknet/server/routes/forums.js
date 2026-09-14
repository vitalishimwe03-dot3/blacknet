const router = require('express').Router();
const forums = require('../controllers/forumController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, forums.getForums);
router.post('/', requireAuth, forums.createForum);
router.get('/:slug', requireAuth, forums.getForum);
router.get('/thread/:threadId', requireAuth, forums.getThread);
router.get('/category/:categoryId/threads', requireAuth, forums.getThreads);
router.post('/thread', requireAuth, forums.createThread);
router.post('/thread/:threadId/post', requireAuth, forums.createPost);
router.delete('/thread/:threadId', requireAuth, requireRole('admin', 'moderator'), forums.deleteThread);
router.put('/thread/:threadId/pin', requireAuth, requireRole('admin', 'moderator'), forums.togglePin);
router.put('/thread/:threadId/lock', requireAuth, requireRole('admin', 'moderator'), forums.toggleLock);

module.exports = router;
