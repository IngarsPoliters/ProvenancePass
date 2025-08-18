import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemaPath = resolve(__dirname, '../../../../docs/spec/pp-0.1.schema.json');

let cachedValidator: ValidateFunction | null = null;

export function getValidator(): ValidateFunction {
  if (cachedValidator) {
    return cachedValidator;
  }

  const ajv = new Ajv({ 
    allErrors: true,
    verbose: true,
    strict: false
  });
  
  addFormats(ajv);
  
  let schemaContent: string;
  try {
    schemaContent = readFileSync(schemaPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read schema file: ${schemaPath}`);
  }
  
  let schema: any;
  try {
    schema = JSON.parse(schemaContent);
  } catch (error) {
    throw new Error(`Invalid JSON in schema file: ${schemaPath}`);
  }
  
  cachedValidator = ajv.compile(schema);
  return cachedValidator;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export function validatePassport(passport: any): ValidationResult {
  const validator = getValidator();
  const valid = validator(passport);
  
  if (valid) {
    return { valid: true };
  }
  
  const errors = validator.errors?.map((error: any) => {
    const path = error.instancePath || 'root';
    return `${path}: ${error.message}`;
  }) || ['Unknown validation error'];
  
  return {
    valid: false,
    errors
  };
}

export function validatePassportThrow(passport: any): void {
  const result = validatePassport(passport);
  if (!result.valid) {
    const errorMessage = result.errors?.join(', ') || 'Validation failed';
    throw new Error(`Passport validation failed: ${errorMessage}`);
  }
}