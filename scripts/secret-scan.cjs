const { readFileSync, statSync } = require('node:fs');
const { execSync } = require('node:child_process');

const SUSPICIOUS = [
  { name: 'AWS Access Key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'AWS Secret Key', pattern: /\baws[^\n]{0,20}(?:secret|access)[^\n]{0,20}[:=]\s*["']?[A-Z0-9]{20,}["']?/i },
  { name: 'GitHub Token', pattern: /\bghp_[A-Za-z0-9]{36}\b/ },
  { name: 'Private Key Block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Generic API Key assignment', pattern: /\b(api|secret|token|password)[a-z0-9_ -]{0,20}[:=]\s*["'][^"'\n]{12,}["']/i },
];
const ALLOWLIST_MARKER = 'secret-scan: allow';
const MAX_SCANNED_FILE_BYTES = 1024 * 1024;

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: true }).trim();
}

function listTrackedFiles() {
  try {
    const out = run('git ls-files');
    return out ? out.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function shouldSkip(filePath) {
  return (
    filePath.includes('node_modules/') ||
    filePath.includes('/dist/') ||
    filePath.endsWith('.lock') ||
    filePath.endsWith('.png') ||
    filePath.endsWith('.jpg') ||
    filePath.endsWith('.jpeg') ||
    filePath.endsWith('.gif') ||
    filePath.endsWith('.webp') ||
    filePath.endsWith('.bin') ||
    filePath.endsWith('.keystore') ||
    filePath.endsWith('.jks')
  );
}

function scanFile(filePath) {
  const stat = statSync(filePath);
  if (stat.size > MAX_SCANNED_FILE_BYTES) return [];
  const text = readFileSync(filePath, 'utf8');
  const findings = [];
  for (const rule of SUSPICIOUS) {
    const ruleAllowlistMarker = `${ALLOWLIST_MARKER} ${rule.name.toLowerCase()}`;
    const allowlistedForRule =
      text.includes(ruleAllowlistMarker) || text.includes(`${ALLOWLIST_MARKER} all`);
    if (allowlistedForRule) continue;
    const match = text.match(rule.pattern);
    if (match) findings.push({ rule: rule.name, snippet: match[0].slice(0, 90) });
  }
  return findings;
}

function main() {
  const files = listTrackedFiles();
  const problems = [];

  for (const file of files) {
    if (shouldSkip(file)) continue;
    try {
      const findings = scanFile(file);
      for (const finding of findings) {
        problems.push({ file, ...finding });
      }
    } catch {
      // Non-text file or unreadable; skip safely.
    }
  }

  if (problems.length === 0) {
    console.log('Secret scan passed: no obvious secrets found in tracked files.');
    return;
  }

  console.error('Secret scan found possible secrets:');
  for (const p of problems) {
    console.error(`- ${p.file} :: ${p.rule} :: ${p.snippet}`);
  }
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  shouldSkip,
  scanFile,
  ALLOWLIST_MARKER,
  MAX_SCANNED_FILE_BYTES,
};
