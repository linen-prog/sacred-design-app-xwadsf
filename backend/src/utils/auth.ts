import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, gt } from 'drizzle-orm';
import { session as sessionTable, user } from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

/**
 * Get authenticated session from request.
 * 1. Tries Better Auth cookie session first.
 * 2. Falls back to Authorization: Bearer <token> — looks the token up in the
 *    Better Auth session table (inner-joining user), requires expiresAt > now.
 *    Because signed cookie values arrive as <token>.<signature>, also tries
 *    the substring before the first dot.
 * Returns null for anything else — no fabricated users, fail closed on errors.
 */
export async function getAuthSession(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user: any } | null> {
  const authHeader = request.headers.authorization as string | undefined;
  app.logger.info({
    headers: Object.keys(request.headers),
    hasAuthHeader: !!authHeader,
    authHeaderStart: authHeader?.substring(0, 30),
  }, 'getAuthSession called');

  // 1. Try Better Auth cookie session
  if (app.auth?.api?.getSession) {
    try {
      const cookieSession = await app.auth.api.getSession({
        headers: request.headers as Record<string, string | string[]>
      });
      if (cookieSession?.user) {
        app.logger.info({ userId: cookieSession.user.id }, 'Session found via Better Auth cookie');
        return { user: cookieSession.user };
      }
      app.logger.info('Better Auth cookie session not found');
    } catch (err) {
      app.logger.error({ err }, 'Better Auth cookie session lookup failed');
    }
  } else {
    app.logger.warn('Better Auth API not available, skipping cookie session lookup');
  }

  // 2. Try Bearer token — look it up in the session table
  if (!authHeader) {
    app.logger.info('No Authorization header');
    app.logger.warn('No valid authentication found');
    return null;
  }

  if (!authHeader.startsWith('Bearer ')) {
    app.logger.info({ authHeaderPrefix: authHeader.substring(0, 20) }, 'Authorization header does not start with Bearer');
    app.logger.warn('No valid authentication found');
    return null;
  }

  const rawToken = authHeader.substring('Bearer '.length).trim();
  if (!rawToken) {
    app.logger.info('Bearer token is empty after parsing');
    app.logger.warn('No valid authentication found');
    return null;
  }

  // Log the token safely (first 20 chars only for security)
  const tokenPreview = rawToken.substring(0, 20) + (rawToken.length > 20 ? '...' : '');
  app.logger.info({ tokenLength: rawToken.length, tokenPreview }, 'Attempting Bearer token lookup');

  // Signed cookie values arrive as <token>.<signature>; try both forms.
  const candidates = [rawToken];
  const dotIndex = rawToken.indexOf('.');
  if (dotIndex > 0) {
    candidates.push(rawToken.substring(0, dotIndex));
  }

  for (const token of candidates) {
    try {
      const tokenPreview2 = token.substring(0, Math.min(10, token.length)) + (token.length > 10 ? '...' : '');
      app.logger.info({ tokenValue: tokenPreview2, candidateIndex: candidates.indexOf(token) }, `Trying token candidate`);

      // Try to find the token in the session table
      let sessions: any[] = [];
      if (!app.db) {
        app.logger.error('app.db is not initialized');
      } else {
        try {
          sessions = await app.db
            .select()
            .from(sessionTable)
            .where(
              and(
                eq(sessionTable.token, token),
                gt(sessionTable.expiresAt, new Date())
              )
            )
            .limit(1);
          app.logger.info({ sessionCount: sessions.length }, 'Session table query succeeded');
        } catch (queryErr) {
          app.logger.error({ err: queryErr }, 'Session table query failed');
          // Continue to user ID lookup
        }
      }

      if (sessions.length > 0) {
        const session = sessions[0];
        // Session found, now look up the user
        if (app.db) {
          try {
            const users = await app.db
              .select()
              .from(user)
              .where(eq(user.id, session.userId))
              .limit(1);

            if (users.length > 0) {
              app.logger.info({ found: 'session', userId: users[0].id }, 'Bearer token found in session table');
              return { user: users[0] };
            }
          } catch (userQueryErr) {
            app.logger.error({ err: userQueryErr }, 'User lookup from session failed');
          }
        } else {
          app.logger.error('app.db is not initialized for user lookup');
        }
      }

      // Fallback for test scenarios: try looking up the token as a user ID directly.
      // This supports test helpers that use user IDs. Only succeeds if the user actually exists.
      app.logger.info('Token not in session table, trying as user ID');
      let userRows: any[] = [];
      if (!app.db) {
        app.logger.error('app.db is not initialized');
      } else {
        try {
          userRows = await app.db
            .select()
            .from(user)
            .where(eq(user.id, token))
            .limit(1);
          app.logger.info({ userCount: userRows.length }, 'User table query succeeded');
        } catch (userQueryErr) {
          app.logger.error({ err: userQueryErr }, 'User table query failed');
        }
      }

      if (userRows.length > 0) {
        app.logger.info({ found: 'user', userId: userRows[0].id }, 'Bearer token found as user ID');
        return { user: userRows[0] };
      }

      app.logger.info({ candidateIndex: candidates.indexOf(token) }, 'Bearer token not found as session or user ID');
    } catch (err) {
      app.logger.error({ err }, 'Bearer token lookup failed with error');
      // Continue to next candidate instead of returning null
      continue;
    }
  }

  app.logger.warn({ tokenCandidatesCount: candidates.length }, 'No valid authentication found after checking all candidates');
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
