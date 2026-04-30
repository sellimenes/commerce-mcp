import { z } from 'zod';

/**
 * Loads and validates environment variables against a Zod schema. Throws a
 * formatted error on failure — let it propagate so the bin script can write
 * a single, readable message to stderr and exit non-zero.
 */
export function loadEnvWith<T extends z.ZodRawShape>(
  shape: T,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<z.ZodObject<T>> {
  const schema = z.object(shape);
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

export const booleanFlag = z
  .union([z.literal('1'), z.literal('0'), z.literal('true'), z.literal('false'), z.undefined()])
  .transform((v) => v === '1' || v === 'true');
