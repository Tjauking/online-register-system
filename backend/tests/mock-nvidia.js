// Standalone mock of the NVIDIA chat completions API for trying the AI features without a key:
//   node tests/mock-nvidia.js 5299
//   NVIDIA_API_KEY=test-nvidia-key NVIDIA_BASE_URL=http://127.0.0.1:5299/v1 npm start
const http = require('http');
const { startMockAi } = require('./helpers');

startMockAi().then((mock) => {
  const port = Number(process.argv[2] || 5299);
  // Re-expose the mock on a fixed port by proxying to it
  const target = new URL(mock.url);
  http.createServer((req, res) => {
    const p = http.request({ host: target.hostname, port: target.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    req.pipe(p);
  }).listen(port, () => console.log(`Mock NVIDIA API on http://127.0.0.1:${port}/v1 (key: test-nvidia-key)`));
});
