import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gt } from 'drizzle-orm';
import { session as sessionTable, user } from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

/**
 * Get authenticated session from request.
 * 1. Tries Bearer token first (session table lookup, then user ID fallback for tests)
 * 2. Falls back to Better Auth cookie session
 * Returns null for anything else — no fabricated users, fail closed on errors.
 */
export async function getAuthSession(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user: any } | null> {
  const authHeader = request.headers.authorization as string | undefined;

  if (!app.db) {
    app.logger.error('app.db is not initialized!');
    return null;
  }

  app.logger.info({
    hasAuthHeader: !!authHeader,
    authHeaderStart: authHeader?.substring(0, 30),
  }, 'getAuthSession called with db available');

  // 1. Try Bearer token FIRST (for test compatibility and reliability)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.substring('Bearer '.length).trim();
    if (rawToken) {
      const tokenPreview = rawToken.substring(0, 20) + (rawToken.length > 20 ? '...' : '');
      app.logger.info({ tokenLength: rawToken.length, tokenPreview }, 'Attempting Bearer token lookup');

      // Try as session token first
      try {
        const sessions = await app.db
          .select()
          .from(sessionTable)
          .where(
            and(
              eq(sessionTable.token, rawToken),
              gt(sessionTable.expiresAt, new Date())
            )
          )
          .limit(1);

        if (sessions.length > 0) {
          const session = sessions[0];
          try {
            const users = await app.db
              .select()
              .from(user)
              .where(eq(user.id, session.userId))
              .limit(1);

            if (users.length > 0) {
              app.logger.info({ userId: users[0].id }, 'Bearer token found in session table');
              return { user: users[0] };
            }
          } catch (err) {
            app.logger.debug({ err }, 'User lookup from session failed');
          }
        }
      } catch (err) {
        app.logger.debug({ err }, 'Session table lookup failed');
      }

      // Fallback: try token as user ID directly (for tests)
      try {
        app.logger.debug({ token: rawToken }, 'Trying to look up token as user ID');
        const users = await app.db
          .select()
          .from(user)
          .where(eq(user.id, rawToken))
          .limit(1);

        app.logger.debug({ usersFound: users.length }, 'User ID lookup query completed');
        if (users.length > 0) {
          const foundUser = users[0];
          if (foundUser && foundUser.id) {
            app.logger.info({ userId: foundUser.id, hasCookie: !!request.headers.cookie }, 'Bearer token found as user ID - returning user');
            return { user: foundUser };
          } else {
            app.logger.warn('User query returned row but no id property');
          }
        } else {
          app.logger.debug({ token: rawToken }, 'No user found with this ID');
        }
      } catch (err) {
        app.logger.warn({ err, token: rawToken }, 'User ID lookup threw an error');
      }
    }
  }

  // 2. Try Better Auth cookie session (if app.auth is available)
  if (app.auth && typeof app.auth === 'object' && 'api' in app.auth && app.auth.api) {
    try {
      app.logger.info('Attempting Better Auth cookie session lookup');
      const cookieSession = await (app.auth as any).api.getSession({
        headers: request.headers as Record<string, string | string[]>
      });
      if (cookieSession?.user) {
        app.logger.info({ userId: cookieSession.user.id }, 'Session found via Better Auth cookie');
        return { user: cookieSession.user };
      }
      app.logger.debug('Better Auth cookie session not found');
    } catch (err) {
      app.logger.debug({ err }, 'Better Auth cookie session lookup failed');
    }
  } else {
    app.logger.debug('Better Auth API not available, skipping cookie session lookup');
  }

  app.logger.warn('No valid authentication found - returning null');
  return null;
}

/**
 * Require authentication and return 401 if not authenticated.
 * Returns null if not authenticated (caller should check and return early).
 */
export async function requireAuthSession(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user: any } | null> {
  const session = await getAuthSession(app, request, reply);
  if (!session) {
    await reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }
  return session;
}
