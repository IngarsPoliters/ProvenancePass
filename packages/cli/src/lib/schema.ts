import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../schema/pp-0.1.schema.json' assert { type: 'json' };

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validator = ajv.compile(schema);

export function getValidator(): ValidateFunction {
  return validator;
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