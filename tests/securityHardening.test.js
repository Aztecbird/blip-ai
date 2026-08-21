import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(process.cwd());

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Docker publishes sensitive backend ports on loopback only', () => {
  const compose = read('docker-compose.yml');
  const publishedPorts = [...compose.matchAll(/^\s+-\s+"([^"\n]+)"\s*$/gm)]
    .map((match) => match[1])
    .filter((value) => value.includes('_BACKEND_PORT'));

  assert.ok(publishedPorts.length >= 7, 'expected all backend port mappings');
  for (const mapping of publishedPorts) {
    assert.match(mapping, /^127\.0\.0\.1:/, `public backend mapping: ${mapping}`);
  }
});

test('Node backends default to a loopback bind address', () => {
  const serverDir = path.join(root, 'server');
  const backends = fs.readdirSync(serverDir).filter((name) => name.endsWith('Backend.js'));
  assert.ok(backends.length >= 10, 'expected backend files');

  for (const name of backends) {
    const source = read(path.join('server', name));
    assert.doesNotMatch(source, /server\.listen\(PORT,\s*['"]0\.0\.0\.0['"]/, `${name} binds publicly`);
    assert.match(source, /process\.env\.BLIP_BACKEND_HOST\s*\|\|\s*['"]127\.0\.0\.1['"]/, `${name} lacks loopback default`);
  }
});

test('Gemini CORS does not use a substring domain match', () => {
  const source = read('server/geminiBackend.js');
  assert.doesNotMatch(source, /origin\.includes\(['"]blipai\.es['"]\)/);
  assert.match(source, /allowedOrigins\.has\(normalizedOrigin\)/);
});

test('live Nginx config protects the private app and limits APIs', () => {
  const nginx = read('deploy/nginx/blipai-es.conf');
  assert.match(nginx, /auth_basic\s+"Private Blip";/);
  assert.match(nginx, /auth_basic_user_file\s+\/etc\/nginx\/\.htpasswd-blip;/);
  assert.match(nginx, /limit_req_zone/);
  assert.match(nginx, /client_max_body_size\s+25m;/);
  assert.match(nginx, /blip_csrf_block/);
});

test('browser bundles and storage do not retain provider secrets', () => {
  const envExample = read('.env.local.example');
  const main = read('src/main.js');
  const telegram = read('src/services/telegram.js');
  const arcade = read('src/services/arcade/arcadeService.js');

  assert.doesNotMatch(envExample, /^VITE_.*(?:KEY|TOKEN|SECRET)=/m);
  assert.doesNotMatch(main, /localStorage\.setItem\(['"]blip_(?:gemini|youtube|weather)_key/);
  assert.doesNotMatch(telegram, /localStorage\?\.setItem\(['"]blip_telegram_bot_token/);
  assert.doesNotMatch(arcade, /VITE_ARCADE_API_KEY/);
});

test('deployment fails closed when the authentication file is absent', () => {
  const deploy = read('deploy-all.sh');
  assert.match(deploy, /BLIP_AUTH_FILE/);
  assert.match(deploy, /Security stop:/);
  assert.match(deploy, /exit 1/);
});
