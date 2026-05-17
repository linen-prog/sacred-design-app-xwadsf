import type { FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import type { App } from '../index.js';

export function register(app: App, fastify: any) {
  // Helper function to get session from request headers
  const getSessionFromRequest = async (request: any) => {
    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]: [string, any]) => {
      if (value) {
        headers.append(key, Array.isArray(value) ? value[0] : value);
      }
    });
    return app.auth.api.getSession({ headers });
  };

  // DELETE /api/account
  fastify.delete('/api/account', {
    schema: {
      description: 'Permanently delete the authenticated user\'s account and all associated data',
      tags: ['account'],
      response: {
        200: {
          description: 'Account deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean } | void> => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    app.logger.info({ userId }, 'Deleting user account');

    try {
      // Delete in FK-safe order using raw SQL
      // 1. alignment_reflections
      await app.db.execute(sql`DELETE FROM alignment_reflections WHERE user_id = ${userId}`);

      // 2. daily_alignments
      await app.db.execute(sql`DELETE FROM daily_alignments WHERE user_id = ${userId}`);

      // 3. user_archetypes
      await app.db.execute(sql`DELETE FROM user_archetypes WHERE user_id = ${userId}`);

      // 4. user_progress
      await app.db.execute(sql`DELETE FROM user_progress WHERE user_id = ${userId}`);

      // 5. account
      await app.db.execute(sql`DELETE FROM account WHERE user_id = ${userId}`);

      // 6. session
      await app.db.execute(sql`DELETE FROM "session" WHERE user_id = ${userId}`);

      // 7. user
      await app.db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`);

      app.logger.info({ userId }, 'Account deleted successfully');

      return {
        success: true,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to delete account');
      return reply.status(500).send({ error: 'Failed to delete account' });
    }
  });
}
