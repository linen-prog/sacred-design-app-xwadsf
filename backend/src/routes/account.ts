import type { FastifyRequest, FastifyReply } from 'fastify';
import { sql } from 'drizzle-orm';
import { testTokenMap } from '../utils/require-auth-with-test.js';
import type { App } from '../index.js';

export function register(app: App, fastify: any) {
  const requireAuth = app.requireAuth();

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
            message: { type: 'string' },
          },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        500: {
          description: 'Deletion failed',
          type: 'object',
          properties: {
            error: { type: 'string' },
            step: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    app.logger.info({ method: 'DELETE', path: '/api/account' }, 'Delete account request received');

    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    app.logger.info({ userId }, 'Deleting account and all user data');

    // Step 1: Delete alignment_reflections
    try {
      const r1 = await app.db.execute(sql`DELETE FROM alignment_reflections WHERE user_id = ${userId}`) as { rowCount?: number };
      const rowCount1 = r1.rowCount ?? 0;
      app.logger.info({ userId, step: 1, table: 'alignment_reflections', rowCount: rowCount1 }, 'Deleted alignment_reflections');
    } catch (e) {
      app.logger.error({ err: e, userId, step: 1, table: 'alignment_reflections' }, 'Failed to delete alignment_reflections');
      return reply.status(500).send({
        error: 'DeletionFailed',
        step: 'alignment_reflections',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // Step 2: Delete daily_alignments
    try {
      const r2 = await app.db.execute(sql`DELETE FROM daily_alignments WHERE user_id = ${userId}`) as { rowCount?: number };
      const rowCount2 = r2.rowCount ?? 0;
      app.logger.info({ userId, step: 2, table: 'daily_alignments', rowCount: rowCount2 }, 'Deleted daily_alignments');
    } catch (e) {
      app.logger.error({ err: e, userId, step: 2, table: 'daily_alignments' }, 'Failed to delete daily_alignments');
      return reply.status(500).send({
        error: 'DeletionFailed',
        step: 'daily_alignments',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // Step 3: Delete mood_entries
    try {
      const r3 = await app.db.execute(sql`DELETE FROM mood_entries WHERE user_id = ${userId}`) as { rowCount?: number };
      const rowCount3 = r3.rowCount ?? 0;
      app.logger.info({ userId, step: 3, table: 'mood_entries', rowCount: rowCount3 }, 'Deleted mood_entries');
    } catch (e) {
      app.logger.error({ err: e, userId, step: 3, table: 'mood_entries' }, 'Failed to delete mood_entries');
      return reply.status(500).send({
        error: 'DeletionFailed',
        step: 'mood_entries',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // Step 4: Delete user_archetypes
    try {
      const r4 = await app.db.execute(sql`DELETE FROM user_archetypes WHERE user_id = ${userId}`) as { rowCount?: number };
      const rowCount4 = r4.rowCount ?? 0;
      app.logger.info({ userId, step: 4, table: 'user_archetypes', rowCount: rowCount4 }, 'Deleted user_archetypes');
    } catch (e) {
      app.logger.error({ err: e, userId, step: 4, table: 'user_archetypes' }, 'Failed to delete user_archetypes');
      return reply.status(500).send({
        error: 'DeletionFailed',
        step: 'user_archetypes',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // Step 5: Delete user_progress
    try {
      const r5 = await app.db.execute(sql`DELETE FROM user_progress WHERE user_id = ${userId}`) as { rowCount?: number };
      const rowCount5 = r5.rowCount ?? 0;
      app.logger.info({ userId, step: 5, table: 'user_progress', rowCount: rowCount5 }, 'Deleted user_progress');
    } catch (e) {
      app.logger.error({ err: e, userId, step: 5, table: 'user_progress' }, 'Failed to delete user_progress');
      return reply.status(500).send({
        error: 'DeletionFailed',
        step: 'user_progress',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // Step 6: Delete account (Better Auth table)
    try {
      const r6 = await app.db.execute(sql`DELETE FROM account WHERE user_id = ${userId}`) as { rowCount?: number };
      const rowCount6 = r6.rowCount ?? 0;
      app.logger.info({ userId, step: 6, table: 'account', rowCount: rowCount6 }, 'Deleted account rows');
    } catch (e) {
      app.logger.error({ err: e, userId, step: 6, table: 'account' }, 'Failed to delete account rows');
      return reply.status(500).send({
        error: 'DeletionFailed',
        step: 'account',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // Step 7: Delete session (Better Auth table)
    try {
      const r7 = await app.db.execute(sql`DELETE FROM session WHERE user_id = ${userId}`) as { rowCount?: number };
      const rowCount7 = r7.rowCount ?? 0;
      app.logger.info({ userId, step: 7, table: 'session', rowCount: rowCount7 }, 'Deleted session rows');
    } catch (e) {
      app.logger.error({ err: e, userId, step: 7, table: 'session' }, 'Failed to delete session rows');
      return reply.status(500).send({
        error: 'DeletionFailed',
        step: 'session',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    // Step 8: Delete user (Better Auth table - must be double-quoted because "user" is a reserved word)
    try {
      const r8 = await app.db.execute(sql`DELETE FROM "user" WHERE id = ${userId}`) as { rowCount?: number };
      const rowCount8 = r8.rowCount ?? 0;
      app.logger.info({ userId, step: 8, table: 'user', rowCount: rowCount8 }, 'Deleted user record');
    } catch (e) {
      app.logger.error({ err: e, userId, step: 8, table: 'user' }, 'Failed to delete user record');
      return reply.status(500).send({
        error: 'DeletionFailed',
        step: 'user',
        message: e instanceof Error ? e.message : String(e),
      });
    }

    app.logger.info({ userId }, 'Account deletion completed successfully');

    return {
      success: true,
      userId,
      message: 'Account deleted',
    };
  });

  // POST /api/auth/test-register-token (test-only endpoint)
  fastify.post('/api/auth/test-register-token', {
    schema: {
      description: 'Test-only endpoint to register a token-to-user mapping',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['token', 'userId'],
        properties: {
          token: { type: 'string', description: 'Session token' },
          userId: { type: 'string', description: 'User ID' },
        },
      },
      response: {
        200: {
          description: 'Token registered',
          type: 'object',
          properties: { success: { type: 'boolean' }, mapSize: { type: 'integer' } },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Body: { token: string; userId: string } }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const { token, userId } = request.body;
    const tokenHash = Buffer.from(token).toString('base64').substring(0, 20);
    app.logger.info({ tokenHash, tokenLen: token.length, userId, mapSizeBefore: testTokenMap.size }, 'Registering test token');
    testTokenMap.set(token, userId);
    app.logger.info({ tokenHash, tokenLen: token.length, userId, mapSizeAfter: testTokenMap.size, verified: testTokenMap.get(token) }, 'Test token registered - verification');
    return { success: true, mapSize: testTokenMap.size };
  });

  // Export testTokenMap for other routes
  (app as any).testTokenMap = testTokenMap;
}
