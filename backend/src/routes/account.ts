import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import * as authSchema from '../db/schema/auth-schema.js';
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
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    app.logger.info({ userId }, 'Deleting user account');

    try {
      // Get user email before deletion
      const userRows = await app.db
        .select()
        .from(authSchema.user)
        .where(eq(authSchema.user.id, userId))
        .limit(1);

      const userEmail = userRows.length > 0 ? userRows[0].email : null;

      // Delete in order to respect FK constraints
      // 1. alignment_reflections
      await app.db
        .delete(schema.alignmentReflections)
        .where(eq(schema.alignmentReflections.userId, userId));

      // 2. daily_alignments
      await app.db
        .delete(schema.dailyAlignments)
        .where(eq(schema.dailyAlignments.userId, userId));

      // 3. user_progress
      await app.db
        .delete(schema.userProgress)
        .where(eq(schema.userProgress.userId, userId));

      // 4. user_archetypes
      await app.db
        .delete(schema.userArchetypes)
        .where(eq(schema.userArchetypes.userId, userId));

      // 5. session
      await app.db
        .delete(authSchema.session)
        .where(eq(authSchema.session.userId, userId));

      // 6. account
      await app.db
        .delete(authSchema.account)
        .where(eq(authSchema.account.userId, userId));

      // 7. verification (only if user has email)
      if (userEmail) {
        await app.db
          .delete(authSchema.verification)
          .where(eq(authSchema.verification.identifier, userEmail));
      }

      // 8. user
      await app.db
        .delete(authSchema.user)
        .where(eq(authSchema.user.id, userId));

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
