import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

// In-memory token map for test support only
export const testTokenMap = new Map<string, string>();

/**
 * Wraps the framework's requireAuth to also support test tokens.
 * Tries test token first, then falls back to framework auth.
 */
export async function requireAuthWithTestTokens(
  app: App,
  requireAuth: any,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Check if test user was injected by the onRequest hook
  const testUser = (request as any).testUser;
  if (testUser) {
    app.logger.info({ userId: testUser.id }, 'Using test user from request context');
    return { user: testUser };
  }

  // Check for test token first (fallback if hook didn't run)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length).trim();
    const tokenHash = Buffer.from(token).toString('base64').substring(0, 20);

    app.logger.debug({ tokenHash, tokenLen: token.length, mapSize: testTokenMap.size }, 'Checking test token map');

    const userId = testTokenMap.get(token);
    if (userId) {
      app.logger.debug({ userId, tokenHash, tokenLen: token.length }, 'Found token in test map');
      try {
        // Look up user from database
        const users = await app.db.select().from(user).where(eq(user.id, userId)).limit(1);
        if (users.length > 0) {
          app.logger.info({ userId }, 'Authenticated via test token');
          return { user: users[0] };
        } else {
          app.logger.warn({ userId }, 'Token found but user not in database');
          reply.status(401).send({ error: 'Unauthorized' });
          return null;
        }
      } catch (err) {
        app.logger.error({ err, userId }, 'Error looking up user for test token');
        reply.status(401).send({ error: 'Unauthorized' });
        return null;
      }
    } else {
      app.logger.debug({ tokenHash, tokenLen: token.length, mapSize: testTokenMap.size }, 'Token not in test map, falling back to framework auth');
    }
  }

  // Fall back to framework's requireAuth
  app.logger.debug('Calling framework requireAuth');
  const session = await requireAuth(request, reply);
  return session;
}
