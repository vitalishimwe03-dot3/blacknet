process.env.LOAD_PGMEM = 'true';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3999;

function makeRequest(method, pathStr, body, cookies) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: 'localhost',
      port: PORT,
      path: pathStr,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { Cookie: cookies.join('; ') } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let resp = '';
      res.on('data', (d) => resp += d);
      res.on('end', () => {
        const setCookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]);
        let parsed = null;
        try { parsed = JSON.parse(resp); } catch { parsed = resp; }
        resolve({ status: res.statusCode, body: parsed, cookies: setCookies });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function waitForServer(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await makeRequest('GET', '/api/auth/me', null, null);
      if (r.status === 401 || r.status === 200) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function runTests() {
  const TODO = '\x1b[33m';
  const PASS = '\x1b[32m';
  const FAIL = '\x1b[31m';
  const RESET = '\x1b[0m';
  let passed = 0, failed = 0;

  function check(name, cond) {
    if (cond) { passed++; console.log(`${PASS}[PASS]${RESET} ${name}`); }
    else { failed++; console.log(`${FAIL}[FAIL]${RESET} ${name}`); }
  }

  // --- Authentication ---
  const reg = await makeRequest('POST', '/api/auth/register', {
    username: 'tester01', email: 'tester01@blacknet.local',
    password: 'TestPass123!', displayName: 'Test User'
  });
  check('register creates user', reg.status === 201);
  const testCookies = reg.cookies.length ? reg.cookies : ['connect.sid=' + extractSid(reg.body)];
  function extractSid(body) { return ''; }

  const me = await makeRequest('GET', '/api/auth/me', null, testCookies);
  check('me returns user', me.status === 200 && me.body.user.username === 'tester01');

  const badLogin = await makeRequest('POST', '/api/auth/login', { login: 'tester01', password: 'wrongpass' });
  check('login rejects bad password', badLogin.status === 401);

  const login = await makeRequest('POST', '/api/auth/login', { login: 'tester01', password: 'TestPass123!' });
  check('login succeeds', login.status === 200);
  const cookies = login.cookies.length ? login.cookies : testCookies;

  // --- Users ---
  const search = await makeRequest('GET', '/api/users/search?q=tester01', null, cookies);
  check('user search works', search.status === 200 && search.body.users.length >= 1);

  const online = await makeRequest('GET', '/api/users/online', null, cookies);
  check('online users endpoint works', online.status === 200);

  // --- Channels ---
  const ch = await makeRequest('POST', '/api/channels', { name: '#test-channel', description: 'Test channel', topic: 'Testing', isPublic: true }, cookies);
  check('create channel', ch.status === 201);
  const channelId = ch.body.channel.id;

  const channels = await makeRequest('GET', '/api/channels', null, cookies);
  check('list channels', channels.status === 200 && channels.body.channels.length >= 1);

  const join = await makeRequest('POST', `/api/channels/${channelId}/join`, null, cookies);
  check('join channel', join.status === 200);

  const chMsg = await makeRequest('POST', `/api/channels/${channelId}/messages`, { content: 'hello from test' }, cookies);
  check('send channel message', chMsg.status === 201);

  const cmd = await makeRequest('POST', `/api/channels/${channelId}/messages`, { command: '/help' }, cookies);
  check('channel command /help', cmd.status === 200 && cmd.body.type === 'help');

  const msgs = await makeRequest('GET', `/api/channels/${channelId}/messages`, null, cookies);
  check('fetch channel messages', msgs.status === 200 && msgs.body.messages.length >= 2);

  const leave = await makeRequest('POST', `/api/channels/${channelId}/leave`, null, cookies);
  check('leave channel', leave.status === 200);

  // --- Messages / DMs ---
  const conv = await makeRequest('POST', '/api/messages', { type: 'group', name: 'Test Group', memberIds: [me.body.user.id] }, cookies);
  check('create conversation', conv.status === 201);
  const convId = conv.body.conversation.id;

  const sendMsg = await makeRequest('POST', `/api/messages/${convId}`, { content: 'secure message test' }, cookies);
  check('send DM message', sendMsg.status === 201);

  const getMsgs = await makeRequest('GET', `/api/messages/${convId}`, null, cookies);
  check('fetch conversation messages', getMsgs.status === 200 && getMsgs.body.messages.length >= 1);

  const conversations = await makeRequest('GET', '/api/messages', null, cookies);
  check('list conversations', conversations.status === 200);

  const msgId = getMsgs.body?.messages?.[0]?.id;
  if (msgId) {
    const edit = await makeRequest('PUT', `/api/messages/message/${msgId}`, { content: 'edited message' }, cookies);
    check('edit message', edit.status === 200);
    const del = await makeRequest('DELETE', `/api/messages/message/${msgId}`, null, cookies);
    check('delete message', del.status === 200);
  } else {
    check('edit message', false);
    check('delete message', false);
  }

  const searchMsg = await makeRequest('GET', '/api/messages/search?q=secure', null, cookies);
  check('search messages', searchMsg.status === 200);

  // --- Forums ---
  const forum = await makeRequest('POST', '/api/forums', { name: 'Test Forum', description: 'test forum', categories: [{ name: 'General', description: '' }] }, cookies);
  check('create forum', forum.status === 201);

  const forums = await makeRequest('GET', '/api/forums', null, cookies);
  check('list forums', forums.status === 200 && forums.body.forums.length >= 1);

  const forumSlug = forums.body.forums[0].slug;
  const fDetail = await makeRequest('GET', `/api/forums/${forumSlug}`, null, cookies);
  check('forum detail', fDetail.status === 200 && fDetail.body.forum.categories.length >= 1);
  const catId = fDetail.body.forum.categories[0].id;

  const thread = await makeRequest('POST', '/api/forums/thread', { categoryId: catId, title: 'Test Thread', content: 'thread body' }, cookies);
  check('create forum thread', thread.status === 201);
  const threadId = thread.body.thread.id;

  const threads = await makeRequest('GET', `/api/forums/category/${catId}/threads`, null, cookies);
  check('list threads', threads.status === 200 && threads.body.threads.length >= 1);

  const tDetail = await makeRequest('GET', `/api/forums/thread/${threadId}`, null, cookies);
  check('thread detail with posts', tDetail.status === 200 && tDetail.body.posts.length === 1);

  const post = await makeRequest('POST', `/api/forums/thread/${threadId}/post`, { content: 'reply post' }, cookies);
  check('create forum reply', post.status === 201);

  // --- Communities ---
  const comm = await makeRequest('POST', '/api/communities', { name: 'Test Community', description: 'test', isPublic: true, requiresInvite: false }, cookies);
  check('create community', comm.status === 201);
  const commId = comm.body.community.id;

  const comms = await makeRequest('GET', '/api/communities', null, cookies);
  check('list communities', comms.status === 200);

  const myComms = await makeRequest('GET', '/api/communities/my', null, cookies);
  check('my communities', myComms.status === 200);

  const invite = await makeRequest('POST', `/api/communities/${commId}/invite`, { maxUses: 5 }, cookies);
  check('generate invite', invite.status === 201);
  const inviteCode = invite.body.invite.code;

  const joinInvite = await makeRequest('GET', `/api/communities/invite/${inviteCode}`, null, cookies);
  check('join by invite code', joinInvite.status === 200);

  // --- Reports ---
  const report = await makeRequest('POST', '/api/reports', { reportedUserId: me.body.user.id, targetType: 'message', targetId: msgId, reason: 'spam', description: 'test report' }, cookies);
  check('submit report', report.status === 201);

  const myReports = await makeRequest('GET', '/api/reports', null, cookies);
  check('list my reports', myReports.status === 200 && myReports.body.reports.length >= 1);

  // --- Notifications ---
  const notifs = await makeRequest('GET', '/api/notifications', null, cookies);
  check('fetch notifications', notifs.status === 200);

  const count = await makeRequest('GET', '/api/notifications/unread-count', null, cookies);
  check('notification unread count', count.status === 200);

  // --- Dashboard ---
  const dash = await makeRequest('GET', '/api/dashboard/stats', null, cookies);
  check('dashboard stats', dash.status === 200 && typeof dash.body.stats.onlineUsers === 'number');

  // --- Chat Rooms (anonymous) ---
  const room = await makeRequest('POST', '/api/chat-rooms', { name: 'Test Chat Room', description: 'anon room' }, cookies);
  check('create chat room', room.status === 201);
  const roomId = room.body.room.id;

  const rooms = await makeRequest('GET', '/api/chat-rooms', null, cookies);
  check('list chat rooms', rooms.status === 200 && rooms.body.rooms.some(r => r.id === roomId));

  const roomMsgs = await makeRequest('GET', `/api/chat-rooms/${roomId}/messages`, null, cookies);
  check('fetch chat room messages (auto-join)', roomMsgs.status === 200);

  const roomMsg = await makeRequest('POST', `/api/chat-rooms/${roomId}/messages`, { content: 'anon hello' }, cookies);
  check('send chat room message', roomMsg.status === 201 && roomMsg.body.message.type === 'user');

  const sentMsgs = await makeRequest('GET', `/api/chat-rooms/${roomId}/messages`, null, cookies);
  check('chat room stores message', sentMsgs.status === 200 && sentMsgs.body.messages.length >= 1);

  const leaveRoom = await makeRequest('POST', `/api/chat-rooms/${roomId}/leave`, null, cookies);
  check('leave chat room', leaveRoom.status === 200);

  // --- Logout ---
  const logout = await makeRequest('POST', '/api/auth/logout', null, cookies);
  check('logout works', logout.status === 200);

  console.log(`\n${PASS}${passed} passed${RESET}, ${FAIL}${failed} failed${RESET}, ${passed + failed} total`);
  process.exitCode = failed > 0 ? 1 : 0;
}

async function main() {
  console.log('Starting in-memory PostgreSQL (pg-mem)...');

  const serverChild = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..', 'server'),
    env: { ...process.env, PORT: String(PORT), LOAD_PGMEM: 'true' },
    stdio: 'inherit'
  });

  const ready = await waitForServer();
  if (!ready) {
    console.error('Server did not start in time.');
    serverChild.kill();
    process.exit(1);
  }

  await runTests();
  serverChild.kill();
  process.exit(process.exitCode || 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});