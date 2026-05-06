const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ALLOWLIST_MARKER,
  MAX_SCANNED_FILE_BYTES,
  scanFile,
  shouldSkip,
} = require('./secret-scan.cjs');

test('shouldSkip ignores generated binary artifacts', () => {
  assert.equal(shouldSkip('mobile/android/app/build/output.bin'), true);
  assert.equal(shouldSkip('mobile/src/useScanIo.ts'), false);
});

test('scanFile reports suspicious token pattern', () => {
  const dir = mkdtempSync(join(tmpdir(), 'secret-scan-test-'));
  try {
    const file = join(dir, 'sample.txt');
    writeFileSync(file, 'token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890"', 'utf8');
    const findings = scanFile(file);
    assert.equal(findings.length > 0, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scanFile respects explicit allowlist marker per rule', () => {
  const dir = mkdtempSync(join(tmpdir(), 'secret-scan-test-'));
  try {
    const file = join(dir, 'sample.txt');
    writeFileSync(
      file,
      `${ALLOWLIST_MARKER} generic api key assignment\npassword = "this-is-a-fake-test-value"`,
      'utf8'
    );
    const findings = scanFile(file);
    assert.equal(findings.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('allowlisting one rule does not suppress others', () => {
  const dir = mkdtempSync(join(tmpdir(), 'secret-scan-test-'));
  try {
    const file = join(dir, 'sample.txt');
    writeFileSync(
      file,
      `${ALLOWLIST_MARKER} generic api key assignment\npassword = "this-is-a-fake-test-value"\n-----BEGIN PRIVATE KEY-----`,
      'utf8'
    );
    const findings = scanFile(file);
    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.rule, 'Private Key Block');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scanFile supports global allowlist marker when explicitly requested', () => {
  const dir = mkdtempSync(join(tmpdir(), 'secret-scan-test-'));
  try {
    const file = join(dir, 'sample.txt');
    writeFileSync(
      file,
      `${ALLOWLIST_MARKER} all\npassword = "this-is-a-fake-test-value"\n-----BEGIN PRIVATE KEY-----`,
      'utf8'
    );
    const findings = scanFile(file);
    assert.equal(findings.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scanFile skips very large files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'secret-scan-test-'));
  try {
    const file = join(dir, 'large.txt');
    writeFileSync(file, 'A'.repeat(MAX_SCANNED_FILE_BYTES + 10), 'utf8');
    const findings = scanFile(file);
    assert.equal(findings.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
