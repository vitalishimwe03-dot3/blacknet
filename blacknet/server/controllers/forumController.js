const pool = require('../config/db');
const xss = require('xss');
const slugify = require('validator').trim;

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

exports.getForums = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.id, f.name, f.slug, f.description, f.is_public, f.requires_approval, f.created_by, f.created_at,
        u.username as creator_username,
        COALESCE(threads.thread_count, 0) as thread_count,
        COALESCE(mods.mod_count, 0) as mod_count
       FROM forums f
       LEFT JOIN users u ON f.created_by = u.id
       LEFT JOIN (
         SELECT fc.forum_id, COUNT(*) thread_count
         FROM forum_categories fc
         JOIN forum_threads ft ON ft.category_id = fc.id
         GROUP BY fc.forum_id
       ) threads ON threads.forum_id = f.id
       LEFT JOIN (
         SELECT forum_id, COUNT(*) mod_count FROM forum_moderators GROUP BY forum_id
       ) mods ON mods.forum_id = f.id
       ORDER BY f.created_at DESC`
    );
    res.json({ forums: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch forums' });
  }
};

exports.createForum = async (req, res) => {
  try {
    const { name, description, isPublic, requiresApproval, categories } = req.body;
    const slug = toSlug(name);

    const result = await pool.query(
      `INSERT INTO forums (name, slug, description, is_public, requires_approval, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [xss(name), slug, xss(description || ''), isPublic !== false, requiresApproval || false, req.session.userId]
    );
    const forum = result.rows[0];

    await pool.query(
      `INSERT INTO forum_moderators (forum_id, user_id) VALUES ($1, $2)`,
      [forum.id, req.session.userId]
    );

    if (categories && categories.length > 0) {
      for (let i = 0; i < categories.length; i++) {
        await pool.query(
          `INSERT INTO forum_categories (forum_id, name, slug, description, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [forum.id, xss(categories[i].name), toSlug(categories[i].name), xss(categories[i].description || ''), i]
        );
      }
    }

    res.status(201).json({ forum });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create forum' });
  }
};

exports.getForum = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, u.username as creator_username FROM forums f LEFT JOIN users u ON f.created_by = u.id WHERE f.slug = $1`,
      [req.params.slug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Forum not found' });

    const categories = await pool.query(
      `SELECT fc.id, fc.forum_id, fc.name, fc.slug, fc.description, fc.sort_order, fc.created_at,
        COALESCE(threads.thread_count, 0) as thread_count
       FROM forum_categories fc
       LEFT JOIN (
         SELECT category_id, COUNT(*) thread_count FROM forum_threads GROUP BY category_id
       ) threads ON threads.category_id = fc.id
       WHERE fc.forum_id = $1 ORDER BY fc.sort_order`,
      [result.rows[0].id]
    );

    res.json({ forum: { ...result.rows[0], categories: categories.rows } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch forum' });
  }
};

exports.createThread = async (req, res) => {
  try {
    const { categoryId, title, content } = req.body;

    const result = await pool.query(
      `INSERT INTO forum_threads (category_id, title, author_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [categoryId, xss(title), req.session.userId]
    );
    const thread = result.rows[0];

    await pool.query(
      `INSERT INTO forum_posts (thread_id, author_id, content) VALUES ($1, $2, $3)`,
      [thread.id, req.session.userId, xss(content)]
    );

    res.status(201).json({ thread });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create thread' });
  }
};

exports.getThreads = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.category_id, t.title, t.author_id, t.is_pinned, t.is_locked, t.view_count, t.created_at, t.updated_at,
        u.username as author_username, u.display_name as author_display_name, u.avatar_url as author_avatar,
        COALESCE(stats.post_count, 0) as post_count,
        stats.first_post_content
       FROM forum_threads t
       LEFT JOIN users u ON t.author_id = u.id
       LEFT JOIN (
         SELECT thread_id, COUNT(*) post_count,
           (array_agg(content ORDER BY created_at ASC))[1] as first_post_content
         FROM forum_posts WHERE is_deleted = false GROUP BY thread_id
       ) stats ON stats.thread_id = t.id
       WHERE t.category_id = $1
       ORDER BY t.is_pinned DESC, t.updated_at DESC`,
      [req.params.categoryId]
    );
    res.json({ threads: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
};

exports.getThread = async (req, res) => {
  try {
    await pool.query('UPDATE forum_threads SET view_count = view_count + 1 WHERE id = $1', [req.params.threadId]);

    const thread = await pool.query(
      `SELECT t.*, u.username as author_username FROM forum_threads t LEFT JOIN users u ON t.author_id = u.id WHERE t.id = $1`,
      [req.params.threadId]
    );
    if (thread.rows.length === 0) return res.status(404).json({ error: 'Thread not found' });

    const posts = await pool.query(
      `SELECT p.*, u.username as author_username, u.display_name as author_display_name, u.avatar_url as author_avatar
       FROM forum_posts p LEFT JOIN users u ON p.author_id = u.id
       WHERE p.thread_id = $1 AND p.is_deleted = false
       ORDER BY p.created_at ASC`,
      [req.params.threadId]
    );

    res.json({ thread: thread.rows[0], posts: posts.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { content, replyTo } = req.body;

    const result = await pool.query(
      `INSERT INTO forum_posts (thread_id, author_id, content, reply_to)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.threadId, req.session.userId, xss(content), replyTo || null]
    );

    await pool.query('UPDATE forum_threads SET updated_at = NOW() WHERE id = $1', [req.params.threadId]);

    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create post' });
  }
};

exports.deleteThread = async (req, res) => {
  try {
    await pool.query('DELETE FROM forum_threads WHERE id = $1', [req.params.threadId]);
    res.json({ message: 'Thread deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete thread' });
  }
};

exports.togglePin = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE forum_threads SET is_pinned = NOT is_pinned WHERE id = $1 RETURNING is_pinned`,
      [req.params.threadId]
    );
    res.json({ isPinned: result.rows[0].is_pinned });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
};

exports.toggleLock = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE forum_threads SET is_locked = NOT is_locked WHERE id = $1 RETURNING is_locked`,
      [req.params.threadId]
    );
    res.json({ isLocked: result.rows[0].is_locked });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle lock' });
  }
};
