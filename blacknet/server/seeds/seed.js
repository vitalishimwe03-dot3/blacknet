require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const argon2 = require('argon2');
const { pool } = require('../config/migrate');
const { v4: uuidv4 } = require('uuid');

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function seed() {
  try {
    console.log('Seeding BlackNet database...');

    // Run migrations first
    const { migrate } = require('../config/migrate');
    await migrate();

    // Create admin user
    const adminHash = await argon2.hash(process.env.ADMIN_PASSWORD || 'Admin123!');
    const adminResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name, role)
       VALUES ('admin', $1, $2, 'System Admin', 'admin')
       ON CONFLICT (username) DO UPDATE SET role = 'admin'
       RETURNING id`,
      [process.env.ADMIN_EMAIL || 'admin@blacknet.local', adminHash]
    );
    const adminId = adminResult.rows[0].id;

    // Create demo users
    const demoUsers = [
      { username: 'ghost_protocol', email: 'ghost@blacknet.local', displayName: 'Ghost Protocol' },
      { username: 'cipher_zero', email: 'cipher@blacknet.local', displayName: 'Cipher Zero' },
      { username: 'null_byte', email: 'null@blacknet.local', displayName: 'Null Byte' },
      { username: 'root_access', email: 'root@blacknet.local', displayName: 'Root Access' },
      { username: 'neon_shade', email: 'neon@blacknet.local', displayName: 'Neon Shade' },
      { username: 'phantom_link', email: 'phantom@blacknet.local', displayName: 'Phantom Link' },
      { username: 'dark_signal', email: 'dark@blacknet.local', displayName: 'Dark Signal' },
      { username: 'byte_shifter', email: 'byte@blacknet.local', displayName: 'Byte Shifter' },
    ];

    const demoHash = await argon2.hash('Demo1234!');
    const userIds = [adminId];

    for (const u of demoUsers) {
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, 'user')
         ON CONFLICT (username) DO UPDATE SET display_name = $4
         RETURNING id`,
        [u.username, u.email, demoHash, u.displayName]
      );
      userIds.push(result.rows[0].id);
    }

    // Create moderator
    const modResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, display_name, role)
       VALUES ('moderator', $1, $2, 'Forum Mod', 'moderator')
       ON CONFLICT (username) DO UPDATE SET role = 'moderator'
       RETURNING id`,
      ['mod@blacknet.local', demoHash]
    );
    userIds.push(modResult.rows[0].id);

    // Channels
    const channelDefs = [
      { name: '#general', description: 'General discussion', topic: 'Welcome to BlackNet!' },
      { name: '#developers', description: 'Developer talk', topic: 'Code, bugs, and features' },
      { name: '#security', description: 'Security discussion', topic: 'Cybersecurity topics and best practices' },
      { name: '#off-topic', description: 'Off-topic chat', topic: 'Anything goes' },
      { name: '#announcements', description: 'Platform announcements', topic: 'Official updates' },
    ];

    const channelIds = [];
    for (const ch of channelDefs) {
      const slug = toSlug(ch.name);
      const result = await pool.query(
        `INSERT INTO channels (name, slug, description, topic, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET description = $3
         RETURNING id`,
        [ch.name, slug, ch.description, ch.topic, adminId]
      );
      channelIds.push(result.rows[0].id);
    }

    // Join all users to #general
    for (const uid of userIds) {
      await pool.query(
        `INSERT INTO channel_members (channel_id, user_id, role) VALUES ($1, $2, 'member')
         ON CONFLICT DO NOTHING`,
        [channelIds[0], uid]
      );
    }
    // Admin to all channels
    for (const cid of channelIds) {
      await pool.query(
        `INSERT INTO channel_members (channel_id, user_id, role) VALUES ($1, $2, 'admin')
         ON CONFLICT DO NOTHING`,
        [cid, adminId]
      );
    }

    // Channel messages
    const channelMessages = [
      'Welcome to #general! This is the main discussion channel.',
      'Has anyone been following the latest CVE disclosures?',
      'Just pushed a new update to the platform. Check the changelog.',
      'Anyone interested in a CTF competition this weekend?',
      'Remember: always use strong, unique passwords and enable 2FA.',
      'The new encryption module is looking promising.',
      'Has anyone tried the new secure file sharing feature?',
      'Great discussion yesterday about zero-trust architecture.',
    ];

    for (let i = 0; i < channelMessages.length; i++) {
      const senderIdx = i % userIds.length;
      await pool.query(
        `INSERT INTO channel_messages (channel_id, sender_id, content)
         VALUES ($1, $2, $3)`,
        [channelIds[0], userIds[senderIdx], channelMessages[i]]
      );
    }

    // Forum
    const forumResult = await pool.query(
      `INSERT INTO forums (name, slug, description, is_public, created_by)
       VALUES ('BlackNet Community', 'blacknet-community', 'The main community forum for BlackNet users', true, $1)
       ON CONFLICT (slug) DO UPDATE SET description = 'The main community forum for BlackNet users'
       RETURNING id`,
      [adminId]
    );
    const forumId = forumResult.rows[0].id;

    await pool.query(
      'INSERT INTO forum_moderators (forum_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [forumId, userIds[userIds.length - 1]] // moderator
    );

    // Forum categories
    const categories = [
      { name: 'General Discussion', slug: 'general-discussion', description: 'Talk about anything' },
      { name: 'Security Research', slug: 'security-research', description: 'Share security findings' },
      { name: 'Development', slug: 'development', description: 'Code and development talk' },
      { name: 'Platform Feedback', slug: 'platform-feedback', description: 'Feedback about BlackNet' },
    ];

    const categoryIds = [];
    for (let i = 0; i < categories.length; i++) {
      const result = await pool.query(
        `INSERT INTO forum_categories (forum_id, name, slug, description, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [forumId, categories[i].name, categories[i].slug, categories[i].description, i]
      );
      categoryIds.push(result.rows[0].id);
    }

    // Forum threads and posts
    const threadData = [
      { cat: 0, title: 'Welcome to BlackNet!', posts: [
        'Welcome everyone to the BlackNet community platform. Please read the rules and enjoy the discussion.',
        'Great to be here! Looking forward to the community.',
        'Thanks for setting this up. The platform looks solid.'
      ]},
      { cat: 1, title: 'Best practices for secure communications', posts: [
        'What encryption algorithms do you recommend for end-to-end messaging? AES-256-GCM seems to be the standard.',
        'For key exchange, Signal Protocol is well-audited. Curve25519 for ECDH.',
        'Don\'t forget about forward secrecy. Rotate keys regularly.',
        'Post-quantum: look into CRYSTALS-Kyber for key encapsulation.'
      ]},
      { cat: 2, title: 'Building secure WebSocket connections', posts: [
        'Here\'s my approach to securing WebSocket connections with token auth and TLS.',
        'Make sure to validate origin headers and use wss:// in production.',
        'Rate limiting is crucial for WebSocket connections to prevent DoS.'
      ]},
      { cat: 3, title: 'Feature request: Dark mode improvements', posts: [
        'The dark mode is great, but I\'d love to see more customization options for accent colors.',
        'Agreed. Maybe some preset themes like Matrix green, Synthwave, etc.',
        'Also, would be nice to have a toggle for the background animation.'
      ]},
    ];

    for (const thread of threadData) {
      const threadResult = await pool.query(
        `INSERT INTO forum_threads (category_id, title, author_id)
         VALUES ($1, $2, $3) RETURNING id`,
        [categoryIds[thread.cat], thread.title, userIds[1]]
      );
      const threadId = threadResult.rows[0].id;

      for (let i = 0; i < thread.posts.length; i++) {
        const authorIdx = i % userIds.length;
        await pool.query(
          `INSERT INTO forum_posts (thread_id, author_id, content)
           VALUES ($1, $2, $3)`,
          [threadId, userIds[authorIdx], thread.posts[i]]
        );
      }
    }

    // Communities
    const commDefs = [
      { name: 'Security Researchers', slug: 'security-researchers', description: 'A private community for security researchers', isPublic: true },
      { name: 'Core Developers', slug: 'core-developers', description: 'Core development team', isPublic: false },
    ];

    const commIds = [];
    for (const comm of commDefs) {
      const result = await pool.query(
        `INSERT INTO communities (name, slug, description, is_public, requires_invite, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET description = $3
         RETURNING id`,
        [comm.name, comm.slug, comm.description, comm.isPublic, !comm.isPublic, adminId]
      );
      commIds.push(result.rows[0].id);

      await pool.query(
        `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'admin') ON CONFLICT DO NOTHING`,
        [result.rows[0].id, adminId]
      );
    }

    // Join some users to first community
    for (let i = 1; i <= 4; i++) {
      await pool.query(
        `INSERT INTO community_members (community_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`,
        [commIds[0], userIds[i]]
      );
    }

    // Generate an invite code
    await pool.query(
      `INSERT INTO community_invites (community_id, code, created_by, max_uses)
       VALUES ($1, $2, $3, 10)`,
      [commIds[0], 'BLACKNET2026', adminId]
    );

    // Conversations
    const convResult = await pool.query(
      `INSERT INTO conversations (type, name, created_by) VALUES ('group', 'Security Talk', $1) RETURNING id`,
      [adminId]
    );
    const convId = convResult.rows[0].id;
    for (let i = 0; i < 5; i++) {
      await pool.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [convId, userIds[i]]
      );
    }

    // Messages in conversation
    const msgTexts = [
      'Hey everyone, just wanted to share some findings on the latest vulnerabilities.',
      'Interesting. Can you share more details?',
      'Sure, I\'ll write up a post in the forum about it.',
      'Make sure to follow responsible disclosure practices.',
      'Always. I\'ve already contacted the vendor.',
    ];

    for (let i = 0; i < msgTexts.length; i++) {
      await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content)
         VALUES ($1, $2, $3)`,
        [convId, userIds[i % 5], msgTexts[i]]
      );
    }

    // Set some users online
    await pool.query(`UPDATE users SET is_online = true WHERE username IN ('ghost_protocol', 'cipher_zero', 'null_byte')`);

    // Notifications
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'system', 'Welcome to BlackNet!', 'Your account has been created successfully. Explore the platform!', '/')`,
      [adminId]
    );

    console.log('Seed completed successfully!');
    console.log('---');
    console.log('Admin login: admin / Admin123!');
    console.log('Demo users: ghost_protocol, cipher_zero, null_byte, root_access, neon_shade, phantom_link, dark_signal, byte_shifter');
    console.log('Demo password: Demo1234!');
    console.log('Community invite code: BLACKNET2026');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
