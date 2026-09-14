const pool = require('../config/db');
const xss = require('xss');
const { v4: uuidv4 } = require('uuid');

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

exports.getCommunities = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.slug, c.description, c.avatar_url, c.is_public, c.requires_invite, c.created_by, c.created_at, c.updated_at,
        u.username as creator_username,
        COALESCE(mem.member_count, 0) as member_count,
        MAX(CASE WHEN mm.user_id = $1 THEN 1 ELSE 0 END) as is_member
       FROM communities c
       LEFT JOIN users u ON c.created_by = u.id
       LEFT JOIN (SELECT community_id, COUNT(*) member_count FROM community_members GROUP BY community_id) mem
         ON mem.community_id = c.id
       LEFT JOIN community_members mm ON mm.community_id = c.id
       WHERE c.is_public = true
       GROUP BY c.id, mem.member_count, u.username
       ORDER BY member_count DESC`,
      [req.session.userId]
    );
    res.json({ communities: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
};

exports.getMyCommunities = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.slug, c.description, c.avatar_url, c.is_public, c.requires_invite, c.created_by, c.created_at, c.updated_at,
        cm.role as my_role,
        COALESCE(mem.member_count, 0) as member_count
       FROM communities c
       JOIN community_members cm ON c.id = cm.community_id
       LEFT JOIN (SELECT community_id, COUNT(*) member_count FROM community_members GROUP BY community_id) mem
         ON mem.community_id = c.id
       WHERE cm.user_id = $1
       ORDER BY c.name`,
      [req.session.userId]
    );
    res.json({ communities: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
};

exports.createCommunity = async (req, res) => {
  try {
    const { name, description, isPublic, requiresInvite } = req.body;
    const slug = toSlug(name);

    const result = await pool.query(
      `INSERT INTO communities (name, slug, description, is_public, requires_invite, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [xss(name), slug, xss(description || ''), isPublic || false, requiresInvite !== false, req.session.userId]
    );

    await pool.query(
      `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [result.rows[0].id, req.session.userId]
    );

    res.status(201).json({ community: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create community' });
  }
};

exports.getCommunity = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.username as creator_username FROM communities c LEFT JOIN users u ON c.created_by = u.id WHERE c.slug = $1`,
      [req.params.slug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Community not found' });

    const community = result.rows[0];
    const memberCheck = await pool.query(
      'SELECT role FROM community_members WHERE community_id = $1 AND user_id = $2',
      [community.id, req.session.userId]
    );

    if (memberCheck.rows.length === 0 && community.requires_invite) {
      return res.status(403).json({ error: 'Invite required', community: { name: community.name, description: community.description } });
    }

    const members = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_online, cm.role, cm.joined_at
       FROM community_members cm JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1 ORDER BY cm.role, cm.joined_at`,
      [community.id]
    );

    res.json({ community: { ...community, members: members.rows, myRole: memberCheck.rows[0]?.role || null } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch community' });
  }
};

exports.generateInvite = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { maxUses, expiresInDays } = req.body;

    const code = uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
    }

    const result = await pool.query(
      `INSERT INTO community_invites (community_id, code, created_by, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [communityId, code, req.session.userId, maxUses || 1, expiresAt]
    );

    res.status(201).json({ invite: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate invite' });
  }
};

exports.joinByInvite = async (req, res) => {
  try {
    const { code } = req.params;

    const invite = await pool.query(
      `SELECT * FROM community_invites WHERE code = $1 AND is_revoked = false`,
      [code]
    );
    if (invite.rows.length === 0) return res.status(404).json({ error: 'Invalid invite code' });

    const inv = invite.rows[0];
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invite expired' });
    }
    if (inv.max_uses && inv.use_count >= inv.max_uses) {
      return res.status(410).json({ error: 'Invite max uses reached' });
    }

    await pool.query(
      `INSERT INTO community_members (community_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [inv.community_id, req.session.userId]
    );
    await pool.query(
      'UPDATE community_invites SET use_count = use_count + 1 WHERE id = $1',
      [inv.id]
    );

    const community = await pool.query('SELECT slug FROM communities WHERE id = $1', [inv.community_id]);
    res.json({ message: 'Joined community', slug: community.rows[0].slug });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join community' });
  }
};

exports.revokeInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    await pool.query('UPDATE community_invites SET is_revoked = true WHERE id = $1', [inviteId]);
    res.json({ message: 'Invite revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke invite' });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { communityId, userId } = req.params;
    await pool.query('DELETE FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const { communityId, userId } = req.params;
    const { role } = req.body;
    if (!['member', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await pool.query(
      'UPDATE community_members SET role = $1 WHERE community_id = $2 AND user_id = $3',
      [role, communityId, userId]
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};
