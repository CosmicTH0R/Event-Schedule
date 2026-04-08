/**
 * Minimal API health check — used by CI.
 * Exits 0 on success, 1 on failure.
 */
const http = require('http');

const PORT = process.env.PORT || 3001;
const url = `http://localhost:${PORT}/api/health`;

http.get(url, (res) => {
  const ok = res.statusCode === 200;
  if (ok) {
    console.log(`✅ Health check passed (HTTP ${res.statusCode})`);
    process.exit(0);
  } else {
    console.error(`❌ Health check failed (HTTP ${res.statusCode})`);
    process.exit(1);
  }
}).on('error', (err) => {
  console.error('❌ Health check error:', err.message);
  process.exit(1);
});
