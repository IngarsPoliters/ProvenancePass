import { spawn } from 'child_process';
import { writeFileSync, readFileSync, mkdtempSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export interface C2paManifest {
  claim_generator: string;
  claim_generator_info?: string[];
  title?: string;
  format?: string;
  thumbnail?: any;
  ingredients?: any[];
  assertions?: Record<string, any>;
}

/**
 * Check if c2patool is available in PATH
 */
export async function hasC2paTool(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('c2patool', ['--version'], { stdio: 'pipe' });
    
    child.on('close', (code) => {
      resolve(code === 0);
    });
    
    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Embed a Provenance Passport receipt into a file using C2PA
 * @param file Path to the file to embed into
 * @param receiptPath Path to the passport JSON file
 */
export async function embedWithC2pa(file: string, receiptPath: string): Promise<void> {
  const hasC2pa = await hasC2paTool();
  if (!hasC2pa) {
    throw new Error(
      'c2patool not found in PATH. Please install it from:\n' +
      '• https://github.com/contentauth/c2patool\n' +
      '• npm install -g c2patool\n' +
      '• brew install c2patool (macOS)\n' +
      '• Or download from releases: https://github.com/contentauth/c2patool/releases'
    );
  }

  const receipt = JSON.parse(readFileSync(receiptPath, 'utf-8'));
  
  // Create a temporary manifest file for c2patool
  const tempDir = mkdtempSync(join(tmpdir(), 'pp-c2pa-'));
  const manifestPath = join(tempDir, 'manifest.json');
  
  try {
    const manifest: C2paManifest = {
      claim_generator: 'provenancepass-cli/0.1.0',
      claim_generator_info: [
        'https://github.com/IngarsPoliters/ProvenancePass',
        'Provenance Passport CLI - Cryptographic provenance for digital artifacts'
      ],
      title: `Provenance Passport for ${receipt.artifact?.name || 'artifact'}`,
      format: receipt.artifact?.mime || 'application/octet-stream',
      assertions: {
        'com.provenancepassport.receipt': receipt,
        'com.provenancepassport.version': '0.1',
        'com.provenancepassport.hash_binding': 'c2pa-claim'
      }
    };

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Run c2patool to embed the manifest
    await runC2paTool(['--embed', file, '--manifest', manifestPath, '--output', file]);
    
  } finally {
    // Clean up temporary files
    try {
      unlinkSync(manifestPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Inspect a file for C2PA manifests and extract Provenance Passport data
 * @param file Path to the file to inspect
 * @returns Parsed manifest data or null if no C2PA manifest found
 */
export async function inspectC2pa(file: string): Promise<any | null> {
  const hasC2pa = await hasC2paTool();
  if (!hasC2pa) {
    // If c2patool is not available, silently return null (fallback to sidecar)
    return null;
  }

  try {
    const result = await runC2paTool(['--detailed', file]);
    
    if (!result.stdout || result.stdout.trim() === '') {
      return null;
    }

    // Try to parse the JSON output from c2patool
    const manifestData = JSON.parse(result.stdout);
    
    // Look for our Provenance Passport assertion
    if (manifestData && manifestData.manifests) {
      for (const manifest of manifestData.manifests) {
        if (manifest.assertions && manifest.assertions['com.provenancepassport.receipt']) {
          return {
            manifest: manifestData,
            receipt: manifest.assertions['com.provenancepassport.receipt'],
            version: manifest.assertions['com.provenancepassport.version'],
            hash_binding: manifest.assertions['com.provenancepassport.hash_binding']
          };
        }
      }
    }

    // Return the raw manifest even if no PP assertion found
    return manifestData;
    
  } catch (error) {
    // If inspection fails, return null (will fall back to sidecar)
    return null;
  }
}

/**
 * Run c2patool with the given arguments
 */
async function runC2paTool(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn('c2patool', args, { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const result = {
        stdout,
        stderr,
        exitCode: code || 0
      };

      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(`c2patool failed with exit code ${code}: ${stderr || stdout}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Get installation instructions for c2patool
 */
export function getC2paInstallInstructions(): string {
  return `c2patool not found. Please install it:

• npm install -g c2patool
• brew install c2patool (macOS)
• Download from: https://github.com/contentauth/c2patool/releases
• Build from source: https://github.com/contentauth/c2patool

For more information, see: https://c2pa.org/`;
}