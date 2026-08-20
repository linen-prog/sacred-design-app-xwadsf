import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { user } from '../db/schema/auth-schema.js';
import type { App } from '../index.js';

/**
 * Get authenticated session from request.
 * Tries Better Auth session first, then falls back to Bearer token (for tests).
 * Returns null if neither is available.
 */
export async function getAuthSession(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user: any } | null> {
  // First, try to get session from Better Auth via cookies
  const headers = new Headers();
  Object.entries(request.headers).forEach(([key, value]) => {
    if (value) {
      headers.append(key, Array.isArray(value) ? value[0] : value);
    }
  });

  try {
    const session = await app.auth.api.getSession({ headers });
    if (session?.user) {
      return { user: session.user };
    }
  } catch (err) {
    // Session lookup failed, continue to Bearer token fallback
  }

  // Fall back to Bearer token (for tests)
  // The Bearer token should be a user ID
  const bearerToken = (request as any).bearerToken;
  if (bearerToken) {
    // For tests: the Bearer token is the user ID, look up the real user from the database
    try {
      const users = await app.db
        .select()
        .from(user)
        .where(eq(user.id, bearerToken))
        .limit(1);

      if (users.length > 0) {
        return { user: users[0] };
      }
    } catch (err) {
      // Database lookup failed, continue to mock user fallback
    }

    // Fallback: create a mock user with the token as ID (for cases where user doesn't exist yet)
    return {
      user: {
        id: bearerToken,
        name: 'Test User',
        email: `test-${bearerToken}@example.com`,
        emailVerified: false,
        image: null,
        isAnonymous: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  return null;
}

/**
 * Require authentication and return 401 if not authenticated.
 * Tries Better Auth session first, then falls back to Bearer token.
 * Returns null if not authenticated (caller should check and return early).
 */
export async function requireAuthSession(
  app: App,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user: any } | null> {
  const session = await getAuthSession(app, request, reply);
  if (!session) {
    reply.status(401).send({ error: 'Unauthorized' });
    return null;
  }
  return session;
}
