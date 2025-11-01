import { ValidationError } from './errors.js';

export function validateRequired(
  value: unknown,
  fieldName: string
): asserts value is NonNullable<typeof value> {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateString(value: unknown, fieldName: string): string {
  validateRequired(value, fieldName);
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  return value;
}

export function validateNumber(value: unknown, fieldName: string): number {
  validateRequired(value, fieldName);
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  return value;
}

export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  const str = validateString(value, fieldName);
  if (!allowedValues.includes(str as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      { allowedValues }
    );
  }
  return str as T;
}

export function validateOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ValidationError('Value must be a string if provided');
  }
  return value;
}

export function validateOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError('Value must be a number if provided');
  }
  return value;
}

export function validateAddress(address: unknown, fieldName: string = 'address'): string {
  const addr = validateString(address, fieldName);
  if (!addr.match(/^0x[a-fA-F0-9]{40}$/) && addr.toUpperCase() !== 'NATIVE') {
    throw new ValidationError(
      `${fieldName} must be a valid Ethereum address (0x...) or "NATIVE"`
    );
  }
  return addr;
}
