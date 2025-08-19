import { Command } from 'commander';
import { readFileSync } from 'fs';
import { privateKeyFromPEM, generateKeyId } from '../lib/sign.js';
import * as ed25519 from '@noble/ed25519';

interface FingerprintOptions {
  key: string;
}

export function createFingerprintCommand(): Command {
  const cmd = new Command('fingerprint')
    .description('Display key ID and public key hex for a private key file')
    .requiredOption('--key <file.pem>', 'Private key file to analyze')
    .action(async (options: FingerprintOptions) => {
      try {
        await fingerprintCommand(options);
      } catch (error) {
        console.error('❌ Fingerprint failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

async function fingerprintCommand(options: FingerprintOptions): Promise<void> {
  const { key: keyPath } = options;

  console.log(`🔍 Analyzing key: ${keyPath}`);
  
  try {
    // Load private key
    const keyContent = readFileSync(keyPath, 'utf-8');
    const privateKey = privateKeyFromPEM(keyContent);
    
    // Generate public key from private key
    const publicKey = ed25519.getPublicKey(privateKey);
    const keyId = generateKeyId(publicKey);
    const publicKeyHex = Buffer.from(publicKey).toString('hex');
    
    console.log('');
    console.log(`🆔 Key ID: ${keyId}`);
    console.log(`🔓 Public key: ${publicKeyHex}`);
    
  } catch (error) {
    throw new Error(`Failed to process key file: ${error instanceof Error ? error.message : String(error)}`);
  }
}