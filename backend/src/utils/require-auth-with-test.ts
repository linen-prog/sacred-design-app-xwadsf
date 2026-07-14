import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

// In-memory token map - will be populated by test registration endpoint
// Using a module-level variable ensures it persists across requests
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
  app.logger.debug({ mapSize: testTokenMap.size }, 'requireAuthWithTestTokens called, checking testTokenMap');

  // Check if test user was injected by the onRequest hook
  const testUser = (request as any).testUser;
  if (testUser && testUser.id) {
    app.logger.info({ userId: testUser.id, source: 'hook' }, 'Using test user from hook');
    return { user: testUser };
  }

  // Check for test token (either from header or extracted by hook)
  let token = (request as any).testToken;
  if (!token) {
    const authHeader = request.headers.authorization as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring('Bearer '.length).trim();
      app.logger.debug({ tokenLength: token.length }, 'Extracted token from authorization header');
    }
  } else {
    app.logger.debug({ tokenLength: token.length }, 'Found testToken on request object from hook');
  }

  if (token) {
    const userId = testTokenMap.get(token);
    const allTokens = Array.from(testTokenMap.entries());
    app.logger.info({
      tokenProvided: !!token,
      tokenLength: token?.length,
      userIdFound: !!userId,
      mapSize: testTokenMap.size,
      allTokensLength: allTokens.length,
      lookingForToken: token,
      source: 'bearer-token'
    }, 'Test token lookup');

    if (userId) {
      try {
        // Look up user from database
        app.logger.debug({ userId }, 'Looking up user in database');
        const users = await app.db.select().from(user).where(eq(user.id, userId)).limit(1);
        app.logger.info({ userFound: users.length > 0, userId }, 'Database lookup result');
        if (users.length > 0) {
          app.logger.info({ userId: users[0].id, email: users[0].email }, 'Test authentication successful');
          return { user: users[0] };
        }
      } catch (err) {
        app.logger.error({ err, userId }, 'Error looking up test user in database');
      }
    } else {
      app.logger.warn({
        token,
        mapSize: testTokenMap.size,
        mapEntries: allTokens.map(([k, v]) => ({ tokenKey: k, userId: v }))
      }, 'Token not found in testTokenMap');
    }
  } else {
    app.logger.warn({ authHeader: request.headers.authorization ? 'present' : 'missing', testTokenOnRequest: !!(request as any).testToken }, 'No token provided for test auth');
  }

  // Fall back to framework's requireAuth
  app.logger.info({ testTokenProvided: !!token }, 'Falling back to framework requireAuth');
  try {
    const session = await requireAuth(request, reply);
    return session;
  } catch (err) {
    app.logger.warn({ err }, 'Framework requireAuth failed');
    if (!reply.sent) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
    return null;
  }
}
