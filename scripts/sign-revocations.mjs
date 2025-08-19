#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import * as ed25519 from '@noble/ed25519';
import { canonicalizeJSON } from '../packages/cli/dist/lib/sign.js';

const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const DOCS_DIR = resolve(SCRIPT_DIR, '../docs/spec');
const REVOCATIONS_FILE = resolve(DOCS_DIR, 'revocations.json');
const SIGNATURE_FILE = resolve(DOCS_DIR, 'revocations.sig');

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error(`
Usage: ${process.argv[1]} <command> [options]

Commands:
  gen                Generate new revocation authority key pair
  sign --priv <hex>  Sign revocations.json with private key
  verify --pub <hex> Verify revocations.json signature

Options:
  --priv <hex>      Private key in hex format (64 chars)
  --pub <hex>       Public key in hex format (64 chars)
  --key-file <path> Read key from file instead of command line
  --output <path>   Output signature file (default: docs/spec/revocations.sig)
  --help            Show this help message

Examples:
  # Generate keypair
  node scripts/sign-revocations.mjs gen

  # Sign with private key
  node scripts/sign-revocations.mjs sign --priv a1b2c3d4e5f6...

  # Verify with public key
  node scripts/sign-revocations.mjs verify --pub 1a2b3c4d...
`);
    process.exit(1);
  }

  const command = args[0];
  
  if (command === 'gen') {
    await generateRevocationKey();
    return;
  }
  
  if (command === 'verify') {
    await verifyRevocations(args.slice(1));
    return;
  }
  
  if (command !== 'sign') {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  let privateKeyHex = '';
  let outputFile = SIGNATURE_FILE;
  let verifyAfterSigning = false;
  let keyFile = '';

  // Parse arguments (skip 'sign' command)
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--priv':
        privateKeyHex = args[++i];
        break;
      case '--key-file':
        keyFile = args[++i];
        break;
      case '--output':
        outputFile = args[++i];
        break;
      case '--verify':
        verifyAfterSigning = true;
        break;
      case '--help':
        console.log('Help already shown above');
        process.exit(0);
        break;
    }
  }

  try {
    // Read private key
    if (keyFile) {
      console.log(`📖 Reading private key from: ${keyFile}`);
      const keyContent = readFileSync(keyFile, 'utf-8').trim();
      // Handle both raw hex and PEM-like formats
      if (keyContent.includes('-----')) {
        // Extract hex from between markers
        const lines = keyContent.split('\n');
        privateKeyHex = lines.find(line => 
          !line.includes('-----') && line.trim().length > 50
        )?.trim() || '';
      } else {
        privateKeyHex = keyContent;
      }
    }

    if (!privateKeyHex) {
      throw new Error('Private key is required (either as argument or --key-file)');
    }

    if (privateKeyHex.length !== 64) {
      throw new Error(`Private key must be 64 hex characters, got ${privateKeyHex.length}`);
    }

    // Read revocations.json
    console.log(`📖 Reading revocations file: ${REVOCATIONS_FILE}`);
    const revocationsContent = readFileSync(REVOCATIONS_FILE, 'utf-8');
    const revocations = JSON.parse(revocationsContent);

    // Remove any existing signature field for clean signing
    const { signature, ...dataToSign } = revocations;

    // Canonicalize and sign
    console.log('🔐 Canonicalizing JSON for signing...');
    const canonicalData = canonicalizeJSON(dataToSign);
    const messageBytes = Buffer.from(canonicalData, 'utf-8');
    const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');

    console.log('✍️  Signing revocations data...');
    const signatureBytes = await ed25519.sign(messageBytes, privateKeyBytes);
    const signatureHex = Buffer.from(signatureBytes).toString('hex');

    // Add signature to revocations data
    const signedRevocations = {
      ...dataToSign,
      signature: signatureHex
    };

    // Write signed revocations back to original file
    console.log(`💾 Writing signed revocations to: ${REVOCATIONS_FILE}`);
    writeFileSync(REVOCATIONS_FILE, JSON.stringify(signedRevocations, null, 2));

    // Write just the signature to .sig file
    console.log(`💾 Writing signature to: ${outputFile}`);
    writeFileSync(outputFile, signatureHex);

    // Generate public key for verification
    const publicKeyBytes = await ed25519.getPublicKey(privateKeyBytes);
    const publicKeyHex = Buffer.from(publicKeyBytes).toString('hex');

    console.log('✅ Signing complete!');
    console.log(`📊 Revocation entries: ${dataToSign.revoked_keys?.length || 0}`);
    console.log(`🔑 Public key (for --revocation-pubkey): ${publicKeyHex}`);
    console.log(`📝 Signature: ${signatureHex.slice(0, 16)}...`);

    // Verify signature if requested
    if (verifyAfterSigning) {
      console.log('🔍 Verifying signature...');
      const isValid = await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
      if (isValid) {
        console.log('✅ Signature verification: PASSED');
      } else {
        console.log('❌ Signature verification: FAILED');
        process.exit(1);
      }
    }

    console.log(`
📋 Usage with ProvenancePass CLI:
   pp verify --revocations ${signedRevocations.feed_url || REVOCATIONS_FILE} --revocation-pubkey ${publicKeyHex}

📋 Or save public key to file:
   echo "${publicKeyHex}" > revocation-authority.pub
   pp verify --revocations <url> --revocation-pubkey revocation-authority.pub
`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Helper function to generate a new revocation authority key pair
async function generateRevocationKey() {
  console.log('🔑 Generating new revocation authority key pair...');
  
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = await ed25519.getPublicKey(privateKey);
  
  const privateKeyHex = Buffer.from(privateKey).toString('hex');
  const publicKeyHex = Buffer.from(publicKey).toString('hex');
  
  console.log('🔐 Private Key (keep secure!):', privateKeyHex);
  console.log('🔑 Public Key (distribute):', publicKeyHex);
  
  // Save to files
  const keyId = `revocation-authority-${new Date().getFullYear()}`;
  writeFileSync(`${keyId}.priv`, privateKeyHex);
  writeFileSync(`${keyId}.pub`, publicKeyHex);
  
  console.log(`💾 Saved to: ${keyId}.priv, ${keyId}.pub`);
  return { privateKeyHex, publicKeyHex };
}

// Helper function to verify revocations signature
async function verifyRevocations(args) {
  let publicKeyHex = '';
  let keyFile = '';
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pub':
        publicKeyHex = args[++i];
        break;
      case '--key-file':
        keyFile = args[++i];
        break;
    }
  }
  
  try {
    // Read public key
    if (keyFile) {
      console.log(`📖 Reading public key from: ${keyFile}`);
      publicKeyHex = readFileSync(keyFile, 'utf-8').trim();
    }
    
    if (!publicKeyHex) {
      throw new Error('Public key is required (--pub or --key-file)');
    }
    
    if (publicKeyHex.length !== 64) {
      throw new Error(`Public key must be 64 hex characters, got ${publicKeyHex.length}`);
    }
    
    // Read revocations.json
    console.log(`📖 Reading revocations file: ${REVOCATIONS_FILE}`);
    const revocationsContent = readFileSync(REVOCATIONS_FILE, 'utf-8');
    const revocations = JSON.parse(revocationsContent);
    
    if (!revocations.signature) {
      throw new Error('No signature found in revocations.json');
    }
    
    // Extract data without signature
    const { signature, ...dataToVerify } = revocations;
    
    // Canonicalize and verify
    console.log('🔐 Canonicalizing JSON for verification...');
    const canonicalData = canonicalizeJSON(dataToVerify);
    const messageBytes = Buffer.from(canonicalData, 'utf-8');
    const publicKeyBytes = Buffer.from(publicKeyHex, 'hex');
    const signatureBytes = Buffer.from(signature, 'hex');
    
    console.log('🔍 Verifying signature...');
    const isValid = await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
    
    if (isValid) {
      console.log('✅ Signature verification: PASSED');
      console.log(`📊 Revocation entries: ${dataToVerify.revoked_keys?.length || 0}`);
      console.log(`🔑 Authority: ${dataToVerify.authority}`);
      console.log(`📅 Last updated: ${dataToVerify.last_updated}`);
    } else {
      console.log('❌ Signature verification: FAILED');
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Verification error: ${error.message}`);
    process.exit(1);
  }
}

// Export for testing
export { main, generateRevocationKey };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}