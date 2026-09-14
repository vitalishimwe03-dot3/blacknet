const router = require('express').Router();
const chatRooms = require('../controllers/chatRoomController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, chatRooms.getRooms);
router.post('/', requireAuth, chatRooms.createRoom);
router.get('/:roomId/messages', requireAuth, chatRooms.getMessages);
router.post('/:roomId/messages', requireAuth, chatRooms.sendMessage);
router.post('/:roomId/leave', requireAuth, chatRooms.leaveRoom);

module.exports = router;