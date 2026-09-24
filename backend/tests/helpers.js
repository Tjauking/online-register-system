// Test harness: boots real server instances against a throwaway MongoDB database,
// a temporary upload folder and a local mock of the NVIDIA chat completions API.
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const mongoose = require('mongoose');
const { io } = require('socket.io-client');

const BACKEND = path.join(__dirname, '..');
const MONGO = process.env.TEST_MONGO_URL || 'mongodb://localhost:27017';
const CODES = { agent: 'agent-code-test', admin: 'admin-code-test' };

const freePort = () => new Promise((resolve, reject) => {
  const srv = net.createServer();
  srv.unref();
  srv.on('error', reject);
  srv.listen(0, () => {
    const { port } = srv.address();
    srv.close(() => resolve(port));
  });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- mock NVIDIA API ----------
// Answers by looking at the system prompt, and records every request for assertions.
async function startMockAi() {
  const requests = []
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const body = JSON.parse(raw || '{}');
      requests.push({ url: req.url, auth: req.headers.authorization, body });
      if (req.headers.authorization !== 'Bearer test-nvidia-key') {
        res.writeHead(401).end('{}');
        return;
      }
      const system = body.messages?.[0]?.content || '';
      const user = body.messages?.[1]?.content || '';
      let content;
      if (user.includes('MOCK_GARBAGE')) content = 'Sorry, I cannot help with that.';
      else if (user.includes('MOCK_RATE_LIMIT')) { res.writeHead(429).end('{}'); return; }
      else if (system.includes('You triage complaints')) {
        // Deliberately messy: wrong casing, an invalid priority, prose around the JSON
        content = 'Here you go:\n{"category": "network issue", "priority": "URGENT!!", "title": "Wi-Fi outage in block C", "reason": "Many residents affected."}';
      } else if (system.includes('You summarise customer complaints')) {
        content = '<think>internal reasoning</think>```json\n{"summary": "Customer reports Wi-Fi dropping nightly.", "sentiment": "Frustrated", "nextStep": "Replace the access point."}\n```';
      } else if (system.includes('You draft replies')) {
        content = '"Thanks for flagging this — I am replacing the access point on your floor this afternoon."';
      } else if (system.includes('operations analyst')) {
        content = '**Network issues** lead this week. Two complaints are unassigned. Recommend assigning them today.';
      } else content = 'ok';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }));
    });
  });
  const port = await freePort();
  await new Promise((r) => server.listen(port, r));
  return { url: `http://127.0.0.1:${port}/v1`, requests, stop: () => new Promise((r) => server.close(r)) };
}

// ---------- app server ----------
async function startServer(env = {}) {
  const port = await freePort();
  const dbName = `ors_test_${process.pid}_${Date.now()}`;
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ors-uploads-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND,
    env: {
      PATH: process.env.PATH,
      PORT: String(port),
      MONGO_URI: `${MONGO}/${dbName}`,
      JWT_SECRET: 'test-secret-'.padEnd(48, 'x'),
      JWT_EXPIRES_IN: '1h',
      AGENT_SIGNUP_CODE: CODES.agent,
      ADMIN_SIGNUP_CODE: CODES.admin,
      MAX_ADMIN_ACCOUNTS: '2',
      CLIENT_ORIGIN: 'http://allowed.test',
      AUTH_RATE_LIMIT: '1000',
      AI_RATE_LIMIT: '1000',
      NVIDIA_API_KEY: '',
      UPLOAD_DIR: uploadDir,
      ...env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });

  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Server exited during startup:\n${output}`);
    try {
      const r = await fetch(`${url}/api/health`);
      if (r.ok) break;
    } catch { /* not up yet */ }
    await sleep(100);
    if (i === 99) throw new Error(`Server did not start:\n${output}`);
  }

  const stop = async () => {
    child.kill();
    const conn = await mongoose.createConnection(`${MONGO}/${dbName}`).asPromise();
    await conn.dropDatabase();
    await conn.close();
    fs.rmSync(uploadDir, { recursive: true, force: true });
  };

  return { url, port, uploadDir, output: () => output, stop };
}

// ---------- clients ----------
function client(url) {
  const call = async (method, p, { token, body, form, headers = {} } = {}) => {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    let payload;
    if (form) payload = form;
    else if (typeof body === 'string') { payload = body; h['Content-Type'] = h['Content-Type'] || 'application/json'; }
    else if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
    const res = await fetch(`${url}${p}`, { method, headers: h, body: payload });
    const type = res.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, body: data, headers: res.headers };
  };
  return {
    get: (p, o) => call('GET', p, o),
    post: (p, o) => call('POST', p, o),
    put: (p, o) => call('PUT', p, o),
    del: (p, o) => call('DELETE', p, o)
  };
}

function connectSocket(url, token) {
  return new Promise((resolve, reject) => {
    const s = io(url, { auth: token === undefined ? {} : { token }, transports: ['websocket'], reconnection: false, forceNew: true });
    s.once('connect', () => resolve(s));
    s.once('connect_error', (err) => { s.close(); reject(err); });
  });
}

// Resolve with the first `event` payload, or null after `ms`
const nextEvent = (socket, event, ms = 1500) => new Promise((resolve) => {
  const t = setTimeout(() => { socket.off(event, on); resolve(null); }, ms);
  const on = (payload) => { clearTimeout(t); resolve(payload); };
  socket.once(event, on);
});

const complaintForm = (fields, file) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  if (file) fd.append('attachment', new Blob([file.content], { type: file.type }), file.name);
  return fd;
};

async function mongoAvailable() {
  try {
    const conn = await mongoose.createConnection(`${MONGO}/ping`, { serverSelectionTimeoutMS: 1500 }).asPromise();
    await conn.close();
    return true;
  } catch {
    return false;
  }
}

module.exports = { startServer, startMockAi, client, connectSocket, nextEvent, complaintForm, mongoAvailable, sleep, CODES };
