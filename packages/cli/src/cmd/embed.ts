import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename } from 'path';
import { hasC2paTool, embedWithC2pa, getC2paInstallInstructions } from '../lib/c2pa.js';
import { signPassport, privateKeyFromPEM } from '../lib/sign.js';
import { validatePassportThrow } from '../lib/schema.js';
import { sha256File } from '../lib/hash.js';

interface EmbedOptions {
  passport: string;
  sign?: string;
}

export function createEmbedCommand(): Command {
  const cmd = new Command('embed')
    .description('Embed a Provenance Passport into a file using C2PA')
    .argument('<file>', 'File to embed passport into (must support C2PA: images, PDFs, etc.)')
    .requiredOption('--passport <sidecar.json>', 'Path to the passport JSON file')
    .option('--sign <key.pem>', 'Re-sign the passport with this private key before embedding')
    .action(async (file: string, options: EmbedOptions) => {
      try {
        await embedCommand(file, options);
      } catch (error) {
        console.error('❌ Embed failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

async function embedCommand(file: string, options: EmbedOptions): Promise<void> {
  const { passport: passportPath, sign: keyPath } = options;

  // Check if c2patool is available
  const hasC2pa = await hasC2paTool();
  if (!hasC2pa) {
    console.error('❌ C2PA tool not found\n');
    console.error(getC2paInstallInstructions());
    process.exit(1);
  }

  if (!existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }

  if (!existsSync(passportPath)) {
    throw new Error(`Passport file not found: ${passportPath}`);
  }

  console.log(`🔗 Embedding passport into: ${basename(file)}`);
  console.log(`📋 Passport file: ${basename(passportPath)}`);

  // Load and validate the passport
  let passport: any;
  try {
    const passportContent = readFileSync(passportPath, 'utf-8');
    passport = JSON.parse(passportContent);
    validatePassportThrow(passport);
  } catch (error) {
    throw new Error(`Invalid passport file: ${error instanceof Error ? error.message : String(error)}`);
  }

  // If --sign is provided, re-sign the passport
  if (keyPath) {
    console.log(`🔐 Re-signing passport with key: ${basename(keyPath)}`);
    
    if (!existsSync(keyPath)) {
      throw new Error(`Private key file not found: ${keyPath}`);
    }

    try {
      const keyContent = readFileSync(keyPath, 'utf-8');
      const privateKey = privateKeyFromPEM(keyContent);
      
      // Remove existing signature and re-sign
      const passportWithoutSignature = { ...passport };
      delete passportWithoutSignature.signature;
      
      const signature = await signPassport(passportWithoutSignature, privateKey);
      passport.signature = signature;
      
      // Validate the re-signed passport
      validatePassportThrow(passport);
      
      // Write the updated passport back to file
      writeFileSync(passportPath, JSON.stringify(passport, null, 2));
      
      console.log(`✅ Passport re-signed with key ID: ${signature.key_id}`);
      
    } catch (error) {
      throw new Error(`Failed to re-sign passport: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Verify the artifact hash matches the passport
  const actualHash = await sha256File(file);
  if (passport.artifact?.sha256 !== actualHash) {
    console.warn(`⚠️  Warning: Artifact hash mismatch!`);
    console.warn(`   Expected: ${passport.artifact?.sha256}`);
    console.warn(`   Actual:   ${actualHash}`);
    console.warn(`   The passport may not match this file.`);
  }

  // Update hash_binding to indicate C2PA embedding
  if (passport.artifact) {
    passport.artifact.hash_binding = 'c2pa-claim';
    
    // Write the updated passport back to file
    writeFileSync(passportPath, JSON.stringify(passport, null, 2));
  }

  try {
    // Embed the passport using C2PA
    await embedWithC2pa(file, passportPath);
    
    console.log('✅ Passport successfully embedded into file');
    console.log(`🔗 Hash binding: c2pa-claim`);
    console.log(`🆔 Key ID: ${passport.signature?.key_id || 'unknown'}`);
    console.log('');
    console.log(`ℹ️  The file now contains embedded provenance metadata.`);
    console.log(`   Use 'pp verify ${basename(file)}' to verify the embedded passport.`);
    
  } catch (error) {
    throw new Error(`C2PA embedding failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}