# BlackNet - Secure Community & Messaging Platform

A cybersecurity-themed, legal and safe communication platform built with Vue 3, Node.js, Express, PostgreSQL, and Socket.IO.

## Features

- **Encrypted Messaging** — Direct and group conversations with message history
- **IRC-Style Channels** — Real-time channel communication with /commands
- **Private Forums** — Threaded discussions with categories, moderation
- **Communities** — Invite-only private communities
- **Anonymous Chat Rooms** — Pseudonymous conversations
- **Moderation Dashboard** — Reports, user management, audit logs
- **Cybersecurity Theme** — Dark UI with subtle hacker-inspired design

## IMPORTANT SECURITY NOTICE

BlackNet's end-to-end encryption is a **placeholder**. True E2E encryption must be implemented and independently audited before claiming messages are secure. Do not use this platform for sensitive communications until proper encryption is verified.

## Tech Stack

- **Frontend**: Vue 3, Vite, Tailwind CSS, Pinia, Vue Router, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO, PostgreSQL, Argon2
- **Security**: Helmet, CORS, rate limiting, XSS protection, CSRF protection

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Setup

### 1. Database

Create a PostgreSQL database:

```sql
CREATE DATABASE blacknet;
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Backend

```bash
cd server
npm install
npm run migrate
npm run seed
npm run dev
```

Server runs on http://localhost:3001

### 4. Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs on http://localhost:5173

### 5. Login

- **Admin**: admin / Admin123!
- **Demo users**: ghost_protocol, cipher_zero, null_byte, root_access, neon_shade, phantom_link, dark_signal, byte_shifter
- **Demo password**: Demo1234!
- **Community invite code**: BLACKNET2026

## Running Tests

No PostgreSQL install needed — the smoke test uses an in-memory PostgreSQL emulator (`pg-mem`):

```bash
cd server
node test.js
```

Expect `37 passed, 0 failed`. The seed script also runs against `pg-mem` by default when no real database is configured.

## Project Structure

```
blacknet/
├── .env.example
├── server/
│   ├── server.js              # Express + Socket.IO server
│   ├── config/
│   │   ├── db.js              # PostgreSQL pool
│   │   └── migrate.js         # Database schema/migration
│   ├── controllers/           # Route handlers
│   │   ├── authController.js  # Register, login, logout
│   │   ├── userController.js  # Profiles, search, blocking
│   │   ├── messageController.js # DMs and group messages
│   │   ├── forumController.js # Forums, threads, posts
│   │   ├── channelController.js # IRC channels, commands
│   │   └── communityController.js # Communities, invites
│   ├── middleware/
│   │   └── auth.js            # Auth and role middleware
│   ├── models/                # (Extensible for future ORM)
│   ├── routes/                # API routes
│   ├── seeds/
│   │   └── seed.js            # Demo data seeder
│   └── utils/
│       └── socket.js          # Socket.IO event handlers
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── style.css           # Theme, animations, components
│       ├── router/index.js
│       ├── stores/             # Pinia stores
│       │   ├── auth.js
│       │   ├── messages.js
│       │   └── notifications.js
│       ├── utils/
│       │   ├── api.js          # Axios instance
│       │   ├── socket.js       # Socket.IO client
│       │   └── helpers.js      # Formatting utilities
│       └── views/              # Page components
│           ├── LoginView.vue
│           ├── RegisterView.vue
│           ├── DashboardLayout.vue
│           ├── DashboardView.vue
│           ├── MessagesView.vue
│           ├── ChannelsView.vue
│           ├── ChannelView.vue
│           ├── ForumsView.vue
│           ├── ForumDetailView.vue
│           ├── ThreadView.vue
│           ├── CommunitiesView.vue
│           ├── CommunityDetailView.vue
│           ├── ChatRoomsView.vue
│           ├── SettingsView.vue
│           └── ModerationView.vue
```

## Safety

BlackNet prohibits and will never host:
- Stolen data or credential marketplaces
- Malware distribution or phishing
- Weapons, drugs, or illegal goods
- Hacking-for-hire services
- Instructions for committing cybercrime

All users must comply with applicable laws. Abuse reporting and moderation tools are built in.

## Development

### Running in VS Code

1. Open the `blacknet` folder in VS Code
2. Use the integrated terminal for `cd server && npm run dev` and `cd client && npm run dev`
3. Install recommended extensions: Volar, ESLint, Prettier

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| GET | /api/messages | List conversations |
| POST | /api/messages | Create conversation |
| GET | /api/messages/:id | Get messages |
| POST | /api/messages/:id | Send message |
| GET | /api/channels | List channels |
| POST | /api/channels | Create channel |
| POST | /api/channels/:id/join | Join channel |
| POST | /api/channels/:id/messages | Send channel message |
| GET | /api/forums | List forums |
| GET | /api/forums/:slug | Forum detail |
| POST | /api/forums/thread | Create thread |
| GET | /api/communities | List communities |
| GET | /api/communities/my | My communities |
| POST | /api/communities | Create community |
| GET | /api/moderation/stats | Dashboard stats |
| GET | /api/moderation/reports | All reports |
| PUT | /api/moderation/reports/:id | Update report |
| GET | /api/moderation/audit | Audit logs |
