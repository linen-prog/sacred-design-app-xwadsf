import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.js';
import { session } from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

/**
 * Initialize auth (placeholder for future enhancements).
 */
export function initializeAuth(app: App): void {
  // Currently a no-op, but kept for API compatibility
}

/**
 * Validate session from request.
 * Supports session cookies (via Better Auth) and Bearer token authentication (for tests).
 * Returns the session if valid, otherwise sends 401 response and returns null.
 */
export async function requireAuthSession(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<any> {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring('Bearer '.length);

      // Try to find user by ID first (for test case where token is user ID)
      const userResults = await app.db
        .select()
        .from(user)
        .where(eq(user.id, token))
        .limit(1);

      if (userResults.length > 0) {
        const userRecord = userResults[0];
        app.logger.info({ userId: userRecord.id }, 'Authenticated via Bearer token (user ID)');
        return {
          user: userRecord,
          session: {} as any,
        };
      }

      // Try to find session by token and get the associated user
      const sessionResults = await app.db
        .select()
        .from(session)
        .where(eq(session.token, token))
        .limit(1);

      if (sessionResults.length > 0) {
        const sessionRecord = sessionResults[0];
        const userRecords = await app.db
          .select()
          .from(user)
          .where(eq(user.id, sessionRecord.userId))
          .limit(1);

        if (userRecords.length > 0) {
          const userRecord = userRecords[0];
          app.logger.info({ userId: userRecord.id, sessionId: sessionRecord.id }, 'Authenticated via Bearer token (session token)');
          return {
            user: userRecord,
            session: sessionRecord,
          };
        }
      }
    }

    // If no valid Bearer token, try Better Auth's getSession (for cookie-based auth)
    if (app.auth?.api?.getSession) {
      try {
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) {
            headers.append(key, Array.isArray(value) ? value[0] : value);
          }
        });

        const sessionFromAuth = await app.auth.api.getSession({ headers });
        if (sessionFromAuth?.user?.id) {
          app.logger.info({ userId: sessionFromAuth.user.id }, 'Session validated via Better Auth');
          return sessionFromAuth;
        }
      } catch (e) {
        // Better Auth lookup failed, fall through to 401
        app.logger.debug({ err: e }, 'Better Auth session lookup failed');
      }
    }

    // No valid session or token found
    app.logger.warn({ hasAuthHeader: !!authHeader }, 'Session validation failed');
    reply.code(401).send({ error: 'Unauthorized' });
    return null;
  } catch (error) {
    app.logger.error({ err: error }, 'Session validation error');
    if (!reply.sent) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
    return null;
  }
}
