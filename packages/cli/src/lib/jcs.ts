/**
 * JSON Canonicalization Scheme (JCS) implementation according to RFC 8785
 * https://tools.ietf.org/rfc/rfc8785.txt
 */

export function jcsCanonicalize(input: unknown): string {
  return serialize(input);
}

function serialize(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'string') {
    return serializeString(value);
  }
  
  if (typeof value === 'number') {
    return serializeNumber(value);
  }
  
  if (Array.isArray(value)) {
    return serializeArray(value);
  }
  
  if (typeof value === 'object' && value !== null) {
    return serializeObject(value as Record<string, unknown>);
  }
  
  throw new Error(`Cannot serialize value of type ${typeof value}`);
}

function serializeString(str: string): string {
  // Use JSON.stringify for proper UTF-8 escaping and quote handling
  return JSON.stringify(str);
}

function serializeNumber(num: number): string {
  // Handle special cases according to JCS
  if (!isFinite(num)) {
    throw new Error('Cannot serialize non-finite numbers');
  }
  
  // Use JSON.stringify for proper ECMAScript number formatting
  // This ensures compliance with RFC 8785 number representation
  return JSON.stringify(num);
}

function serializeArray(array: unknown[]): string {
  const elements = array.map(element => serialize(element));
  return `[${elements.join(',')}]`;
}

function serializeObject(obj: Record<string, unknown>): string {
  // Sort keys by UTF-16 code point value (lexicographic order)
  const sortedKeys = Object.keys(obj).sort((a, b) => {
    // Compare by UTF-16 code units (JavaScript's default string comparison)
    return a < b ? -1 : a > b ? 1 : 0;
  });
  
  const pairs = sortedKeys.map(key => {
    const serializedKey = serializeString(key);
    const serializedValue = serialize(obj[key]);
    return `${serializedKey}:${serializedValue}`;
  });
  
  return `{${pairs.join(',')}}`;
}

// Test vectors for JCS validation 
export const RFC8785_TEST_VECTORS = [
  {
    input: {},
    expected: '{}'
  },
  {
    input: { "b": 2, "a": 1, "c": 3 },
    expected: '{"a":1,"b":2,"c":3}'
  },
  {
    input: { "strings": ["", "A", "B", "a", "b"] },
    expected: '{"strings":["","A","B","a","b"]}'
  },
  {
    input: { "literals": [false, null, true] },
    expected: '{"literals":[false,null,true]}'
  },
  {
    input: { "numbers": [1, 2.5, 1e30] },
    expected: '{"numbers":[1,2.5,1e+30]}'
  }
];

// Convenience function that matches the existing API
export function canonicalizeJSON(input: unknown): string {
  return jcsCanonicalize(input);
}

// Validation function to ensure our implementation matches RFC 8785
export function validateJCS(): boolean {
  try {
    for (const testVector of RFC8785_TEST_VECTORS) {
      const result = jcsCanonicalize(testVector.input);
      if (result !== testVector.expected) {
        console.error(`JCS validation failed for input:`, testVector.input);
        console.error(`Expected: ${testVector.expected}`);
        console.error(`Got:      ${result}`);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('JCS validation error:', error);
    return false;
  }
}