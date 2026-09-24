// End-to-end tests for every HTTP route, socket event and role-based flow.
// Requires MongoDB (docker run -d -p 27017:27017 mongo:7). Run with: npm test
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, startMockAi, client, connectSocket, nextEvent, complaintForm, mongoAvailable, sleep, CODES } = require('./helpers');

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4a50000000049454e44ae426082', 'hex');

describe('API, sockets and flows', { concurrency: false }, async () => {
  if (!(await mongoAvailable())) {
    it('MongoDB is required for these tests', { skip: 'MongoDB not reachable on localhost:27017' }, () => {});
    return;
  }

  let srv, ai, api;
  const t = {}; // tokens
  const id = {}; // ids
  const sockets = [];

  const register = async (name, email, extra = {}) => {
    const r = await api.post('/api/auth/register', { body: { name, email, phone: '0770000000', password: 'password123', ...extra } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return r.body;
  };
  const sock = async (token) => {
    const s = await connectSocket(srv.url, token);
    sockets.push(s);
    return s;
  };
  const newComplaint = async (token, fields = {}, file) => {
    const r = await api.post('/api/complaints', {
      token,
      form: complaintForm({ title: 'Wi-Fi drops every evening', description: 'Connection drops at 8pm daily in room 204.', category: 'Network Issue', priority: 'High', ...fields }, file)
    });
    return r;
  };

  before(async () => {
    ai = await startMockAi();
    srv = await startServer({ NVIDIA_API_KEY: 'test-nvidia-key', NVIDIA_BASE_URL: ai.url, NVIDIA_MODEL: 'test/model' });
    api = client(srv.url);
  });

  after(async () => {
    sockets.forEach((s) => s.close());
    await srv?.stop();
    await ai?.stop();
  });

  // ------------------------------------------------------------------ infrastructure
  describe('infrastructure', () => {
    it('health check responds', async () => {
      const r = await api.get('/api/health');
      assert.equal(r.status, 200);
      assert.deepEqual(r.body, { status: 'ok' });
    });

    it('sets security headers', async () => {
      const r = await api.get('/api/health');
      assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
      assert.ok(r.headers.get('content-security-policy'));
      assert.equal(r.headers.get('x-powered-by'), null);
    });

    it('allows the configured origin and no other', async () => {
      const ok = await api.get('/api/health', { headers: { Origin: 'http://allowed.test' } });
      assert.equal(ok.headers.get('access-control-allow-origin'), 'http://allowed.test');
      const bad = await api.get('/api/health', { headers: { Origin: 'http://evil.test' } });
      assert.equal(bad.headers.get('access-control-allow-origin'), null);
    });

    it('returns JSON 400 for malformed JSON', async () => {
      const r = await api.post('/api/auth/login', { body: '{"email": ' });
      assert.equal(r.status, 400);
      assert.ok(r.body.message);
    });

    it('rejects oversized JSON bodies', async () => {
      const r = await api.post('/api/auth/login', { body: { email: 'a@b.co', password: 'x'.repeat(200_000) } });
      assert.equal(r.status, 413);
    });

    it('does not serve the upload folder publicly', async () => {
      assert.equal((await api.get('/uploads/anything.png')).status, 404);
    });

    it('404s unknown routes', async () => {
      assert.equal((await api.get('/api/nope')).status, 404);
    });
  });

  // ------------------------------------------------------------------ auth
  describe('auth', () => {
    it('registers a user and never returns the password', async () => {
      const body = await register('Una User', 'user@test.dev');
      assert.equal(body.user.role, 'USER');
      assert.ok(body.token);
      assert.equal(body.user.password, undefined);
      t.user = body.token;
      id.user = body.user.id;
    });

    it('validates registration input', async () => {
      const base = { name: 'X', email: 'x@test.dev', phone: '1', password: 'password123' };
      const cases = [
        [{ ...base, password: 'short' }, /at least 8/],
        [{ ...base, email: 'not-an-email' }, /valid email/],
        [{ ...base, name: '' }, /required/],
        [{ ...base, email: { $gt: '' } }, /required/],
        [{ ...base, email: 'user@test.dev' }, /already registered/]
      ];
      for (const [body, msg] of cases) {
        const r = await api.post('/api/auth/register', { body });
        assert.equal(r.status, 400, JSON.stringify(body));
        assert.match(r.body.message, msg);
      }
    });

    it('ignores unknown roles', async () => {
      const r = await register('Role Spoof', 'spoof@test.dev', { role: 'SUPERUSER' });
      assert.equal(r.user.role, 'USER');
    });

    it('requires the right code for agents and admins', async () => {
      for (const role of ['AGENT', 'ADMIN']) {
        for (const signupCode of [undefined, 'wrong']) {
          const r = await api.post('/api/auth/register', { body: { name: 'N', email: `${role}${signupCode}@test.dev`, phone: '1', password: 'password123', role, signupCode } });
          assert.equal(r.status, 403);
        }
      }
      const agent = await register('Ada Agent', 'agent@test.dev', { role: 'AGENT', signupCode: CODES.agent });
      const agent2 = await register('Ben Agent', 'agent2@test.dev', { role: 'AGENT', signupCode: CODES.agent });
      const admin = await register('Ann Admin', 'admin@test.dev', { role: 'ADMIN', signupCode: CODES.admin });
      Object.assign(t, { agent: agent.token, agent2: agent2.token, admin: admin.token });
      Object.assign(id, { agent: agent.user.id, agent2: agent2.user.id, admin: admin.user.id });
      assert.equal(agent.user.role, 'AGENT');
      assert.equal(admin.user.role, 'ADMIN');
    });

    it('caps the number of admins', async () => {
      await register('Second Admin', 'admin2@test.dev', { role: 'ADMIN', signupCode: CODES.admin });
      const r = await api.post('/api/auth/register', { body: { name: 'Third', email: 'admin3@test.dev', phone: '1', password: 'password123', role: 'ADMIN', signupCode: CODES.admin } });
      assert.equal(r.status, 403);
      assert.match(r.body.message, /Maximum/);
    });

    it('logs in, case-insensitively, with a generic error on failure', async () => {
      const ok = await api.post('/api/auth/login', { body: { email: 'USER@test.dev', password: 'password123' } });
      assert.equal(ok.status, 200);
      const wrong = await api.post('/api/auth/login', { body: { email: 'user@test.dev', password: 'nope-nope' } });
      const unknown = await api.post('/api/auth/login', { body: { email: 'ghost@test.dev', password: 'password123' } });
      assert.equal(wrong.status, 401);
      assert.equal(unknown.status, 401);
      assert.equal(wrong.body.message, unknown.body.message);
      const injection = await api.post('/api/auth/login', { body: { email: { $ne: null }, password: 'x' } });
      assert.equal(injection.status, 400);
    });

    it('protects /me', async () => {
      assert.equal((await api.get('/api/auth/me')).status, 401);
      assert.equal((await api.get('/api/auth/me', { token: 'garbage' })).status, 401);
      const r = await api.get('/api/auth/me', { token: t.user });
      assert.equal(r.status, 200);
      assert.equal(r.body.user.email, 'user@test.dev');
      assert.equal(r.body.user.password, undefined);
    });

    it('updates the profile', async () => {
      assert.equal((await api.put('/api/auth/me', { token: t.user, body: { name: '', phone: '1' } })).status, 400);
      const r = await api.put('/api/auth/me', { token: t.user, body: { name: 'Una Updated', phone: '0771234567', role: 'ADMIN' } });
      assert.equal(r.status, 200);
      assert.equal(r.body.user.name, 'Una Updated');
      assert.equal(r.body.user.role, 'USER', 'role must not be changeable');
    });

    it('changes the password only with the current one', async () => {
      assert.equal((await api.put('/api/auth/password', { token: t.user, body: { currentPassword: 'wrong-pass', newPassword: 'newpassword1' } })).status, 400);
      assert.equal((await api.put('/api/auth/password', { token: t.user, body: { currentPassword: 'password123', newPassword: 'short' } })).status, 400);
      assert.equal((await api.put('/api/auth/password', { token: t.user, body: { currentPassword: 'password123', newPassword: 'newpassword1' } })).status, 200);
      assert.equal((await api.post('/api/auth/login', { body: { email: 'user@test.dev', password: 'password123' } })).status, 401);
      assert.equal((await api.post('/api/auth/login', { body: { email: 'user@test.dev', password: 'newpassword1' } })).status, 200);
    });

    it('registers a second user for access checks', async () => {
      const other = await register('Otto Other', 'other@test.dev');
      t.other = other.token;
      id.other = other.user.id;
    });
  });

  // ------------------------------------------------------------------ complaints
  describe('complaints', () => {
    it('requires auth and the USER role to create', async () => {
      assert.equal((await newComplaint(undefined)).status, 401);
      assert.equal((await newComplaint(t.agent)).status, 403);
      assert.equal((await newComplaint(t.admin)).status, 403);
    });

    it('validates complaint input', async () => {
      assert.equal((await newComplaint(t.user, { title: '' })).status, 400);
      assert.equal((await newComplaint(t.user, { category: 'Made Up' })).status, 400);
      assert.equal((await newComplaint(t.user, { title: 'x'.repeat(121) })).status, 400);
      assert.equal((await newComplaint(t.user, { description: 'x'.repeat(2001) })).status, 400);
    });

    it('validates attachments', async () => {
      const exe = await newComplaint(t.user, {}, { name: 'virus.exe', type: 'application/octet-stream', content: Buffer.from('MZ') });
      assert.equal(exe.status, 400);
      const disguised = await newComplaint(t.user, {}, { name: 'fake.png', type: 'text/html', content: Buffer.from('<script>') });
      assert.equal(disguised.status, 400);
      const huge = await newComplaint(t.user, {}, { name: 'big.pdf', type: 'application/pdf', content: Buffer.alloc(5 * 1024 * 1024 + 10) });
      assert.equal(huge.status, 400);
      assert.match(huge.body.message, /5MB/);
    });

    it('creates a complaint with an attachment', async () => {
      const r = await newComplaint(t.user, {}, { name: 'screen.png', type: 'image/png', content: PNG });
      assert.equal(r.status, 201);
      assert.equal(r.body.complaint.status, 'Pending');
      assert.equal(r.body.complaint.statusHistory.length, 1);
      id.c1 = r.body.complaint._id;
      const second = await newComplaint(t.user, { title: 'Water pressure low', category: 'Water Issue', priority: 'Low' });
      id.c2 = second.body.complaint._id;
    });

    it('lists only your own complaints', async () => {
      const mine = await api.get('/api/complaints/mine', { token: t.user });
      assert.equal(mine.body.complaints.length, 2);
      const others = await api.get('/api/complaints/mine', { token: t.other });
      assert.equal(others.body.complaints.length, 0);
      assert.equal((await api.get('/api/complaints/mine', { token: t.agent })).status, 403);
    });

    it('restricts the all-complaints list to admins and blocks operator injection', async () => {
      assert.equal((await api.get('/api/complaints', { token: t.user })).status, 403);
      assert.equal((await api.get('/api/complaints', { token: t.agent })).status, 403);
      const all = await api.get('/api/complaints', { token: t.admin });
      assert.equal(all.body.complaints.length, 2);
      const inj = await api.get('/api/complaints?status[$ne]=zzz', { token: t.admin });
      assert.equal(inj.body.complaints.length, 0);
      const filtered = await api.get('/api/complaints?status=Pending&category=Water%20Issue', { token: t.admin });
      assert.equal(filtered.body.complaints.length, 1);
    });

    it('enforces who can open a complaint', async () => {
      assert.equal((await api.get(`/api/complaints/${id.c1}`, { token: t.user })).status, 200);
      assert.equal((await api.get(`/api/complaints/${id.c1}`, { token: t.admin })).status, 200);
      assert.equal((await api.get(`/api/complaints/${id.c1}`, { token: t.other })).status, 403);
      assert.equal((await api.get(`/api/complaints/${id.c1}`, { token: t.agent })).status, 403, 'unassigned agent');
      assert.equal((await api.get('/api/complaints/not-an-id', { token: t.admin })).status, 404);
      assert.equal((await api.get('/api/complaints/0123456789abcdef01234567', { token: t.admin })).status, 404);
    });

    it('serves attachments only to people with access', async () => {
      const own = await api.get(`/api/complaints/${id.c1}/attachment`, { token: t.user });
      assert.equal(own.status, 200);
      assert.ok(Buffer.compare(own.body, PNG) === 0);
      assert.equal((await api.get(`/api/complaints/${id.c1}/attachment`, { token: t.other })).status, 403);
      assert.equal((await api.get(`/api/complaints/${id.c1}/attachment`)).status, 401);
      assert.equal((await api.get(`/api/complaints/${id.c2}/attachment`, { token: t.user })).status, 404);
    });

    it('shows open unassigned complaints in the agent pool', async () => {
      const pool = await api.get('/api/complaints/unassigned', { token: t.agent });
      assert.equal(pool.body.complaints.length, 2);
      assert.equal((await api.get('/api/complaints/unassigned', { token: t.user })).status, 403);
    });

    it('lets exactly one agent take a complaint, even concurrently', async () => {
      const [a, b] = await Promise.all([
        api.put(`/api/complaints/${id.c1}/take`, { token: t.agent }),
        api.put(`/api/complaints/${id.c1}/take`, { token: t.agent2 })
      ]);
      assert.deepEqual([a.status, b.status].sort(), [200, 400]);
      // make sure agent (not agent2) owns c1 for the rest of the suite
      const winner = a.status === 200 ? 'agent' : 'agent2';
      if (winner === 'agent2') {
        await api.put(`/api/complaints/${id.c1}/assign`, { token: t.admin, body: { agentId: id.agent } });
      }
      assert.equal((await api.put(`/api/complaints/${id.c1}/take`, { token: t.agent2 })).status, 400);
      assert.equal((await api.put('/api/complaints/0123456789abcdef01234567/take', { token: t.agent })).status, 404);
      assert.equal((await api.put(`/api/complaints/${id.c2}/take`, { token: t.user })).status, 403);
    });

    it('gives the assigned agent access and lists it as theirs', async () => {
      const mine = await api.get('/api/complaints/assigned', { token: t.agent });
      assert.ok(mine.body.complaints.some((c) => c._id === id.c1));
      assert.equal((await api.get(`/api/complaints/${id.c1}`, { token: t.agent })).status, 200);
      assert.equal((await api.get(`/api/complaints/${id.c1}`, { token: t.agent2 })).status, 403);
    });

    it('lets only the assigned agent or an admin change status', async () => {
      assert.equal((await api.put(`/api/complaints/${id.c1}/status`, { token: t.agent2, body: { status: 'In Progress' } })).status, 403);
      assert.equal((await api.put(`/api/complaints/${id.c1}/status`, { token: t.user, body: { status: 'Resolved' } })).status, 403);
      assert.equal((await api.put(`/api/complaints/${id.c1}/status`, { token: t.agent, body: { status: 'Done' } })).status, 400);
      const r = await api.put(`/api/complaints/${id.c1}/status`, { token: t.agent, body: { status: 'In Progress' } });
      assert.equal(r.status, 200);
      assert.equal(r.body.complaint.status, 'In Progress');
    });

    it('records who made each change', async () => {
      const r = await api.get(`/api/complaints/${id.c1}`, { token: t.user });
      const last = r.body.complaint.statusHistory.at(-1);
      assert.equal(last.status, 'In Progress');
      assert.equal(last.changedBy.name, 'Ada Agent');
      assert.equal(last.changedBy.password, undefined);
    });

    it('lets admins assign only active agents', async () => {
      assert.equal((await api.put(`/api/complaints/${id.c2}/assign`, { token: t.agent, body: { agentId: id.agent2 } })).status, 403);
      assert.equal((await api.put(`/api/complaints/${id.c2}/assign`, { token: t.admin, body: { agentId: id.user } })).status, 400);
      assert.equal((await api.put(`/api/complaints/${id.c2}/assign`, { token: t.admin, body: { agentId: 'bad' } })).status, 400);
      const r = await api.put(`/api/complaints/${id.c2}/assign`, { token: t.admin, body: { agentId: id.agent2 } });
      assert.equal(r.status, 200);
      assert.equal(r.body.complaint.agentId, id.agent2);
      assert.equal(r.body.complaint.statusHistory.at(-1).note, 'Assigned to Ben Agent');
    });
  });

  // ------------------------------------------------------------------ chat & sockets
  describe('chat and sockets', () => {
    it('rejects sockets without a valid token', async () => {
      await assert.rejects(connectSocket(srv.url), /Authentication required/);
      await assert.rejects(connectSocket(srv.url, 'nope'), /Invalid token/);
    });

    it('blocks outsiders from joining or posting', async () => {
      const outsider = await sock(t.other);
      outsider.emit('join_complaint', id.c1);
      assert.equal((await nextEvent(outsider, 'chat_error')).message, 'Access denied');
      outsider.emit('send_message', { complaintId: id.c1, message: 'hi', senderRole: 'ADMIN' });
      assert.equal((await nextEvent(outsider, 'chat_error')).message, 'Access denied');
      outsider.emit('join_complaint', 'not-an-id');
      assert.equal((await nextEvent(outsider, 'chat_error')).message, 'Access denied');
    });

    it('delivers messages live with the role taken from the database', async () => {
      const user = await sock(t.user);
      const agent = await sock(t.agent);
      user.emit('join_complaint', id.c1);
      agent.emit('join_complaint', id.c1);
      await sleep(150);

      const notification = nextEvent(agent, 'notification');
      const received = nextEvent(agent, 'receive_message');
      user.emit('send_message', { complaintId: id.c1, message: '  It dropped again last night  ', senderRole: 'ADMIN' });
      const msg = await received;
      assert.equal(msg.message, 'It dropped again last night');
      assert.equal(msg.senderRole, 'USER');
      const note = await notification;
      assert.equal(note.type, 'message');
      assert.match(note.title, /Una Updated/);

      const back = nextEvent(user, 'receive_message');
      agent.emit('send_message', { complaintId: id.c1, message: 'Replacing the access point today.' });
      assert.equal((await back).senderRole, 'AGENT');
    });

    it('ignores empty messages and rejects oversized ones', async () => {
      const user = await sock(t.user);
      user.emit('join_complaint', id.c1);
      await sleep(100);
      user.emit('send_message', { complaintId: id.c1, message: '   ' });
      assert.equal(await nextEvent(user, 'receive_message', 500), null);
      user.emit('send_message', { complaintId: id.c1, message: 'x'.repeat(2001) });
      assert.match((await nextEvent(user, 'chat_error')).message, /too long/);
      user.emit('send_message', null);
      assert.equal(await nextEvent(user, 'receive_message', 300), null);
    });

    it('returns chat history only to people with access', async () => {
      const r = await api.get(`/api/chat/${id.c1}`, { token: t.user });
      assert.equal(r.status, 200);
      assert.equal(r.body.messages.length, 2);
      assert.equal((await api.get(`/api/chat/${id.c1}`, { token: t.other })).status, 403);
      assert.equal((await api.get(`/api/chat/${id.c1}`, { token: t.agent2 })).status, 403);
      assert.equal((await api.get(`/api/chat/${id.c1}`, { token: t.admin })).status, 200);
      assert.equal((await api.get('/api/chat/zzz', { token: t.admin })).status, 404);
    });

    it('pushes status-change notifications to the complaint owner', async () => {
      const user = await sock(t.user);
      const note = nextEvent(user, 'notification');
      await api.put(`/api/complaints/${id.c1}/status`, { token: t.agent, body: { status: 'Resolved' } });
      const n = await note;
      assert.equal(n.type, 'status');
      assert.equal(n.title, 'Status changed to Resolved');
    });
  });

  // ------------------------------------------------------------------ notifications
  describe('notifications', () => {
    it('lists notifications with an unread count', async () => {
      const r = await api.get('/api/notifications', { token: t.user });
      assert.equal(r.status, 200);
      const types = r.body.notifications.map((n) => n.type);
      assert.ok(types.includes('assigned'));
      assert.ok(types.includes('status'));
      assert.ok(types.includes('message'));
      assert.equal(r.body.unread, r.body.notifications.filter((n) => !n.read).length);
      id.note = r.body.notifications[0]._id;
    });

    it('collapses repeated message notifications', async () => {
      const r = await api.get('/api/notifications', { token: t.agent });
      assert.equal(r.body.notifications.filter((n) => n.type === 'message' && !n.read).length, 1);
    });

    it('does not notify people about their own actions', async () => {
      const r = await api.get('/api/notifications', { token: t.agent });
      assert.ok(!r.body.notifications.some((n) => n.type === 'status'));
    });

    it('marks one and all as read, only for the owner', async () => {
      assert.equal((await api.put(`/api/notifications/${id.note}/read`, { token: t.other })).status, 404);
      const one = await api.put(`/api/notifications/${id.note}/read`, { token: t.user });
      assert.equal(one.body.notification.read, true);
      await api.put('/api/notifications/read-all', { token: t.user });
      assert.equal((await api.get('/api/notifications', { token: t.user })).body.unread, 0);
      assert.equal((await api.get('/api/notifications')).status, 401);
    });
  });

  // ------------------------------------------------------------------ feedback & reopen
  describe('feedback and reopening', () => {
    it('validates feedback', async () => {
      assert.equal((await api.post('/api/feedback', { token: t.user, body: { complaintId: id.c2, rating: 5 } })).status, 400, 'not resolved yet');
      assert.equal((await api.post('/api/feedback', { token: t.other, body: { complaintId: id.c1, rating: 5 } })).status, 403);
      for (const rating of [0, 6, 'abc', 3.5]) {
        assert.equal((await api.post('/api/feedback', { token: t.user, body: { complaintId: id.c1, rating } })).status, 400, String(rating));
      }
      assert.equal((await api.post('/api/feedback', { token: t.user, body: { complaintId: 'bad', rating: 5 } })).status, 404);
      assert.equal((await api.post('/api/feedback', { token: t.agent, body: { complaintId: id.c1, rating: 5 } })).status, 403);
    });

    it('accepts one rating per complaint and notifies the agent', async () => {
      const agent = await sock(t.agent);
      const note = nextEvent(agent, 'notification');
      const r = await api.post('/api/feedback', { token: t.user, body: { complaintId: id.c1, rating: 4, comment: ' Quick fix ' } });
      assert.equal(r.status, 201);
      assert.equal(r.body.feedback.comment, 'Quick fix');
      assert.equal((await note).type, 'feedback');
      assert.equal((await api.post('/api/feedback', { token: t.user, body: { complaintId: id.c1, rating: 5 } })).status, 400);
    });

    it('shows feedback only to people with access', async () => {
      assert.equal((await api.get(`/api/feedback/${id.c1}`, { token: t.user })).body.feedback.rating, 4);
      assert.equal((await api.get(`/api/feedback/${id.c1}`, { token: t.other })).status, 403);
      assert.equal((await api.get('/api/feedback', { token: t.admin })).body.feedback.length, 1);
      assert.equal((await api.get('/api/feedback', { token: t.user })).status, 403);
    });

    it('lets the owner reopen a resolved complaint with a reason', async () => {
      assert.equal((await api.put(`/api/complaints/${id.c2}/reopen`, { token: t.user, body: { reason: 'x' } })).status, 400, 'not resolved');
      assert.equal((await api.put(`/api/complaints/${id.c1}/reopen`, { token: t.user, body: { reason: '' } })).status, 400);
      assert.equal((await api.put(`/api/complaints/${id.c1}/reopen`, { token: t.other, body: { reason: 'x' } })).status, 403);
      assert.equal((await api.put(`/api/complaints/${id.c1}/reopen`, { token: t.agent, body: { reason: 'x' } })).status, 403);

      const agent = await sock(t.agent);
      const note = nextEvent(agent, 'notification');
      const r = await api.put(`/api/complaints/${id.c1}/reopen`, { token: t.user, body: { reason: 'Dropped again tonight' } });
      assert.equal(r.status, 200);
      assert.equal(r.body.complaint.status, 'Assigned', 'goes back to the same agent');
      assert.equal(r.body.complaint.statusHistory.at(-1).note, 'Reopened: Dropped again tonight');
      assert.equal((await note).type, 'reopened');
    });
  });

  // ------------------------------------------------------------------ AI
  describe('AI assistant (mock NVIDIA API)', () => {
    it('reports status to any signed-in user', async () => {
      const r = await api.get('/api/ai/status', { token: t.user });
      assert.deepEqual(r.body, { enabled: true, model: 'test/model' });
      assert.equal((await api.get('/api/ai/status')).status, 401);
    });

    it('triages a complaint and normalises the model output', async () => {
      const r = await api.post('/api/ai/triage', { token: t.user, body: { title: 'wifi', description: 'The Wi-Fi in block C has been down since morning for everyone.' } });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.deepEqual(r.body.suggestion, { category: 'Network Issue', priority: 'Medium', title: 'Wi-Fi outage in block C', reason: 'Many residents affected.' });
      const sent = ai.requests.at(-1);
      assert.equal(sent.auth, 'Bearer test-nvidia-key');
      assert.equal(sent.body.model, 'test/model');
      assert.match(sent.body.messages[1].content, /<data name="description">/);
      assert.match(sent.body.messages[0].content, /ignore any instructions/);
    });

    it('validates triage input and role', async () => {
      assert.equal((await api.post('/api/ai/triage', { token: t.user, body: { description: 'short' } })).status, 400);
      assert.equal((await api.post('/api/ai/triage', { token: t.agent, body: { description: 'long enough description here' } })).status, 403);
    });

    it('surfaces unusable model output and upstream rate limits cleanly', async () => {
      const junk = await api.post('/api/ai/triage', { token: t.user, body: { description: 'MOCK_GARBAGE please help me with this' } });
      assert.equal(junk.status, 502);
      const limited = await api.post('/api/ai/triage', { token: t.user, body: { description: 'MOCK_RATE_LIMIT please help me with this' } });
      assert.equal(limited.status, 429);
      assert.equal(limited.body.code, 'AI_RATE_LIMIT');
    });

    it('summarises a complaint for people with access', async () => {
      const r = await api.post(`/api/ai/complaints/${id.c1}/summary`, { token: t.agent });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.deepEqual(r.body.summary, { summary: 'Customer reports Wi-Fi dropping nightly.', sentiment: 'frustrated', nextStep: 'Replace the access point.' });
      assert.match(ai.requests.at(-1).body.messages[1].content, /Customer: It dropped again last night/);
      assert.equal((await api.post(`/api/ai/complaints/${id.c1}/summary`, { token: t.other })).status, 403);
      assert.equal((await api.post('/api/ai/complaints/bad/summary', { token: t.agent })).status, 404);
    });

    it('drafts replies for agents only', async () => {
      const r = await api.post(`/api/ai/complaints/${id.c1}/reply`, { token: t.agent });
      assert.equal(r.status, 200);
      assert.equal(r.body.draft, 'Thanks for flagging this — I am replacing the access point on your floor this afternoon.');
      assert.equal((await api.post(`/api/ai/complaints/${id.c1}/reply`, { token: t.user })).status, 403);
      assert.equal((await api.post(`/api/ai/complaints/${id.c1}/reply`, { token: t.agent2 })).status, 403);
    });

    it('generates admin insights and caches them', async () => {
      const first = await api.get('/api/ai/insights', { token: t.admin });
      assert.equal(first.status, 200);
      assert.equal(first.body.cached, false);
      assert.ok(!first.body.insight.includes('**'), 'markdown stripped');
      const calls = ai.requests.length;
      const second = await api.get('/api/ai/insights', { token: t.admin });
      assert.equal(second.body.cached, true);
      assert.equal(ai.requests.length, calls);
      const refreshed = await api.get('/api/ai/insights?refresh=1', { token: t.admin });
      assert.equal(refreshed.body.cached, false);
      assert.equal((await api.get('/api/ai/insights', { token: t.agent })).status, 403);
    });
  });

  // ------------------------------------------------------------------ admin
  describe('admin', () => {
    it('blocks every admin route for non-admins', async () => {
      const routes = [
        ['get', '/api/admin/users'], ['get', '/api/admin/agents'], ['post', '/api/admin/agents'],
        ['put', `/api/admin/users/${id.other}/toggle-active`], ['del', `/api/admin/users/${id.other}`], ['get', '/api/admin/analytics']
      ];
      for (const token of [t.user, t.agent, undefined]) {
        for (const [m, p] of routes) {
          const r = await api[m](p, { token });
          assert.equal(r.status, token ? 403 : 401, `${m} ${p}`);
        }
      }
    });

    it('lists users and agents without passwords', async () => {
      const users = await api.get('/api/admin/users', { token: t.admin });
      assert.ok(users.body.users.length >= 3);
      assert.ok(users.body.users.every((u) => u.role === 'USER' && u.password === undefined));
      const agents = await api.get('/api/admin/agents', { token: t.admin });
      assert.equal(agents.body.agents.length, 2);
    });

    it('creates agents with validation', async () => {
      assert.equal((await api.post('/api/admin/agents', { token: t.admin, body: { name: 'A', email: 'bad', phone: '1', password: 'password123' } })).status, 400);
      assert.equal((await api.post('/api/admin/agents', { token: t.admin, body: { name: 'A', email: 'agent@test.dev', phone: '1', password: 'password123' } })).status, 400);
      const r = await api.post('/api/admin/agents', { token: t.admin, body: { name: 'Cal Agent', email: 'agent3@test.dev', phone: '1', password: 'password123' } });
      assert.equal(r.status, 201);
      id.agent3 = r.body.agent.id;
    });

    it('disables and re-enables accounts, which blocks login and sockets', async () => {
      const off = await api.put(`/api/admin/users/${id.other}/toggle-active`, { token: t.admin });
      assert.equal(off.body.user.isActive, false);
      assert.equal((await api.post('/api/auth/login', { body: { email: 'other@test.dev', password: 'password123' } })).status, 401);
      assert.equal((await api.get('/api/auth/me', { token: t.other })).status, 401);
      await assert.rejects(connectSocket(srv.url, t.other), /inactive/);
      const on = await api.put(`/api/admin/users/${id.other}/toggle-active`, { token: t.admin });
      assert.equal(on.body.user.isActive, true);
    });

    it('cannot disable or delete admins', async () => {
      assert.equal((await api.put(`/api/admin/users/${id.admin}/toggle-active`, { token: t.admin })).status, 404);
      assert.equal((await api.del(`/api/admin/users/${id.admin}`, { token: t.admin })).status, 404);
      assert.equal((await api.del('/api/admin/users/bad-id', { token: t.admin })).status, 404);
    });

    it('reports analytics', async () => {
      const r = await api.get('/api/admin/analytics', { token: t.admin });
      for (const key of ['totalComplaints', 'openComplaints', 'resolvedComplaints', 'totalUsers', 'activeAgents', 'byCategory', 'byMonth', 'agentPerformance', 'unassigned', 'highOpen', 'ratingCount', 'avgRating']) {
        assert.ok(key in r.body, key);
      }
      assert.equal(r.body.totalComplaints, 2);
      assert.equal(r.body.avgRating, 4);
      assert.ok(r.body.byMonth[0].open !== undefined);
    });

    it('returns a deleted agent’s open work to the queue and a reopened complaint goes to the queue if its agent left', async () => {
      await api.put(`/api/complaints/${id.c2}/status`, { token: t.agent2, body: { status: 'In Progress' } });
      assert.equal((await api.del(`/api/admin/users/${id.agent2}`, { token: t.admin })).status, 200);
      const c2 = await api.get(`/api/complaints/${id.c2}`, { token: t.admin });
      assert.equal(c2.body.complaint.status, 'Pending');
      assert.equal(c2.body.complaint.agentId, null);
      assert.equal((await api.get('/api/auth/me', { token: t.agent2 })).status, 401);

      // agent owning c1 is disabled; reopening must send it back to the queue
      await api.put(`/api/complaints/${id.c1}/status`, { token: t.agent, body: { status: 'Resolved' } });
      await api.put(`/api/admin/users/${id.agent}/toggle-active`, { token: t.admin });
      const reopened = await api.put(`/api/complaints/${id.c1}/reopen`, { token: t.user, body: { reason: 'Still broken' } });
      assert.equal(reopened.body.complaint.status, 'Pending');
      assert.equal(reopened.body.complaint.agentId, null);
      await api.put(`/api/admin/users/${id.agent}/toggle-active`, { token: t.admin });
    });

    it('deletes a user along with their complaints, chat, feedback, notifications and files', async () => {
      const before = (await api.get('/api/admin/analytics', { token: t.admin })).body.totalComplaints;
      const del = await api.del(`/api/admin/users/${id.user}`, { token: t.admin });
      assert.equal(del.status, 200);
      const after = (await api.get('/api/admin/analytics', { token: t.admin })).body.totalComplaints;
      assert.equal(after, before - 2);
      assert.equal((await api.get('/api/feedback', { token: t.admin })).body.feedback.length, 0);
      assert.equal((await api.get(`/api/chat/${id.c1}`, { token: t.admin })).status, 404);
      const fs = require('fs');
      assert.deepEqual(fs.readdirSync(srv.uploadDir), []);
      assert.equal((await api.get('/api/notifications', { token: t.user })).status, 401);
    });
  });
});
