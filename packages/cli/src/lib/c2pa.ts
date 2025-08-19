import { spawn } from 'child_process';
import { writeFileSync, readFileSync, mkdtempSync, unlinkSync, existsSync, mkdirSync, renameSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname, resolve } from 'path';

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
/**
 * Check if c2patool supports DOCX embedding
 */
export async function supportsDocx(): Promise<boolean> {
  const hasC2pa = await hasC2paTool();
  if (!hasC2pa) {
    return false;
  }

  try {
    const result = await runC2paTool(['--help']);
    // Check if DOCX is mentioned in the help output
    return result.stdout.toLowerCase().includes('docx') || 
           result.stdout.toLowerCase().includes('.docx');
  } catch (error) {
    return false;
  }
}

/**
 * Fallback embedding for DOCX using OOXML custom parts
 */
export async function embedDocxFallback(docxPath: string, receiptJson: any): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'pp-docx-'));
  
  try {
    // Extract DOCX to temporary directory
    await extractZip(docxPath, tempDir);
    
    // Create customXml directory if it doesn't exist
    const customXmlDir = join(tempDir, 'customXml');
    if (!existsSync(customXmlDir)) {
      mkdirSync(customXmlDir, { recursive: true });
    }
    
    // Write passport.json to customXml directory
    const passportPath = join(customXmlDir, 'passport.json');
    writeFileSync(passportPath, JSON.stringify(receiptJson, null, 2));
    
    // Add relationship to document.xml.rels
    await addCustomXmlRelationship(tempDir);
    
    // Re-zip the DOCX file
    await createZip(tempDir, docxPath);
    
  } finally {
    // Clean up temporary directory
    await rmrf(tempDir);
  }
}

/**
 * Extract passport from DOCX custom XML parts
 */
export async function inspectDocxCustom(docxPath: string): Promise<any | null> {
  const tempDir = mkdtempSync(join(tmpdir(), 'pp-docx-inspect-'));
  
  try {
    // Extract DOCX to temporary directory
    await extractZip(docxPath, tempDir);
    
    // Check for passport.json in customXml
    const passportPath = join(tempDir, 'customXml', 'passport.json');
    if (!existsSync(passportPath)) {
      return null;
    }
    
    const passportContent = readFileSync(passportPath, 'utf-8');
    return JSON.parse(passportContent);
    
  } catch (error) {
    return null;
  } finally {
    // Clean up temporary directory
    await rmrf(tempDir);
  }
}

/**
 * Extract ZIP file using unzip command
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('unzip', ['-q', zipPath, '-d', destDir]);
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to extract ZIP file: exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Create ZIP file using zip command
 */
async function createZip(sourceDir: string, zipPath: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    // Create a temporary file in the same directory as the target
    const resolvedZipPath = resolve(zipPath);
    const tempZipPath = join(dirname(resolvedZipPath), `temp-${Date.now()}.zip`);
    const child = spawn('zip', ['-r', '-q', tempZipPath, '.'], { 
      cwd: sourceDir 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        // Move the temporary file to the final location
        try {
          renameSync(tempZipPath, resolvedZipPath);
          resolvePromise();
        } catch (error) {
          reject(error);
        }
      } else {
        // Clean up temporary file on error
        try {
          unlinkSync(tempZipPath);
        } catch (e) {
          // Ignore cleanup errors
        }
        reject(new Error(`Failed to create ZIP file: exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Add relationship for custom XML part
 */
async function addCustomXmlRelationship(tempDir: string): Promise<void> {
  const relsPath = join(tempDir, 'word', '_rels', 'document.xml.rels');
  
  // Create _rels directory if it doesn't exist
  const relsDir = dirname(relsPath);
  if (!existsSync(relsDir)) {
    mkdirSync(relsDir, { recursive: true });
  }
  
  let relsContent: string;
  
  if (existsSync(relsPath)) {
    relsContent = readFileSync(relsPath, 'utf-8');
  } else {
    // Create basic relationships file
    relsContent = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
                  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n' +
                  '</Relationships>';
  }
  
  // Check if our relationship already exists
  if (relsContent.includes('provenancepassport')) {
    return; // Already added
  }
  
  // Generate a unique relationship ID
  const relationshipId = `rId${Date.now()}`;
  
  // Add our custom relationship
  const customRel = `  <Relationship Id="${relationshipId}" ` +
                   `Type="http://schemas.provenancepassport.org/customXml" ` +
                   `Target="../customXml/passport.json"/>`;
  
  // Insert before closing </Relationships> tag
  relsContent = relsContent.replace(
    '</Relationships>',
    `${customRel}\n</Relationships>`
  );
  
  writeFileSync(relsPath, relsContent);
}

/**
 * Remove directory recursively
 */
async function rmrf(dirPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('rm', ['-rf', dirPath]);
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to remove directory: exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

export function getC2paInstallInstructions(): string {
  return `c2patool not found. Please install it:

• npm install -g c2patool
• brew install c2patool (macOS)
• Download from: https://github.com/contentauth/c2patool/releases
• Build from source: https://github.com/contentauth/c2patool

For more information, see: https://c2pa.org/`;
}