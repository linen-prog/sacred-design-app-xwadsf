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
  if (testUser && testUser.id) {
    return { user: testUser };
  }

  // Check for test token in Bearer header
  const authHeader = request.headers.authorization as string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring('Bearer '.length).trim();
    const userId = testTokenMap.get(token);

    if (userId) {
      try {
        // Look up user from database
        const users = await app.db.select().from(user).where(eq(user.id, userId)).limit(1);
        if (users.length > 0) {
          return { user: users[0] };
        }
      } catch (err) {
        // Continue to framework auth if lookup fails
      }
    }
  }

  // Fall back to framework's requireAuth
  try {
    const session = await requireAuth(request, reply);
    return session;
  } catch (err) {
    if (!reply.sent) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
    return null;
  }
}
