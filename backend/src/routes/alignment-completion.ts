import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { generateText } from 'ai';
import { gateway } from '@specific-dev/framework';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface CompleteAlignmentBody {
  completed: boolean;
  reflection_text?: string;
}

interface ReflectionBody {
  reflection_text: string;
}

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

const FALLBACK_ALIGNMENT = {
  action: 'Take one moment today to pause and notice how you feel before responding to someone.',
  guidance: 'Before your next conversation, take a breath and check in with your body. Notice any tension or ease. Let that awareness guide how you show up.',
  somatic_cue: 'Place one hand on your chest and take a slow breath before speaking.',
  scripture: 'Be still, and know that I am God. — Psalm 46:10',
  reflection_prompt: 'Where did you feel most like yourself today?',
};

export function register(app: App, fastify: any) {
  const requireAuth = app.requireAuth();

  // POST /api/alignments/generate
  fastify.post('/api/alignments/generate', {
    schema: {
      description: 'Generate a daily alignment using the user\'s saved archetype',
      tags: ['alignments'],
      response: {
        201: {
          description: 'Daily alignment generated successfully',
          type: 'object',
          properties: {
            alignment: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                user_id: { type: 'string' },
                day_number: { type: 'integer' },
                level: { type: 'integer' },
                action: { type: 'string' },
                guidance: { type: 'string' },
                somatic_cue: { type: 'string' },
                scripture: { type: 'string' },
                reflection_prompt: { type: ['string', 'null'] },
                primary_archetype: { type: 'string' },
                secondary_archetype: { type: 'string' },
                blend_name: { type: 'string' },
                generated_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          description: 'No archetype found',
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
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    try {
      app.logger.info({ userId }, '[generate] userId: ' + userId);

      // Query user's archetype
      const archetypeRows = await app.db
        .select()
        .from(schema.userArchetypes)
        .where(eq(schema.userArchetypes.userId, userId))
        .orderBy(desc(schema.userArchetypes.completedAt))
        .limit(1);

      if (archetypeRows.length === 0) {
        app.logger.info({ userId }, '[generate] No archetype found');
        return reply.status(400).send({ error: 'No archetype found for user' });
      }

      const row = archetypeRows[0];
      app.logger.info({ userId }, '[generate] archetype row: ' + JSON.stringify(row));

      const primaryArchetype = row.primaryArchetype;
      const secondaryArchetype = row.secondaryArchetype;
      const blendName = row.blendName;

      // Query user_progress to get day_count
      const progressRows = await app.db
        .select()
        .from(schema.userProgress)
        .where(eq(schema.userProgress.userId, userId))
        .limit(1);

      let dayCount = 1;
      if (progressRows.length > 0) {
        dayCount = progressRows[0].dayCount || 1;
      }

      const dayNumber = dayCount;
      const level = Math.min(Math.ceil(dayCount / 7), 10);

      app.logger.info({ userId, dayNumber, level }, '[generate] day_number: ' + dayNumber + ', level: ' + level);

      // Call AI to generate alignment
      const prompt = `You are a sacred design spiritual guide. Generate a daily alignment for someone whose sacred design blend is '${blendName}' (primary archetype: ${primaryArchetype}, secondary: ${secondaryArchetype}). Day ${dayNumber}, Level ${level}.

Return ONLY valid JSON with these exact keys:
{
  "action": "a short actionable spiritual practice for the day (1-2 sentences)",
  "guidance": "2-3 sentences of spiritual/design guidance tailored to their archetype blend",
  "scripture": "a relevant scripture verse or wisdom quote with attribution",
  "somatic_cue": "a body-based awareness cue or physical practice (1-2 sentences)",
  "reflection_prompt": "a journaling prompt for deeper self-inquiry"
}`;

      let aiOutput = FALLBACK_ALIGNMENT;
      try {
        const { text } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          prompt,
        });

        app.logger.info({ userId }, '[generate] AI raw response: ' + text);
        aiOutput = JSON.parse(text);
      } catch (aiError) {
        app.logger.warn({ err: aiError, userId }, '[generate] AI generation failed, using fallback');
      }

      // Insert into daily_alignments
      const insertResult = await app.db
        .insert(schema.dailyAlignments)
        .values({
          userId,
          dayNumber,
          level,
          action: aiOutput.action,
          guidance: aiOutput.guidance,
          scripture: aiOutput.scripture,
          somaticCue: aiOutput.somatic_cue,
          reflectionPrompt: aiOutput.reflection_prompt,
          primaryArchetype: primaryArchetype,
          secondaryArchetype: secondaryArchetype,
          blendName: blendName,
          generatedAt: new Date(),
        })
        .returning();

      const inserted = insertResult[0];
      app.logger.info({ userId, alignmentId: inserted.id }, '[generate] inserted alignment id: ' + inserted.id);

      // Get today's date in YYYY-MM-DD format for last_active_date
      const today = new Date().toISOString().split('T')[0];

      // Upsert user_progress
      if (progressRows.length > 0) {
        // Update existing row
        await app.db
          .update(schema.userProgress)
          .set({
            dayCount: dayCount + 1,
            lastActiveDate: today,
            updatedAt: new Date(),
          })
          .where(eq(schema.userProgress.userId, userId));

        app.logger.info({ userId, newDayCount: dayCount + 1 }, '[generate] user_progress updated');
      } else {
        // Insert new row
        await app.db
          .insert(schema.userProgress)
          .values({
            userId,
            dayCount: 2,
            lastActiveDate: today,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        app.logger.info({ userId }, '[generate] user_progress created');
      }

      reply.status(201);
      return { alignment: inserted };
    } catch (error) {
      app.logger.error({ err: error, userId }, '[generate] Failed to generate alignment');
      if (error instanceof SyntaxError) {
        return reply.status(500).send({ error: 'Failed to parse AI response' });
      }
      throw error;
    }
  });

  // GET /api/alignments/today
  fastify.get('/api/alignments/today', {
    schema: {
      description: "Get today's alignment",
      tags: ['alignments'],
      querystring: {
        type: 'object',
        properties: {
          local_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Optional local date in YYYY-MM-DD format' },
        },
      },
      response: {
        200: {
          description: "Today's alignment or null",
          type: 'object',
          properties: {
            alignment: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    user_id: { type: 'string' },
                    day_number: { type: 'integer' },
                    level: { type: 'integer' },
                    action: { type: 'string' },
                    guidance: { type: 'string' },
                    somatic_cue: { type: 'string' },
                    scripture: { type: 'string' },
                    reflection_prompt: { type: ['string', 'null'] },
                    primary_archetype: { type: 'string' },
                    secondary_archetype: { type: 'string' },
                    blend_name: { type: 'string' },
                    generated_at: { type: 'string', format: 'date-time' },
                  },
                },
                { type: 'null' },
              ],
            },
            message: { type: 'string' },
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
    request: FastifyRequest<{ Querystring: { local_date?: string } }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { local_date } = request.query;
    const dateForQuery = local_date || getTodayDate();

    try {
      app.logger.info({ userId, localDate: local_date }, `[today] userId: ${userId}, local_date: ${dateForQuery}`);

      const alignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(
          and(
            eq(schema.dailyAlignments.userId, userId),
            sql`DATE(${schema.dailyAlignments.generatedAt} AT TIME ZONE 'UTC') = ${dateForQuery}`
          )
        )
        .orderBy(desc(schema.dailyAlignments.generatedAt))
        .limit(1);

      if (alignments.length === 0) {
        app.logger.info({ userId }, '[today] No alignment found for today');
        return { alignment: null, message: 'No alignment found for today' };
      }

      const alignment = alignments[0];
      app.logger.info({ userId }, '[today] found alignment id: ' + alignment.id);

      return { alignment };
    } catch (error) {
      app.logger.error({ err: error, userId }, '[today] Failed to fetch today\'s alignment');
      throw error;
    }
  });

  // POST /api/alignments/:id/complete
  fastify.post('/api/alignments/:id/complete', {
    schema: {
      description: 'Mark an alignment as completed with optional reflection',
      tags: ['alignments'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['completed'],
        properties: {
          completed: { type: 'boolean', enum: [true] },
          reflection_text: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Alignment completed',
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
        403: {
          description: 'Forbidden',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          description: 'Not found',
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
    request: FastifyRequest<{ Params: { id: string }; Body: CompleteAlignmentBody }>,
    reply: FastifyReply
  ): Promise<{ success: boolean } | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { id } = request.params;
    const { completed, reflection_text } = request.body;

    app.logger.info({ userId, alignmentId: id, completed }, 'Completing alignment');

    try {
      // Fetch alignment
      const alignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(eq(schema.dailyAlignments.id, id))
        .limit(1);

      if (alignments.length === 0) {
        app.logger.warn({ userId, alignmentId: id }, 'Alignment not found');
        return reply.status(404).send({ error: 'Alignment not found' });
      }

      const alignment = alignments[0];

      // Verify ownership
      if (alignment.userId !== userId) {
        app.logger.warn({ userId, alignmentId: id }, 'Alignment access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Check if reflection already exists
      const existingReflections = await app.db
        .select()
        .from(schema.alignmentReflections)
        .where(
          and(
            eq(schema.alignmentReflections.alignmentId, id),
            eq(schema.alignmentReflections.userId, userId)
          )
        )
        .limit(1);

      if (existingReflections.length === 0) {
        // Insert reflection with empty text
        await app.db.insert(schema.alignmentReflections).values({
          userId,
          alignmentId: id,
          reflectionText: reflection_text || '',
          completedAt: new Date(),
        });
        app.logger.info({ alignmentId: id, userId, hasText: !!reflection_text }, 'Completion recorded');
      } else {
        app.logger.info({ alignmentId: id, userId }, 'Alignment already completed');
      }

      app.logger.info({ alignmentId: id, userId }, 'Alignment completed');

      return {
        success: true,
      };
    } catch (error) {
      app.logger.error({ err: error, userId, alignmentId: id }, 'Failed to complete alignment');
      throw error;
    }
  });

  // POST /api/alignments/:id/reflection
  fastify.post('/api/alignments/:id/reflection', {
    schema: {
      description: 'Submit or update a reflection for an alignment',
      tags: ['alignments'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['reflection_text'],
        properties: {
          reflection_text: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          description: 'Reflection submitted or updated',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            reflection: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                alignment_id: { type: 'string' },
                reflection_text: { type: 'string' },
                completed_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          description: 'Bad request - missing or empty reflection_text',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          description: 'Alignment not found',
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
    request: FastifyRequest<{ Params: { id: string }; Body: ReflectionBody }>,
    reply: FastifyReply
  ): Promise<{ success: boolean; reflection: any } | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { id } = request.params;
    const { reflection_text } = request.body;

    app.logger.info({ userId, alignmentId: id }, 'Submitting reflection');

    try {
      // Validate reflection_text is not empty
      if (!reflection_text || reflection_text.trim().length === 0) {
        app.logger.warn({ userId, alignmentId: id }, 'Reflection text is empty');
        return reply.status(400).send({ error: 'Reflection text is required and cannot be empty' });
      }

      // Fetch alignment and verify ownership
      const alignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(eq(schema.dailyAlignments.id, id))
        .limit(1);

      if (alignments.length === 0) {
        app.logger.warn({ userId, alignmentId: id }, 'Alignment not found');
        return reply.status(404).send({ error: 'Alignment not found' });
      }

      const alignment = alignments[0];

      // Verify ownership
      if (alignment.userId !== userId) {
        app.logger.warn({ userId, alignmentId: id }, 'Alignment access denied');
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Check if reflection already exists
      const existingReflections = await app.db
        .select()
        .from(schema.alignmentReflections)
        .where(
          and(
            eq(schema.alignmentReflections.alignmentId, id),
            eq(schema.alignmentReflections.userId, userId)
          )
        )
        .limit(1);

      let reflection;

      if (existingReflections.length > 0) {
        // Update existing reflection
        const updated = await app.db
          .update(schema.alignmentReflections)
          .set({
            reflectionText: reflection_text,
            completedAt: new Date(),
          })
          .where(
            and(
              eq(schema.alignmentReflections.alignmentId, id),
              eq(schema.alignmentReflections.userId, userId)
            )
          )
          .returning();

        reflection = updated[0];
        app.logger.info({ userId, alignmentId: id, reflectionId: reflection.id }, 'Reflection updated');
      } else {
        // Insert new reflection
        const inserted = await app.db
          .insert(schema.alignmentReflections)
          .values({
            userId,
            alignmentId: id,
            reflectionText: reflection_text,
            completedAt: new Date(),
          })
          .returning();

        reflection = inserted[0];
        app.logger.info({ userId, alignmentId: id, reflectionId: reflection.id }, 'Reflection created');
      }

      app.logger.info({ userId, alignmentId: id }, 'Reflection submitted successfully');

      return {
        success: true,
        reflection: {
          id: reflection.id,
          alignment_id: reflection.alignmentId,
          reflection_text: reflection.reflectionText,
          completed_at: reflection.completedAt.toISOString(),
        },
      };
    } catch (error) {
      app.logger.error({ err: error, userId, alignmentId: id }, 'Failed to submit reflection');
      throw error;
    }
  });

  // GET /api/alignments/history
  fastify.get('/api/alignments/history', {
    schema: {
      description: 'Get alignment history for the user',
      tags: ['alignments'],
      response: {
        200: {
          description: 'Alignment history',
          type: 'array',
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
  ): Promise<any[] | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    app.logger.info({ userId }, 'Fetching alignment history');

    try {
      const alignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(eq(schema.dailyAlignments.userId, userId))
        .orderBy(desc(schema.dailyAlignments.dayNumber));

      app.logger.info({ userId, count: alignments.length }, 'Retrieved alignment history');

      return alignments;
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch alignment history');
      throw error;
    }
  });

  // GET /api/alignments/progress
  fastify.get('/api/alignments/progress', {
    schema: {
      description: 'Get user alignment progress',
      tags: ['alignments'],
      response: {
        200: {
          description: 'User progress',
          type: 'object',
          properties: {
            day_count: { type: 'integer' },
            level: { type: 'integer' },
            last_active_date: { type: ['string', 'null'] },
          },
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
  ): Promise<any> => {
    try {
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      const session = await app.auth.api.getSession({ headers });
      const userId = session?.user.id;

      if (!userId) {
        app.logger.info({}, 'Fetching alignment progress for unauthenticated user');
        return {
          day_count: 0,
          level: 1,
          last_active_date: null,
        };
      }

      app.logger.info({ userId }, 'Fetching alignment progress');

      const alignmentCount = await app.db
        .select({ count: count() })
        .from(schema.dailyAlignments)
        .where(eq(schema.dailyAlignments.userId, userId));

      const dayCount = alignmentCount[0]?.count || 0;
      const level = Math.ceil((dayCount + 1) / 7);

      app.logger.info({ userId, dayCount }, 'Retrieved user progress');

      return {
        day_count: dayCount,
        level,
        last_active_date: null,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch progress');
      throw error;
    }
  });
}
