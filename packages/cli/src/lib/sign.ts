import * as ed25519 from '@noble/ed25519';
import { sha256String } from './hash.js';
import { jcsCanonicalize } from './jcs.js';
import { createHash } from 'crypto';

// Setup ed25519 with Node.js crypto
ed25519.etc.sha512Sync = (...m) => createHash('sha512').update(Buffer.concat(m)).digest();

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface Signature {
  algo: 'ed25519';
  public_key: string;
  signature: string;
  key_id: string;
}

export function generateKeyPair(): KeyPair {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

export function canonicalizeJSON(input: unknown): string {
  return jcsCanonicalize(input);
}

export function generateKeyId(publicKey: Uint8Array): string {
  const publicKeyHex = Buffer.from(publicKey).toString('hex');
  const hash = sha256String(publicKeyHex);
  return `ppk_${hash.slice(0, 16)}`;
}

export function privateKeyFromPEM(pemContent: string): Uint8Array {
  const base64Data = pemContent
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  
  const binaryData = Buffer.from(base64Data, 'base64');
  
  if (binaryData.length === 32) {
    return new Uint8Array(binaryData);
  }
  
  if (binaryData.length > 32) {
    return new Uint8Array(binaryData.slice(-32));
  }
  
  throw new Error('Invalid private key format');
}

export async function signPassport(passport: any, privateKey: Uint8Array): Promise<Signature> {
  const publicKey = ed25519.getPublicKey(privateKey);
  const keyId = generateKeyId(publicKey);
  
  const passportWithoutSignature = { ...passport };
  delete passportWithoutSignature.signature;
  
  const canonical = canonicalizeJSON(passportWithoutSignature);
  const messageBytes = new TextEncoder().encode(canonical);
  
  const signatureBytes = await ed25519.sign(messageBytes, privateKey);
  
  return {
    algo: 'ed25519',
    public_key: Buffer.from(publicKey).toString('hex'),
    signature: Buffer.from(signatureBytes).toString('hex'),
    key_id: keyId
  };
}

export async function verifyPassport(passport: any): Promise<boolean> {
  if (!passport.signature) {
    throw new Error('No signature found in passport');
  }
  
  const { signature } = passport;
  const passportWithoutSignature = { ...passport };
  delete passportWithoutSignature.signature;
  
  const canonical = canonicalizeJSON(passportWithoutSignature);
  const messageBytes = new TextEncoder().encode(canonical);
  
  const publicKeyBytes = Buffer.from(signature.public_key, 'hex');
  const signatureBytes = Buffer.from(signature.signature, 'hex');
  
  const expectedKeyId = generateKeyId(publicKeyBytes);
  if (signature.key_id !== expectedKeyId) {
    throw new Error('Key ID does not match public key');
  }
  
  return ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
}