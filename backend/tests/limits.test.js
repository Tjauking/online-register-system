// Startup guards, rate limiting and the AI-disabled path, each on its own server instance.
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, client, mongoAvailable } = require('./helpers');

describe('limits and configuration', { concurrency: false }, async () => {
  if (!(await mongoAvailable())) {
    it('MongoDB is required for these tests', { skip: 'MongoDB not reachable on localhost:27017' }, () => {});
    return;
  }

  let srv, api, token;

  before(async () => {
    srv = await startServer({ AUTH_RATE_LIMIT: '4', NVIDIA_API_KEY: '' });
    api = client(srv.url);
  });
  after(async () => srv?.stop());

  it('refuses to start with a weak JWT secret', async () => {
    await assert.rejects(startServer({ JWT_SECRET: 'short' }), /JWT_SECRET must be set/);
  });

  it('rate limits sign-in attempts', async () => {
    const reg = await api.post('/api/auth/register', { body: { name: 'R', email: 'r@test.dev', phone: '1', password: 'password123' } });
    token = reg.body.token;
    const statuses = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await api.post('/api/auth/login', { body: { email: 'r@test.dev', password: 'wrong-pass' } })).status);
    }
    assert.deepEqual(statuses, [401, 401, 401, 401, 429]);
    const limited = await api.post('/api/auth/login', { body: { email: 'r@test.dev', password: 'password123' } });
    assert.equal(limited.status, 429, 'even correct passwords wait out the window');
    assert.match(limited.body.message, /Too many attempts/);
    assert.ok(limited.headers.get('ratelimit'));
  });

  it('reports AI as disabled and fails AI calls cleanly without a key', async () => {
    assert.deepEqual((await api.get('/api/ai/status', { token })).body, { enabled: false, model: null });
    const r = await api.post('/api/ai/triage', { token, body: { description: 'The Wi-Fi has been down since this morning.' } });
    assert.equal(r.status, 503);
    assert.equal(r.body.code, 'AI_DISABLED');
  });
});
