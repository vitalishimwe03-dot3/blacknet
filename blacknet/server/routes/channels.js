const router = require('express').Router();
const channels = require('../controllers/channelController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, channels.getChannels);
router.post('/', requireAuth, channels.createChannel);
router.post('/:channelId/join', requireAuth, channels.joinChannel);
router.post('/:channelId/leave', requireAuth, channels.leaveChannel);
router.get('/:channelId/messages', requireAuth, channels.getChannelMessages);
router.post('/:channelId/messages', requireAuth, channels.sendChannelMessage);
router.put('/:channelId/mute/:userId', requireAuth, requireRole('admin', 'moderator'), channels.muteUser);
router.delete('/:channelId/kick/:userId', requireAuth, requireRole('admin', 'moderator'), channels.kickUser);

module.exports = router;
