#!/usr/bin/env node

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load schema and example
const schemaPath = join(__dirname, '../docs/spec/pp-0.1.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

// Example from the specification
const example = {
  "version": "0.1",
  "artifact": {
    "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "mime": "application/pdf",
    "name": "contract-final.pdf",
    "size": 45678,
    "created_at": "2024-01-15T14:30:00.000Z"
  },
  "inputs": [
    {
      "type": "source",
      "sha256": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      "name": "contract-draft.docx",
      "role": "template"
    },
    {
      "type": "external",
      "url": "https://legal.company.com/templates/v2.1",
      "accessed_at": "2024-01-15T14:25:00.000Z"
    }
  ],
  "steps": [
    {
      "action": "convert",
      "tool": "pandoc",
      "version": "3.1.2",
      "timestamp": "2024-01-15T14:28:00.000Z",
      "actor": {
        "type": "software",
        "id": "build-agent-7"
      }
    },
    {
      "action": "sign",
      "tool": "docusign",
      "timestamp": "2024-01-15T14:29:30.000Z",
      "actor": {
        "type": "human",
        "id": "john.doe@company.com"
      }
    }
  ],
  "review": {
    "status": "approved",
    "reviewer": "legal@company.com",
    "timestamp": "2024-01-15T14:29:45.000Z",
    "comments": "Contract terms verified and approved"
  },
  "policy_checks": [
    {
      "policy": "data-retention",
      "result": "pass",
      "timestamp": "2024-01-15T14:30:00.000Z",
      "details": "Retention period: 7 years"
    },
    {
      "policy": "pii-scan",
      "result": "pass",
      "timestamp": "2024-01-15T14:30:00.000Z",
      "findings": []
    }
  ],
  "signature": {
    "algo": "ed25519",
    "public_key": "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678",
    "signature": "1a2b3c4d5e6f78901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012"
  }
};

// Create validator with strict mode disabled for schema validation
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

// Compile schema
const validate = ajv.compile(schema);

// Validate example
const valid = validate(example);

if (valid) {
  console.log('✅ Example validates successfully against PP v0.1 schema');
  console.log(`📋 Schema: ${schema.title} (${schema.$id})`);
  console.log(`📄 Validated artifact: ${example.artifact.name} (${example.artifact.sha256.substring(0, 16)}...)`);
  console.log(`🔐 Signature algorithm: ${example.signature.algo}`);
  console.log(`📝 Inputs: ${example.inputs.length}, Steps: ${example.steps.length}, Policy checks: ${example.policy_checks.length}`);
} else {
  console.error('❌ Validation failed:');
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

// Test invalid examples
console.log('\n🧪 Testing invalid examples...');

const testCases = [
  {
    name: 'Missing required version',
    data: { ...example, version: undefined },
    expectedError: 'version'
  },
  {
    name: 'Invalid SHA-256 format',
    data: { 
      ...example, 
      artifact: { 
        ...example.artifact, 
        sha256: 'invalid-hash' 
      } 
    },
    expectedError: 'sha256'
  },
  {
    name: 'Invalid signature algorithm',
    data: { 
      ...example, 
      signature: { 
        ...example.signature, 
        algo: 'rsa' 
      } 
    },
    expectedError: 'algo'
  }
];

let failedTests = 0;
testCases.forEach(testCase => {
  const isValid = validate(testCase.data);
  if (!isValid) {
    console.log(`✅ ${testCase.name}: correctly rejected`);
  } else {
    console.log(`❌ ${testCase.name}: should have been rejected`);
    failedTests++;
  }
});

if (failedTests === 0) {
  console.log(`\n🎉 All ${testCases.length} validation tests passed!`);
} else {
  console.error(`\n💥 ${failedTests} validation tests failed!`);
  process.exit(1);
}