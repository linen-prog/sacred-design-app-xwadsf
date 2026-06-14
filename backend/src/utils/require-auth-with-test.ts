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
  // Check for test token first
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length).trim();
    app.logger.debug({ tokenPrefix: token.substring(0, 15), mapSize: testTokenMap.size }, 'Checking test token map');

    const userId = testTokenMap.get(token);
    if (userId) {
      app.logger.debug({ userId, token: token.substring(0, 15) }, 'Found token in test map');
      try {
        // Look up user from database
        const users = await app.db.select().from(user).where(eq(user.id, userId)).limit(1);
        if (users.length > 0) {
          app.logger.info({ userId }, 'Authenticated via test token');
          return { user: users[0] };
        } else {
          app.logger.warn({ userId }, 'Token found but user not in database');
        }
      } catch (err) {
        app.logger.error({ err, userId }, 'Error looking up user for test token');
      }
    } else {
      app.logger.debug({ token: token.substring(0, 15) }, 'Token not in test map');
    }
  }

  // Fall back to framework's requireAuth
  app.logger.debug('Calling framework requireAuth');
  const session = await requireAuth(request, reply);
  return session;
}
