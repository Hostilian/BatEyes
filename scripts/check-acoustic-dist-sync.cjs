const { execSync } = require('node:child_process');

function run(command) {
  return execSync(command, {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    shell: true,
  }).trim();
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

let changedFiles = '';
try {
  changedFiles = run('git diff --name-only HEAD');
} catch {
  console.warn('Git CLI unavailable; dist sync check skipped.');
  process.exit(0);
}
const touchesCoreSrc = changedFiles
  .split(/\r?\n/)
  .filter(Boolean)
  .some((file) => file.startsWith('packages/acoustic-core/src/'));

if (!touchesCoreSrc) {
  console.log('No acoustic-core source changes detected; dist sync check skipped.');
  process.exit(0);
}

execSync('npm run build -w @bateyes/acoustic-core', { stdio: 'inherit', shell: true });

try {
  execSync('git diff --exit-code -- packages/acoustic-core/dist', { stdio: 'ignore', shell: true });
  console.log('acoustic-core dist is in sync with source changes.');
} catch {
  fail(
    'acoustic-core dist is out of sync with src changes. Run `npm run build -w @bateyes/acoustic-core` and commit updated dist files.'
  );
}
