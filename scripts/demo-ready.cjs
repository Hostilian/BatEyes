const { execSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

function run(command, label) {
  console.log(`\n== ${label} ==`);
  execSync(command, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });
}

try {
  run('npm run mobile:apk:preflight', 'Android preflight');
  run('npm run verify', 'Workspace verify');
  run('npm run prebuild:android -w mobile', 'Expo prebuild (android)');
  run('npm run mobile:apk', 'Build debug APK');

  console.log('\nDemo readiness: PASS');
  console.log('APK: mobile/android/app/build/outputs/apk/debug/app-debug.apk');
  console.log('Optional next step: npm run demo:android:install');
} catch (error) {
  console.error('\nDemo readiness: FAIL');
  if (error?.status !== undefined) {
    process.exit(error.status || 1);
  }
  process.exit(1);
}
