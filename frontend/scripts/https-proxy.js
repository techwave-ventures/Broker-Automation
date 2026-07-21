import https from 'https';
import httpProxy from 'http-proxy';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import selfsigned from 'selfsigned';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEXT_PORT = 3010;
const HTTPS_PORT = 3000;

const certDir = path.join(__dirname, '..', 'certificates');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost.pem');

async function main() {
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('Generating SSL certificates for HTTPS proxy...');
    const pbes = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
      days: 365,
      keySize: 2048,
      algorithm: 'sha256',
    });
    fs.writeFileSync(keyPath, pbes.private || pbes.key);
    fs.writeFileSync(certPath, pbes.cert);
  }

  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };

  const proxy = httpProxy.createProxyServer({
    target: `http://127.0.0.1:${NEXT_PORT}`,
    ws: true,
    changeOrigin: true,
  });

  proxy.on('error', (err, req, res) => {
    if (res && typeof res.writeHead === 'function') {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Next.js dev server is starting up... Please refresh in 5 seconds.');
    }
  });

  const server = https.createServer(options, (req, res) => {
    proxy.web(req, res);
  });

  server.on('upgrade', (req, socket, head) => {
    proxy.ws(req, socket, head);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${HTTPS_PORT} is already in use by another process.`);
      console.error(`Please stop any running 'npm run dev' or node process and try again.\n`);
      process.exit(1);
    } else {
      console.error('HTTPS Server Error:', err);
    }
  });

  server.listen(HTTPS_PORT, () => {
    console.log('\n================================================================');
    console.log(`🔒 HTTPS Local Proxy running at https://localhost:${HTTPS_PORT}`);
    console.log(`Forwarding secure traffic to Next.js on http://127.0.0.1:${NEXT_PORT}`);
    console.log('================================================================\n');

    // Spawn Next.js on port 3010 AFTER proxy server binds port 3000
    const nextDev = spawn('npx', ['next', 'dev', '-p', String(NEXT_PORT), '-H', '127.0.0.1'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: String(NEXT_PORT) },
    });

    process.on('SIGINT', () => {
      nextDev.kill();
      process.exit();
    });
  });
}

main().catch((err) => {
  console.error('HTTPS Proxy failed:', err);
  process.exit(1);
});
