import selfsigned from 'selfsigned';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certDir = path.join(__dirname, '..', 'certificates');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

const keyPath = path.join(certDir, 'localhost-key.pem');
const certPath = path.join(certDir, 'localhost.pem');

async function main() {
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('Generating self-signed SSL certificates for localhost...');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pbes = await selfsigned.generate(attrs, {
      days: 365,
      keySize: 2048,
      algorithm: 'sha256',
    });

    const privateKey = pbes.private || pbes.key;
    const certData = pbes.cert;

    if (!privateKey || !certData) {
      throw new Error('Failed to extract SSL key and certificate data');
    }

    fs.writeFileSync(keyPath, privateKey);
    fs.writeFileSync(certPath, certData);
    console.log('Certificates created successfully at:', keyPath);
  } else {
    console.log('Existing SSL certificates found in frontend/certificates/');
  }
}

main().catch((err) => {
  console.error('Cert generation failed:', err);
  process.exit(1);
});
