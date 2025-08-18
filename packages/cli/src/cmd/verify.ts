import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { request } from '../lib/temp-deps.js';
import glob from '../lib/temp-deps.js';
import { sha256File } from '../lib/hash.js';
import { verifyPassport } from '../lib/sign.js';
import { validatePassport } from '../lib/schema.js';

interface VerifyOptions {
  glob?: string;
  json?: boolean;
  strict?: boolean;
  checkRevocations?: boolean;
  trustBundle?: string;
  failOnMissing?: boolean;
  revocations?: string;
}

interface VerificationResult {
  file: string;
  status: 'pass' | 'fail' | 'warning';
  passport_found: boolean;
  signature_valid?: boolean;
  key_id?: string;
  key_status?: 'active' | 'revoked' | 'unknown';
  created_at?: string;
  artifact_hash?: string;
  steps_count?: number;
  policies_passed?: number;
  error?: string;
  details?: string;
}

interface VerificationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

export function createVerifyCommand(): Command {
  const cmd = new Command('verify')
    .description('Verify passport signatures and validate artifact integrity')
    .argument('[path]', 'Single file to verify (checks for embedded passport or .pp sidecar)')
    .option('--glob <pattern>', 'Glob pattern for multiple files')
    .option('--json', 'Output results in JSON format')
    .option('--strict', 'Fail on any warnings (not just errors)')
    .option('--check-revocations', 'Always check revocation status', true)
    .option('--trust-bundle <path>', 'Additional trusted public keys file')
    .option('--fail-on-missing', 'Exit with error if passport is missing during verification')
    .option('--revocations <url>', 'Override revocation list URL')
    .action(async (path: string | undefined, options: VerifyOptions) => {
      try {
        await verifyCommand(path, options);
      } catch (error) {
        console.error('❌ Verification failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

async function verifyCommand(inputPath: string | undefined, options: VerifyOptions): Promise<void> {
  const { glob: globPattern, json, strict, failOnMissing } = options;

  if (!inputPath && !globPattern) {
    throw new Error('Either provide a file path or use --glob pattern');
  }

  let filesToVerify: string[] = [];

  if (globPattern) {
    console.log(`🔍 Searching for files matching: ${globPattern}`);
    filesToVerify = await glob(globPattern, { onlyFiles: true });
    if (filesToVerify.length === 0) {
      console.log('⚠️  No files found matching the pattern');
      return;
    }
    console.log(`🔍 Verifying ${filesToVerify.length} files...`);
  } else if (inputPath) {
    filesToVerify = [inputPath];
  }

  const results: VerificationResult[] = [];
  let revokedKeys: Set<string> | null = null;

  if (options.checkRevocations) {
    revokedKeys = await fetchRevokedKeys(options.revocations);
  }

  for (const file of filesToVerify) {
    const result = await verifyFile(file, revokedKeys, options);
    results.push(result);

    if (!json) {
      printResult(result);
    }
  }

  const summary = calculateSummary(results);

  if (json) {
    console.log(JSON.stringify({ summary, results }, null, 2));
  } else if (filesToVerify.length > 1) {
    printSummary(summary);
  }

  let exitCode = 0;
  if (summary.failed > 0) {
    exitCode = 1;
  } else if (failOnMissing && summary.warnings > 0) {
    exitCode = 2;
  } else if (strict && summary.warnings > 0) {
    exitCode = 4;
  }

  if (exitCode > 0) {
    process.exit(exitCode);
  }
}

async function verifyFile(
  filePath: string, 
  revokedKeys: Set<string> | null, 
  _options: VerifyOptions
): Promise<VerificationResult> {
  const file = resolve(filePath);
  
  if (!existsSync(file)) {
    return {
      file: filePath,
      status: 'fail',
      passport_found: false,
      error: 'File not found'
    };
  }

  const passportPath = findPassportFile(file);
  
  if (!passportPath) {
    return {
      file: filePath,
      status: 'warning',
      passport_found: false,
      error: 'No passport file found'
    };
  }

  try {
    const passportContent = readFileSync(passportPath, 'utf-8');
    const passport = JSON.parse(passportContent);

    const validation = validatePassport(passport);
    if (!validation.valid) {
      return {
        file: filePath,
        status: 'fail',
        passport_found: true,
        error: `Invalid passport format: ${validation.errors?.join(', ')}`
      };
    }

    const actualHash = await sha256File(file);
    if (passport.artifact.sha256 !== actualHash) {
      return {
        file: filePath,
        status: 'fail',
        passport_found: true,
        signature_valid: false,
        artifact_hash: actualHash,
        error: 'Content hash mismatch - file may have been modified',
        details: `Expected: ${passport.artifact.sha256}, Got: ${actualHash}`
      };
    }

    const signatureValid = await verifyPassport(passport);
    if (!signatureValid) {
      return {
        file: filePath,
        status: 'fail',
        passport_found: true,
        signature_valid: false,
        error: 'Passport signature verification failed'
      };
    }

    const keyId = passport.signature.key_id;
    let keyStatus: 'active' | 'revoked' | 'unknown' = 'unknown';
    
    if (revokedKeys) {
      keyStatus = revokedKeys.has(keyId) ? 'revoked' : 'active';
      
      if (keyStatus === 'revoked') {
        return {
          file: filePath,
          status: 'fail',
          passport_found: true,
          signature_valid: true,
          key_id: keyId,
          key_status: keyStatus,
          error: 'Signing key has been revoked'
        };
      }
    }

    return {
      file: filePath,
      status: 'pass',
      passport_found: true,
      signature_valid: true,
      key_id: keyId,
      key_status: keyStatus,
      created_at: passport.artifact.created_at,
      artifact_hash: actualHash,
      steps_count: passport.steps?.length || 0,
      policies_passed: passport.policy_checks?.filter((p: any) => p.result === 'pass').length || 0
    };

  } catch (error) {
    return {
      file: filePath,
      status: 'fail',
      passport_found: true,
      error: `Failed to process passport: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function findPassportFile(filePath: string): string | null {
  const sidecarPath = `${filePath}.passport.json`;
  if (existsSync(sidecarPath)) {
    return sidecarPath;
  }

  const legacySidecarPath = `${filePath}.pp`;
  if (existsSync(legacySidecarPath)) {
    return legacySidecarPath;
  }

  return null;
}

async function fetchRevokedKeys(revocationsUrl?: string): Promise<Set<string> | null> {
  const url = revocationsUrl || 'https://raw.githubusercontent.com/IngarsPoliters/ProvenancePass/main/docs/spec/revocations.json';
  
  try {
    const response = await request(url);
    
    if (response.statusCode !== 200) {
      console.warn(`⚠️  Warning: Could not fetch revocation list (HTTP ${response.statusCode})`);
      return null;
    }

    const body = await response.body.text();
    const revocations = JSON.parse(body);
    
    const revokedKeys = new Set<string>();
    if (revocations.revoked_keys && Array.isArray(revocations.revoked_keys)) {
      for (const entry of revocations.revoked_keys) {
        if (entry.key_id) {
          revokedKeys.add(entry.key_id);
        }
      }
    }
    
    return revokedKeys;
  } catch (error) {
    console.warn(`⚠️  Warning: Could not check revocation status: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function printResult(result: VerificationResult): void {
  const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  const statusText = result.status.toUpperCase();
  
  console.log(`${statusIcon} ${statusText}: ${result.file}`);
  
  if (result.status === 'pass') {
    console.log(`📄 Artifact: ${basename(result.file)} (sha256: ${result.artifact_hash?.slice(0, 12)}...)`);
    console.log(`🔐 Signature: Valid (${result.key_id})`);
    if (result.created_at) {
      console.log(`⏰ Created: ${result.created_at}`);
    }
    console.log(`✅ Key status: ${result.key_status === 'active' ? 'Active (not revoked)' : result.key_status}`);
    if (result.steps_count !== undefined) {
      console.log(`📋 Steps: ${result.steps_count} processing steps recorded`);
    }
    if (result.policies_passed !== undefined) {
      console.log(`🛡️  Policies: ${result.policies_passed} checks passed`);
    }
  } else {
    if (result.artifact_hash) {
      console.log(`📄 Artifact: ${basename(result.file)} (sha256: ${result.artifact_hash.slice(0, 12)}...)`);
    }
    if (result.signature_valid === false) {
      console.log(`🔐 Signature: INVALID - does not match content`);
    }
    if (result.error) {
      console.log(`💥 Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`⚠️  Warning: ${result.details}`);
    }
  }
  
  console.log('');
}

function calculateSummary(results: VerificationResult[]): VerificationSummary {
  return {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warning').length
  };
}

function printSummary(summary: VerificationSummary): void {
  console.log(`📊 Summary: ${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warning${summary.warnings !== 1 ? 's' : ''}`);
}