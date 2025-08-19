import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the JSON Schema
const schemaPath = join(__dirname, '../../../docs/spec/pp-0.1.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

// Create AJV instance with format validation
const ajv = new Ajv({ 
  strict: false,
  validateFormats: true,
  allErrors: true
});
addFormats(ajv);

// Compile the schema
const validateSchema = ajv.compile(schema);

export interface ValidationResult {
  valid: boolean;
  errors?: any[];
  data?: any;
}

export function validatePassport(passport: any): ValidationResult {
  const valid = validateSchema(passport);
  
  return {
    valid,
    errors: validateSchema.errors || [],
    data: passport
  };
}

export function validatePassportStrict(passport: any): ValidationResult {
  // First validate against schema
  const schemaResult = validatePassport(passport);
  if (!schemaResult.valid) {
    return schemaResult;
  }

  // Additional strict validations beyond JSON Schema
  const errors: string[] = [];

  // Validate SHA-256 format (64 hex characters)
  if (passport.artifact?.sha256) {
    const sha256Regex = /^[a-fA-F0-9]{64}$/;
    if (!sha256Regex.test(passport.artifact.sha256)) {
      errors.push('artifact.sha256 must be exactly 64 hexadecimal characters');
    }
  }

  // Validate Ed25519 public key format (64 hex characters)
  if (passport.signature?.public_key) {
    const pubKeyRegex = /^[a-fA-F0-9]{64}$/;
    if (!pubKeyRegex.test(passport.signature.public_key)) {
      errors.push('signature.public_key must be exactly 64 hexadecimal characters');
    }
  }

  // Validate Ed25519 signature format (128 hex characters)
  if (passport.signature?.signature) {
    const sigRegex = /^[a-fA-F0-9]{128}$/;
    if (!sigRegex.test(passport.signature.signature)) {
      errors.push('signature.signature must be exactly 128 hexadecimal characters');
    }
  }

  // Validate timestamp format (must be valid ISO8601 UTC)
  if (passport.artifact?.created_at) {
    try {
      const date = new Date(passport.artifact.created_at);
      if (isNaN(date.getTime())) {
        errors.push('artifact.created_at must be a valid ISO8601 timestamp');
      }
      // Must end with Z (UTC)
      if (!passport.artifact.created_at.endsWith('Z')) {
        errors.push('artifact.created_at must be in UTC (end with Z)');
      }
    } catch (e) {
      errors.push('artifact.created_at must be a valid ISO8601 timestamp');
    }
  }

  // Validate version is exactly "0.1"
  if (passport.version !== "0.1") {
    errors.push('version must be exactly "0.1"');
  }

  // Validate signature algorithm is exactly "ed25519"
  if (passport.signature?.algo !== "ed25519") {
    errors.push('signature.algo must be exactly "ed25519"');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    data: passport
  };
}

export function createMinimalPassport(overrides: any = {}): any {
  return {
    version: "0.1",
    artifact: {
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      mime: "text/plain",
      created_at: "2024-08-19T15:30:00Z",
      ...overrides.artifact
    },
    signature: {
      algo: "ed25519",
      public_key: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      signature: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      ...overrides.signature
    },
    ...overrides
  };
}