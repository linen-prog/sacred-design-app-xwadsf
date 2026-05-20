import type { FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import type { App } from '../index.js';

export function register(app: App, fastify: any) {
  // Helper function to get session from request
  const getSessionFromRequest = async (request: any) => {
    try {
      // Check if Better Auth middleware already attached session to request
      if (request.user || request.auth || request.session) {
        return request.session || { user: request.user } || request.auth;
      }

      // Try passing the Fastify request directly
      const session = await app.auth.api.getSession(request);
      if (session) return session;

      // If that doesn't work, try creating a fetch Request object
      const url = new URL(`http://${request.hostname || 'localhost'}${request.url}`);
      const fetchRequest = new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
      });
      const session2 = await app.auth.api.getSession(fetchRequest);
      if (session2) return session2;

      // Last fallback: try with just headers
      return await app.auth.api.getSession({ headers: request.headers });
    } catch (error) {
      app.logger.warn({ err: error }, 'Failed to get session');
      return null;
    }
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
            userId: { type: 'string' },
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
          properties: {
            error: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ success: boolean; userId: string } | void> => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    app.logger.info({ userId }, 'Deleting user account');

    try {
      // Delete in FK-safe order using parameterized queries

      // 1. alignment_reflections (references user via user_id and daily_alignments via alignment_id)
      const res1 = await app.db.execute(sql`DELETE FROM alignment_reflections WHERE user_id = ${userId}`) as { rowCount?: number };
      app.logger.info({ userId, rowCount: res1.rowCount }, 'Deleted alignment_reflections');

      // 2. daily_alignments (references user)
      const res2 = await app.db.execute(sql`DELETE FROM daily_alignments WHERE user_id = ${userId}`) as { rowCount?: number };
      app.logger.info({ userId, rowCount: res2.rowCount }, 'Deleted daily_alignments');

      // 3. mood_entries (references user)
      const res3 = await app.db.execute(sql`DELETE FROM mood_entries WHERE user_id = ${userId}`) as { rowCount?: number };
      app.logger.info({ userId, rowCount: res3.rowCount }, 'Deleted mood_entries');

      // 4. user_archetypes (references user)
      const res4 = await app.db.execute(sql`DELETE FROM user_archetypes WHERE user_id = ${userId}`) as { rowCount?: number };
      app.logger.info({ userId, rowCount: res4.rowCount }, 'Deleted user_archetypes');

      // 5. user_progress (references user)
      const res5 = await app.db.execute(sql`DELETE FROM user_progress WHERE user_id = ${userId}`) as { rowCount?: number };
      app.logger.info({ userId, rowCount: res5.rowCount }, 'Deleted user_progress');

      // 6. account (Better Auth table, references user)
      const res6 = await app.db.execute(sql`DELETE FROM account WHERE user_id = ${userId}`) as { rowCount?: number };
      app.logger.info({ userId, rowCount: res6.rowCount }, 'Deleted account');

      // 7. session (Better Auth table, references user)
      const res7 = await app.db.execute(sql`DELETE FROM "session" WHERE user_id = ${userId}`) as { rowCount?: number };
      app.logger.info({ userId, rowCount: res7.rowCount }, 'Deleted session');

      // 8. user (Better Auth user record)
      const res8 = await app.db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`) as { rowCount?: number };
      app.logger.info({ userId, rowCount: res8.rowCount }, 'Deleted user');

      app.logger.info({ userId }, 'Account deleted successfully');

      return {
        success: true,
        userId,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to delete account');
      return reply.status(500).send({
        error: 'Failed to delete account',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
