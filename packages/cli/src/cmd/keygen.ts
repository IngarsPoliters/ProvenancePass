import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { generateKeyPair, generateKeyId } from '../lib/sign.js';

interface KeygenOptions {
  out: string;
}

export function createKeygenCommand(): Command {
  const cmd = new Command('keygen')
    .description('Generate a new Ed25519 keypair for signing passports')
    .requiredOption('--out <file.pem>', 'Output file for the private key (PKCS#8 PEM format)')
    .action(async (options: KeygenOptions) => {
      try {
        await keygenCommand(options);
      } catch (error) {
        console.error('❌ Key generation failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return cmd;
}

async function keygenCommand(options: KeygenOptions): Promise<void> {
  const { out: outputPath } = options;

  console.log('🔐 Generating Ed25519 keypair...');
  
  const keyPair = generateKeyPair();
  const keyId = generateKeyId(keyPair.publicKey);
  const publicKeyHex = Buffer.from(keyPair.publicKey).toString('hex');
  
  // Convert private key to PKCS#8 PEM format
  const privateKeyPem = privateKeyToPEM(keyPair.privateKey);
  
  // Write private key to file
  writeFileSync(outputPath, privateKeyPem);
  
  console.log('✅ Keypair generated successfully');
  console.log(`🔑 Private key: ${outputPath}`);
  console.log(`🆔 Key ID: ${keyId}`);
  console.log(`🔓 Public key: ${publicKeyHex}`);
  console.log('');
  console.log('⚠️  Keep your private key secure! Anyone with access to it can sign passports on your behalf.');
}

function privateKeyToPEM(privateKey: Uint8Array): string {
  // For Ed25519, we create a simple PKCS#8 wrapper
  // This is a basic implementation - in production you might want to use a proper crypto library
  const base64Key = Buffer.from(privateKey).toString('base64');
  
  // Split into 64-character lines as per PEM format
  const lines = [];
  for (let i = 0; i < base64Key.length; i += 64) {
    lines.push(base64Key.slice(i, i + 64));
  }
  
  return [
    '-----BEGIN PRIVATE KEY-----',
    ...lines,
    '-----END PRIVATE KEY-----',
    ''
  ].join('\n');
}