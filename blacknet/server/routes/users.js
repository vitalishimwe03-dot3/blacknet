const router = require('express').Router();
const users = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

router.get('/search', requireAuth, users.searchUsers);
router.get('/online', requireAuth, users.getOnlineUsers);
router.get('/:id', requireAuth, users.getProfile);
router.put('/profile', requireAuth, users.updateProfile);
router.post('/block/:userId', requireAuth, users.blockUser);
router.delete('/block/:userId', requireAuth, users.unblockUser);

module.exports = router;
