import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface SaveArchetypeBody {
  primary_archetype: string;
  secondary_archetype: string;
  blend_name: string;
  scores: Record<string, unknown>;
}

export function register(app: App, fastify: any) {
  const requireAuth = app.requireAuth();

  // POST /api/archetypes/save
  fastify.post('/api/archetypes/save', {
    schema: {
      description: 'Save or update user archetype quiz results',
      tags: ['archetypes'],
      body: {
        type: 'object',
        required: ['primary_archetype', 'secondary_archetype', 'blend_name', 'scores'],
        properties: {
          primary_archetype: { type: 'string', description: 'Primary archetype name' },
          secondary_archetype: { type: 'string', description: 'Secondary archetype name' },
          blend_name: { type: 'string', description: 'Blend name combining both archetypes' },
          scores: { type: 'object', description: 'Quiz scores object' },
        },
      },
      response: {
        200: {
          description: 'Archetype saved successfully',
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            primary_archetype: { type: 'string' },
            secondary_archetype: { type: 'string' },
            blend_name: { type: 'string' },
            scores: { type: 'object' },
            quiz_completed: { type: 'boolean' },
            completed_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          description: 'Bad request - missing required fields',
          type: 'object',
          properties: { error: { type: 'string' } },
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
    request: FastifyRequest<{ Body: SaveArchetypeBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { primary_archetype, secondary_archetype, blend_name, scores } = request.body;

    app.logger.info({ userId }, 'Saving archetype quiz results');

    try {
      // Check if archetype record already exists
      const existing = await app.db
        .select()
        .from(schema.userArchetypes)
        .where(eq(schema.userArchetypes.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        const updated = await app.db
          .update(schema.userArchetypes)
          .set({
            primaryArchetype: primary_archetype,
            secondaryArchetype: secondary_archetype,
            blendName: blend_name,
            scores,
            updatedAt: new Date(),
          })
          .where(eq(schema.userArchetypes.userId, userId))
          .returning();

        const archetype = updated[0];
        app.logger.info({ userId, archetypeId: archetype.id }, 'Archetype record updated');

        return {
          id: archetype.id,
          user_id: archetype.userId,
          primary_archetype: archetype.primaryArchetype,
          secondary_archetype: archetype.secondaryArchetype,
          blend_name: archetype.blendName,
          scores: archetype.scores,
          quiz_completed: archetype.quizCompleted,
          completed_at: archetype.completedAt.toISOString(),
          updated_at: archetype.updatedAt.toISOString(),
        };
      } else {
        // Insert new record
        const inserted = await app.db
          .insert(schema.userArchetypes)
          .values({
            userId,
            primaryArchetype: primary_archetype,
            secondaryArchetype: secondary_archetype,
            blendName: blend_name,
            scores,
          })
          .returning();

        const archetype = inserted[0];
        app.logger.info({ userId, archetypeId: archetype.id }, 'Archetype record created');

        return {
          id: archetype.id,
          user_id: archetype.userId,
          primary_archetype: archetype.primaryArchetype,
          secondary_archetype: archetype.secondaryArchetype,
          blend_name: archetype.blendName,
          scores: archetype.scores,
          quiz_completed: archetype.quizCompleted,
          completed_at: archetype.completedAt.toISOString(),
          updated_at: archetype.updatedAt.toISOString(),
        };
      }
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to save archetype');
      throw error;
    }
  });

  // POST /api/archetypes/upsert
  fastify.post('/api/archetypes/upsert', {
    schema: {
      description: 'Upsert user archetype data',
      tags: ['archetypes'],
      body: {
        type: 'object',
        required: ['primary_archetype', 'secondary_archetype', 'blend_name', 'scores'],
        properties: {
          primary_archetype: { type: 'string', description: 'Primary archetype name' },
          secondary_archetype: { type: 'string', description: 'Secondary archetype name' },
          blend_name: { type: 'string', description: 'Blend name combining both archetypes' },
          scores: { type: 'object', description: 'Scores object' },
        },
      },
      response: {
        200: {
          description: 'Archetype upserted successfully',
          type: 'object',
          properties: {
            archetype: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                user_id: { type: 'string' },
                primary_archetype: { type: 'string' },
                secondary_archetype: { type: 'string' },
                blend_name: { type: 'string' },
                scores: { type: 'object' },
                quiz_completed: { type: 'boolean' },
                completed_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
              },
            },
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
    request: FastifyRequest<{ Body: SaveArchetypeBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { primary_archetype, secondary_archetype, blend_name, scores } = request.body;

    app.logger.info({ userId }, 'Upserting archetype');

    try {
      // Check if archetype record already exists
      const existing = await app.db
        .select()
        .from(schema.userArchetypes)
        .where(eq(schema.userArchetypes.userId, userId))
        .limit(1);

      let archetype;

      if (existing.length > 0) {
        // Update existing record
        const updated = await app.db
          .update(schema.userArchetypes)
          .set({
            primaryArchetype: primary_archetype,
            secondaryArchetype: secondary_archetype,
            blendName: blend_name,
            scores,
            updatedAt: new Date(),
          })
          .where(eq(schema.userArchetypes.userId, userId))
          .returning();

        archetype = updated[0];
        app.logger.info({ userId, archetypeId: archetype.id }, 'Archetype updated');
      } else {
        // Insert new record
        const inserted = await app.db
          .insert(schema.userArchetypes)
          .values({
            userId,
            primaryArchetype: primary_archetype,
            secondaryArchetype: secondary_archetype,
            blendName: blend_name,
            scores,
            quizCompleted: true,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        archetype = inserted[0];
        app.logger.info({ userId, archetypeId: archetype.id }, 'Archetype created');
      }

      return {
        archetype: {
          id: archetype.id,
          user_id: archetype.userId,
          primary_archetype: archetype.primaryArchetype,
          secondary_archetype: archetype.secondaryArchetype,
          blend_name: archetype.blendName,
          scores: archetype.scores,
          quiz_completed: archetype.quizCompleted,
          completed_at: archetype.completedAt.toISOString(),
          updated_at: archetype.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to upsert archetype');
      throw error;
    }
  });

  // GET /api/archetypes/me
  fastify.get('/api/archetypes/me', {
    schema: {
      description: 'Get current user archetype quiz results',
      tags: ['archetypes'],
      response: {
        200: {
          description: 'User archetype data or quiz not completed',
          oneOf: [
            {
              type: 'object',
              properties: {
                quiz_completed: { type: 'boolean', enum: [true] },
                primary_archetype: { type: 'string' },
                secondary_archetype: { type: 'string' },
                blend_name: { type: 'string' },
                scores: { type: 'object' },
                completed_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
              },
            },
            {
              type: 'object',
              properties: {
                quiz_completed: { type: 'boolean', enum: [false] },
              },
            },
          ],
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
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    app.logger.info({ userId }, 'Fetching user archetype');

    try {
      const archetypes = await app.db
        .select()
        .from(schema.userArchetypes)
        .where(eq(schema.userArchetypes.userId, userId))
        .limit(1);

      if (archetypes.length === 0) {
        app.logger.info({ userId }, 'No archetype found, quiz not completed');
        return {
          quiz_completed: false,
        };
      }

      const archetype = archetypes[0];
      app.logger.info({ userId, archetypeId: archetype.id }, 'Retrieved user archetype');

      return {
        quiz_completed: true,
        primary_archetype: archetype.primaryArchetype,
        secondary_archetype: archetype.secondaryArchetype,
        blend_name: archetype.blendName,
        scores: archetype.scores,
        completed_at: archetype.completedAt.toISOString(),
        updated_at: archetype.updatedAt.toISOString(),
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch archetype');
      throw error;
    }
  });
}
