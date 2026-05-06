const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const apkPath = path.join(
  repoRoot,
  'mobile',
  'android',
  'app',
  'build',
  'outputs',
  'apk',
  'debug',
  'app-debug.apk'
);
const appId = 'com.czuu.bateyes';
const activity = 'com.czuu.bateyes.MainActivity';

function run(command, label, options = {}) {
  console.log(`\n== ${label} ==`);
  return execSync(command, {
    cwd: repoRoot,
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: options.capture ? 'utf8' : undefined,
    shell: true,
  });
}

function hasConnectedDevice() {
  const output = run('adb devices', 'ADB devices', { capture: true });
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.some((line) => /\sdevice$/.test(line) && !line.startsWith('List of devices attached'));
}

try {
  run('npm run mobile:apk:preflight', 'Android preflight');

  if (!fs.existsSync(apkPath)) {
    run('npm run mobile:apk', 'Build debug APK');
  }

  if (!hasConnectedDevice()) {
    console.error('\nNo Android device/emulator is connected.');
    console.error('Start an emulator in Android Studio or connect a physical device, then rerun this command.');
    process.exit(1);
  }

  run(`adb install -r "${apkPath}"`, 'Install APK');
  run(`adb shell am start -n ${appId}/${activity}`, 'Launch app');

  console.log('\nDemo app installed and launched.');
  console.log('If JS updates are needed, run: cd mobile && npx expo start --dev-client');
} catch (error) {
  console.error('\nAndroid demo install/launch failed.');
  if (error?.status !== undefined) {
    process.exit(error.status || 1);
  }
  process.exit(1);
}
