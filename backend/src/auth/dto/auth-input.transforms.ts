import type { TransformFnParams } from 'class-transformer';

export function normalizeEmail({ value }: TransformFnParams): unknown {
  const input: unknown = value;
  return typeof input === 'string' ? input.trim().toLowerCase() : input;
}

export function trimText({ value }: TransformFnParams): unknown {
  const input: unknown = value;
  return typeof input === 'string' ? input.trim() : input;
}

export function trimOptionalText({ value }: TransformFnParams): unknown {
  const input: unknown = value;
  if (typeof input !== 'string') return input;
  return input.trim() || undefined;
}
