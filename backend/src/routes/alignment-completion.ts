import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema/schema.js';
import { calculateNewStreak } from './progress.js';
import type { App } from '../index.js';

interface CompleteAlignmentBody {
  completed: boolean;
  reflection_text?: string;
}

interface GenerateAlignmentBody {
  local_date?: string;
}

interface ReflectionBody {
  reflection_text: string;
}

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function determineLevelFromDayCount(dayCount: number): number {
  if (dayCount <= 7) return 1;
  if (dayCount <= 21) return 2;
  return 3;
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
        200: {
          description: 'Daily alignment generated or retrieved',
          type: 'object',
          properties: {
            alignment: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                day_number: { type: 'integer' },
                level: { type: 'integer' },
                action: { type: 'string' },
                guidance: { type: 'string' },
                somatic_cue: { type: 'string' },
                scripture: { type: 'string' },
                reflection_prompt: { type: 'string' },
                primary_archetype: { type: 'string' },
                secondary_archetype: { type: 'string' },
                blend_name: { type: 'string' },
                generated_at: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          description: 'Archetype not found',
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
    const { local_date } = (request.body as GenerateAlignmentBody | undefined) || {};
    const dateForQuery = local_date || getTodayDate();

    app.logger.info({ userId, localDate: local_date }, 'Generating alignment');

    try {
      // Query user's archetype
      const archetypeRows = await app.db
        .select()
        .from(schema.userArchetypes)
        .where(eq(schema.userArchetypes.userId, userId))
        .limit(1);

      if (archetypeRows.length === 0) {
        app.logger.info({ userId }, 'No archetype found');
        return reply.status(400).send({ error: 'Archetype not found. Please complete the quiz first.' });
      }

      const archetype = archetypeRows[0];
      const primary_archetype = archetype.primaryArchetype;
      const secondary_archetype = archetype.secondaryArchetype;
      const blend_name = archetype.blendName;

      // Get day_count from user_progress or default to 0
      const progressRows = await app.db
        .select()
        .from(schema.userProgress)
        .where(eq(schema.userProgress.userId, userId))
        .limit(1);

      let dayCount = 0;
      if (progressRows.length > 0) {
        dayCount = progressRows[0].dayCount;
      }

      // New day_number = day_count + 1
      const dayNumber = dayCount + 1;
      const level = determineLevelFromDayCount(dayNumber);

      // Check if alignment exists for today
      const existingAlignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(
          and(
            eq(schema.dailyAlignments.userId, userId),
            sql`DATE(${schema.dailyAlignments.generatedAt}) = ${dateForQuery}`
          )
        )
        .limit(1);

      if (existingAlignments.length > 0) {
        app.logger.info({ userId }, 'Alignment already exists for today, returning existing');
        const alignment = existingAlignments[0];
        return {
          alignment: {
            id: alignment.id,
            day_number: alignment.dayNumber,
            level: alignment.level,
            action: alignment.action,
            guidance: alignment.guidance,
            somatic_cue: alignment.somaticCue,
            scripture: alignment.scripture,
            reflection_prompt: alignment.reflectionPrompt,
            primary_archetype: alignment.primaryArchetype,
            secondary_archetype: alignment.secondaryArchetype,
            blend_name: alignment.blendName,
            generated_at: alignment.generatedAt.toISOString(),
          },
        };
      }

      // Fetch last 3 reflections
      const recentReflections = await app.db
        .select({
          reflectionText: schema.alignmentReflections.reflectionText,
          action: schema.dailyAlignments.action,
          completedAt: schema.alignmentReflections.completedAt,
        })
        .from(schema.alignmentReflections)
        .innerJoin(schema.dailyAlignments, eq(schema.alignmentReflections.alignmentId, schema.dailyAlignments.id))
        .where(
          and(
            eq(schema.alignmentReflections.userId, userId),
            sql`${schema.alignmentReflections.reflectionText} IS NOT NULL`,
            sql`${schema.alignmentReflections.reflectionText} != ''`
          )
        )
        .orderBy(desc(schema.alignmentReflections.completedAt))
        .limit(3);

      const recentReflectionsText = recentReflections.length > 0
        ? `Recent reflections from this user (use these to make today's alignment more personally relevant — notice themes, growth edges, and what they're working through):\n${recentReflections.map((r, i) => `[${i + 1} day(s) ago] Action: "${r.action}" | Reflection: "${r.reflectionText}"`).join('\n')}`
        : 'This is their first alignment.';

      const systemPrompt = `You are a sacred design coach generating a daily alignment.

User's Sacred Design:
- Primary archetype: ${primary_archetype}
- Secondary archetype: ${secondary_archetype}
- Blend: ${blend_name}
- Day ${dayNumber} of their journey (Level ${level})

${recentReflectionsText}

Generate today's alignment. Return ONLY valid JSON with these exact keys: action, guidance, scripture, somatic_cue, reflection_prompt. Make it spiritually grounded, practical, and personally attuned to where this person is in their journey.`;

      app.logger.info({ userId, dayNumber, level }, 'Generating alignment with AI');

      let aiOutput = FALLBACK_ALIGNMENT;
      try {
        const { text } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          system: systemPrompt,
          prompt: `Generate today's alignment for Day ${dayNumber}.`,
        });

        aiOutput = JSON.parse(text);
      } catch (aiError) {
        app.logger.warn({ err: aiError, userId }, 'AI generation failed, using fallback');
      }

      // Insert alignment
      const now = new Date();
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
          primaryArchetype: primary_archetype,
          secondaryArchetype: secondary_archetype,
          blendName: blend_name,
          reflectionPrompt: aiOutput.reflection_prompt,
          generatedAt: now,
        })
        .returning();

      const created = insertResult[0];

      // Update or create user_progress
      const newStreak = calculateNewStreak(progressRows[0]?.lastActiveDate || '', progressRows[0]?.streak || 0);

      if (progressRows.length > 0) {
        await app.db
          .update(schema.userProgress)
          .set({
            dayCount: dayNumber,
            streak: newStreak,
            lastActiveDate: dateForQuery,
            updatedAt: new Date(),
          })
          .where(eq(schema.userProgress.userId, userId));
      } else {
        await app.db.insert(schema.userProgress).values({
          userId,
          dayCount: dayNumber,
          streak: newStreak,
          lastActiveDate: dateForQuery,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      app.logger.info({ alignmentId: created.id, userId, dayCount }, 'Alignment generated successfully');

      return {
        alignment: {
          id: created.id,
          day_number: created.dayNumber,
          level: created.level,
          action: created.action,
          guidance: created.guidance,
          somatic_cue: created.somaticCue,
          scripture: created.scripture,
          reflection_prompt: created.reflectionPrompt,
          primary_archetype: created.primaryArchetype,
          secondary_archetype: created.secondaryArchetype,
          blend_name: created.blendName,
          generated_at: created.generatedAt.toISOString(),
        },
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to generate alignment');
      throw error;
    }
  });

  // GET /api/alignments/today
  fastify.get('/api/alignments/today', {
    schema: {
      description: "Get today's alignment or null if not found",
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

    app.logger.info({ userId, localDate: local_date }, "Fetching today's alignment");

    try {
      const alignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(
          and(
            eq(schema.dailyAlignments.userId, userId),
            sql`DATE(${schema.dailyAlignments.generatedAt}) = ${dateForQuery}`
          )
        )
        .orderBy(desc(schema.dailyAlignments.generatedAt))
        .limit(1);

      if (alignments.length === 0) {
        app.logger.info({ userId }, 'No alignment found for today');
        return { alignment: null };
      }

      const alignment = alignments[0];

      // Check if user's current archetypes match the alignment's archetypes
      const currentArchetypes = await app.db
        .select()
        .from(schema.userArchetypes)
        .where(eq(schema.userArchetypes.userId, userId))
        .limit(1);

      // If archetypes exist and don't match, return null (stale alignment)
      if (currentArchetypes.length > 0) {
        const current = currentArchetypes[0];
        if (current.primaryArchetype !== alignment.primaryArchetype ||
            current.secondaryArchetype !== alignment.secondaryArchetype) {
          app.logger.info({ userId, alignmentId: alignment.id }, 'Alignment archetype mismatch, returning null');
          return { alignment: null };
        }
      }

      app.logger.info({ alignmentId: alignment.id, userId }, "Retrieved today's alignment");

      return {
        alignment: {
          id: alignment.id,
          day_number: alignment.dayNumber,
          level: alignment.level,
          action: alignment.action,
          guidance: alignment.guidance,
          somatic_cue: alignment.somaticCue,
          scripture: alignment.scripture,
          reflection_prompt: alignment.reflectionPrompt,
          primary_archetype: alignment.primaryArchetype,
          secondary_archetype: alignment.secondaryArchetype,
          blend_name: alignment.blendName,
          generated_at: alignment.generatedAt.toISOString(),
        },
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, "Failed to fetch today's alignment");
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
      description: 'Get alignment history for the user, ordered by day_number descending',
      tags: ['alignments'],
      response: {
        200: {
          description: 'Alignment history with reflection status',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
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
              hasReflection: { type: 'boolean' },
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
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<any[] | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;

    app.logger.info({ userId }, 'Fetching alignment history');

    try {
      // Fetch all alignments for this user, ordered by day_number DESC
      const alignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(eq(schema.dailyAlignments.userId, userId))
        .orderBy(desc(schema.dailyAlignments.dayNumber));

      // For each alignment, check if a reflection exists
      const alignmentsWithReflectionStatus = await Promise.all(
        alignments.map(async (alignment) => {
          const reflections = await app.db
            .select()
            .from(schema.alignmentReflections)
            .where(eq(schema.alignmentReflections.alignmentId, alignment.id))
            .limit(1);

          return {
            id: alignment.id,
            day_number: alignment.dayNumber,
            level: alignment.level,
            action: alignment.action,
            guidance: alignment.guidance,
            somatic_cue: alignment.somaticCue,
            scripture: alignment.scripture,
            reflection_prompt: alignment.reflectionPrompt,
            primary_archetype: alignment.primaryArchetype,
            secondary_archetype: alignment.secondaryArchetype,
            blend_name: alignment.blendName,
            generated_at: alignment.generatedAt.toISOString(),
            hasReflection: reflections.length > 0,
          };
        })
      );

      app.logger.info({ userId, count: alignmentsWithReflectionStatus.length }, 'Retrieved alignment history');

      return alignmentsWithReflectionStatus;
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch alignment history');
      throw error;
    }
  });

  // GET /api/alignments/progress
  fastify.get('/api/alignments/progress', {
    schema: {
      description: 'Get user progress in the alignment system (returns empty data if unauthenticated)',
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
  ): Promise<{ day_count: number; level: number; last_active_date: string | null }> => {
    try {
      // Convert Fastify headers to standard Headers
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) {
          headers.append(key, Array.isArray(value) ? value[0] : value);
        }
      });

      // Get session without requiring authentication
      const session = await app.auth.api.getSession({ headers });
      const userId = session?.user.id;

      // If no authenticated user, return empty data
      if (!userId) {
        app.logger.info({}, 'Fetching alignment progress for unauthenticated user');
        return {
          day_count: 0,
          level: 1,
          last_active_date: null,
        };
      }

      app.logger.info({ userId }, 'Fetching alignment progress');

      const userProgress = await app.db
        .select()
        .from(schema.userProgress)
        .where(eq(schema.userProgress.userId, userId))
        .limit(1);

      if (userProgress.length === 0) {
        app.logger.info({ userId }, 'No progress found, returning defaults');
        return {
          day_count: 0,
          level: 1,
          last_active_date: null,
        };
      }

      const progress = userProgress[0];
      const level = determineLevelFromDayCount(progress.dayCount);

      app.logger.info({ userId, dayCount: progress.dayCount }, 'Retrieved user progress');

      return {
        day_count: progress.dayCount,
        level,
        last_active_date: progress.lastActiveDate,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch progress');
      throw error;
    }
  });
}
