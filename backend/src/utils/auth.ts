import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

/**
 * Validate session from request headers (supports both cookies and Bearer tokens).
 * Returns the session if valid, otherwise sends 401 response and returns null.
 */
export async function requireAuthSession(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<any | null> {
  try {
    // Create headers object from request
    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]) => {
      if (value) {
        headers.append(key, Array.isArray(value) ? value[0] : value);
      }
    });

    // Get session using Better Auth API - handles both cookies and Authorization header
    const session = await app.auth.api.getSession({ headers });

    // Check if session exists and has user
    if (!session?.user?.id) {
      app.logger.warn({}, 'Session validation failed: no session or user found');
      reply.code(401).send({ error: 'Unauthorized' });
      return null;
    }

    return session;
  } catch (error) {
    app.logger.error({ err: error }, 'Session validation error');
    reply.code(401).send({ error: 'Unauthorized' });
    return null;
  }
}
