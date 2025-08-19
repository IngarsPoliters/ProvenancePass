import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { resolve } from 'path';

const CLI_PATH = resolve(__dirname, '../dist/index.js');
const TEST_DIR = resolve(__dirname, '../test-temp');
const TEST_FILE = resolve(TEST_DIR, 'test.txt');
const TEST_KEY = resolve(TEST_DIR, 'test.pem');
const TEST_OUTPUT = resolve(TEST_DIR, 'output.txt');
const TEST_PASSPORT = resolve(TEST_DIR, 'output.txt.passport.json');

describe('End-to-End CLI Tests', () => {
  beforeAll(async () => {
    // Create test directory and files
    if (!existsSync(TEST_DIR)) {
      await runCommand('mkdir', ['-p', TEST_DIR]);
    }
    
    // Create a test input file
    writeFileSync(TEST_FILE, 'Hello, Provenance World!\n');
    
    // Build the CLI
    await runCommand('pnpm', ['build'], { cwd: resolve(__dirname, '..') });
  });

  afterAll(() => {
    // Clean up test files
    const filesToClean = [TEST_FILE, TEST_KEY, TEST_OUTPUT, TEST_PASSPORT];
    filesToClean.forEach(file => {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
  });

  it('should complete full workflow: keygen → wrap → verify PASS → mutate → verify FAIL', async () => {
    // Step 1: Generate key
    console.log('🔑 Generating key...');
    const keygenResult = await runCommand('node', [CLI_PATH, 'keygen', '--out', TEST_KEY]);
    expect(keygenResult.exitCode).toBe(0);
    expect(keygenResult.stdout).toContain('Keypair generated successfully');
    expect(keygenResult.stdout).toContain('Key ID: ppk_');
    expect(existsSync(TEST_KEY)).toBe(true);

    // Step 2: Test fingerprint command
    console.log('👤 Checking fingerprint...');
    const fingerprintResult = await runCommand('node', [CLI_PATH, 'fingerprint', '--key', TEST_KEY]);
    expect(fingerprintResult.exitCode).toBe(0);
    expect(fingerprintResult.stdout).toContain('Key ID: ppk_');
    expect(fingerprintResult.stdout).toContain('Public key:');

    // Step 3: Wrap file (create passport)
    console.log('📦 Wrapping file...');
    const wrapResult = await runCommand('node', [
      CLI_PATH, 'wrap',
      '--in', TEST_FILE,
      '--out', TEST_OUTPUT,
      '--run', `cp ${TEST_FILE} ${TEST_OUTPUT}`,
      '--sign', TEST_KEY,
      '--step', 'test-copy'
    ]);
    expect(wrapResult.exitCode).toBe(0);
    expect(wrapResult.stdout).toContain('Command executed successfully');
    expect(existsSync(TEST_OUTPUT)).toBe(true);
    expect(existsSync(TEST_PASSPORT)).toBe(true);

    // Verify passport structure
    const passportContent = JSON.parse(readFileSync(TEST_PASSPORT, 'utf-8'));
    expect(passportContent.version).toBe('0.1');
    expect(passportContent.artifact.hash_binding).toBe('bytes');
    expect(passportContent.artifact.byte_size).toBeDefined();
    expect(passportContent.signature.key_id).toMatch(/^ppk_[a-f0-9]{16}$/);
    expect(passportContent.steps).toHaveLength(1);
    expect(passportContent.steps[0].started_at).toBeDefined();
    expect(passportContent.steps[0].ended_at).toBeDefined();

    // Step 4: Verify original file (should PASS)
    console.log('✅ Verifying original file...');
    const verifyPassResult = await runCommand('node', [CLI_PATH, 'verify', TEST_OUTPUT, '--json']);
    expect(verifyPassResult.exitCode).toBe(0);
    
    const verifyPassJson = JSON.parse(verifyPassResult.stdout);
    expect(verifyPassJson.results).toHaveLength(1);
    expect(verifyPassJson.results[0].status).toBe('pass');
    expect(verifyPassJson.results[0].signature_valid).toBe(true);
    expect(verifyPassJson.results[0].passport_found).toBe(true);

    // Step 5: Mutate the file
    console.log('🔧 Mutating file...');
    writeFileSync(TEST_OUTPUT, 'Hello, MODIFIED World!\n');

    // Step 6: Verify mutated file (should FAIL)
    console.log('❌ Verifying mutated file...');
    const verifyFailResult = await runCommand('node', [CLI_PATH, 'verify', TEST_OUTPUT, '--json']);
    expect(verifyFailResult.exitCode).toBe(1); // Should exit with error code
    
    const verifyFailJson = JSON.parse(verifyFailResult.stdout);
    expect(verifyFailJson.results).toHaveLength(1);
    expect(verifyFailJson.results[0].status).toBe('fail');
    expect(verifyFailJson.results[0].passport_found).toBe(true);
    expect(verifyFailJson.results[0].error).toContain('hash mismatch');

    console.log('🎉 End-to-end test completed successfully!');
  });
});

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runCommand(
  command: string, 
  args: string[], 
  options: { cwd?: string } = {}
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code || 0,
        stdout,
        stderr
      });
    });
  });
}