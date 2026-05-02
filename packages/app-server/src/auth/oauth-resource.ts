import type { Request, Response } from 'express';
import type { AppServerEnv } from '../env.js';

export function protectedResourceMetadata(env: AppServerEnv): Record<string, unknown> {
  return {
    resource: env.publicOrigin,
    authorization_servers: env.authIssuer ? [env.authIssuer] : [],
    scopes_supported: env.scopes,
    resource_documentation: env.resourceDocsUrl ?? `${env.publicOrigin}/privacy`,
  };
}

export function wwwAuthenticateHeader(
  env: AppServerEnv,
  errorDescription = 'Authentication required',
): string {
  return `Bearer resource_metadata="${env.publicOrigin}/.well-known/oauth-protected-resource", scope="${env.scopes.join(' ')}", error="insufficient_scope", error_description="${errorDescription}"`;
}

export function registerAuthRoutes(
  app: { get: (path: string, handler: (req: Request, res: Response) => void) => void },
  env: AppServerEnv,
): void {
  app.get('/.well-known/oauth-protected-resource', (_req, res) => {
    res.json(protectedResourceMetadata(env));
  });
}

export function requireBearerAuth(env: AppServerEnv, req: Request, res: Response): boolean {
  if (!env.authRequired) return true;

  const header = req.header('authorization');
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (token && env.devBearerToken && token === env.devBearerToken) return true;

  res.setHeader('WWW-Authenticate', wwwAuthenticateHeader(env));
  res.status(401).json({
    jsonrpc: '2.0',
    error: {
      code: -32001,
      message: 'Authentication required.',
    },
    id: null,
  });
  return false;
}
