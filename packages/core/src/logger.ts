import pino from 'pino';

/**
 * Stderr-only logger. Writing to stdout corrupts MCP stdio framing — every log
 * call in this codebase must go through here (or another stderr writer).
 */
export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',
    base: undefined,
  },
  pino.destination({ dest: 2, sync: false }),
);

export type Logger = typeof logger;
