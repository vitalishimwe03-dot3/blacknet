const router = require('express').Router();
const communities = require('../controllers/communityController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, communities.getCommunities);
router.get('/my', requireAuth, communities.getMyCommunities);
router.post('/', requireAuth, communities.createCommunity);
router.get('/invite/:code', requireAuth, communities.joinByInvite);
router.get('/:slug', requireAuth, communities.getCommunity);
router.post('/:communityId/invite', requireAuth, communities.generateInvite);
router.delete('/:communityId/invite/:inviteId', requireAuth, communities.revokeInvite);
router.delete('/:communityId/member/:userId', requireAuth, communities.removeMember);
router.put('/:communityId/member/:userId/role', requireAuth, communities.updateMemberRole);

module.exports = router;
