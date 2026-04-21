import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema/schema.js';
import { calculateNewStreak } from './progress.js';
import type { App } from '../index.js';

interface CompleteAlignmentBody {
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
        201: {
          description: 'Daily alignment generated successfully',
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
        401: {
          description: 'Unauthorized',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          description: 'Archetype not found',
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
    const today = getTodayDate();

    app.logger.info({ userId }, 'Generating alignment');

    try {
      // Query user's archetype
      const archetypeRows = await app.db
        .select()
        .from(schema.userArchetypes)
        .where(eq(schema.userArchetypes.userId, userId))
        .limit(1);

      if (archetypeRows.length === 0) {
        app.logger.info({ userId }, 'No archetype found');
        return reply.status(404).send({ error: 'Archetype not found' });
      }

      const archetype = archetypeRows[0];
      const primary_archetype = archetype.primaryArchetype;
      const secondary_archetype = archetype.secondaryArchetype;
      const blend_name = archetype.blendName;
      const scores = archetype.scores as Record<string, number>;

      // Count existing alignments to determine day_number
      const alignmentCountResult = await app.db
        .select({ count: count() })
        .from(schema.dailyAlignments)
        .where(eq(schema.dailyAlignments.userId, userId));

      const dayNumber = (alignmentCountResult[0]?.count ?? 0) + 1;
      const level = determineLevelFromDayCount(dayNumber);

      // Check if alignment exists for today
      const existingAlignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(
          and(
            eq(schema.dailyAlignments.userId, userId),
            sql`DATE(${schema.dailyAlignments.generatedAt}) = ${today}`
          )
        )
        .limit(1);

      if (existingAlignments.length > 0) {
        app.logger.info({ userId }, 'Alignment already exists for today');
        const alignment = existingAlignments[0];
        return reply.status(201).send({
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
        });
      }

      const anxious_score = scores.anxious_score ?? 0;
      const avoidant_score = scores.avoidant_score ?? 0;
      const overactive_score = scores.overactive_score ?? 0;
      const grounded_score = scores.grounded_score ?? 0;

      const systemPrompt = `You are a sacred design guide. Generate a daily alignment practice for someone whose primary archetype is ${primary_archetype} and secondary archetype is ${secondary_archetype} (blend: ${blend_name}).

Day Number: ${dayNumber}
Level: ${level} (1=awareness/small action, 2=expression/discomfort, 3=identity/integration)
Regulation Profile: anxious=${anxious_score}, avoidant=${avoidant_score}, overactive=${overactive_score}, grounded=${grounded_score}

Generate a personalized daily alignment with:
- A specific, doable action
- Guidance on how to practice it
- A somatic cue (body-based instruction)
- A relevant Bible verse
- A reflection question

Return ONLY valid JSON with exactly these fields:
{
  "action": "one specific action",
  "guidance": "2-3 sentences on how to practice",
  "somatic_cue": "one body instruction",
  "scripture": "one Bible verse",
  "reflection_prompt": "one journaling question"
}`;

      app.logger.info({ userId, dayNumber, level }, 'Generating alignment with AI');

      let aiOutput = FALLBACK_ALIGNMENT;
      try {
        const { text } = await generateText({
          model: gateway('openai/gpt-4o-mini'),
          system: systemPrompt,
          prompt: 'Generate today\'s alignment.',
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

      // Update user_progress if it exists
      const progressRows = await app.db
        .select()
        .from(schema.userProgress)
        .where(eq(schema.userProgress.userId, userId))
        .limit(1);

      const newStreak = calculateNewStreak(progressRows[0]?.lastActiveDate || '', progressRows[0]?.streak || 0);

      if (progressRows.length > 0) {
        await app.db
          .update(schema.userProgress)
          .set({
            dayCount: dayNumber,
            streak: newStreak,
            lastActiveDate: today,
            updatedAt: new Date(),
          })
          .where(eq(schema.userProgress.userId, userId));
      } else {
        await app.db.insert(schema.userProgress).values({
          userId,
          dayCount: dayNumber,
          streak: newStreak,
          lastActiveDate: today,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      app.logger.info({ alignmentId: created.id, userId, dayNumber }, 'Alignment generated successfully');

      return reply.status(201).send({
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
      });
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to generate alignment');
      throw error;
    }
  });

  // GET /api/alignments/today
  fastify.get('/api/alignments/today', {
    schema: {
      description: "Get today's alignment with reflection status",
      tags: ['alignments'],
      response: {
        200: {
          description: "Today's alignment or null",
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
    const today = getTodayDate();

    app.logger.info({ userId }, "Fetching today's alignment");

    try {
      const alignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(
          and(
            eq(schema.dailyAlignments.userId, userId),
            sql`DATE(${schema.dailyAlignments.generatedAt}) = ${today}`
          )
        )
        .orderBy(desc(schema.dailyAlignments.generatedAt))
        .limit(1);

      if (alignments.length === 0) {
        app.logger.info({ userId }, 'No alignment found for today');
        return null;
      }

      const alignment = alignments[0];

      // Check if reflection exists
      const reflections = await app.db
        .select()
        .from(schema.alignmentReflections)
        .where(
          and(
            eq(schema.alignmentReflections.alignmentId, alignment.id),
            eq(schema.alignmentReflections.userId, userId)
          )
        )
        .limit(1);

      const hasReflection = reflections.length > 0;

      app.logger.info({ alignmentId: alignment.id, userId, hasReflection }, "Retrieved today's alignment");

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
        hasReflection,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, "Failed to fetch today's alignment");
      throw error;
    }
  });

  // POST /api/alignments/:id/complete
  fastify.post('/api/alignments/:id/complete', {
    schema: {
      description: 'Complete an alignment by submitting a reflection',
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
          reflection_text: { type: 'string' },
        },
      },
      response: {
        200: {
          description: 'Alignment completed',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
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
  ): Promise<{ success: boolean; message: string } | void> => {
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const { id } = request.params;
    const { reflection_text } = request.body;

    app.logger.info({ userId, alignmentId: id }, 'Completing alignment');

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
        // Insert reflection only if it doesn't exist
        await app.db.insert(schema.alignmentReflections).values({
          userId,
          alignmentId: id,
          reflectionText: reflection_text,
          completedAt: new Date(),
        });
        app.logger.info({ alignmentId: id, userId }, 'Reflection created');
      } else {
        app.logger.info({ alignmentId: id, userId }, 'Reflection already exists, skipping insert');
      }

      app.logger.info({ alignmentId: id, userId }, 'Alignment completed');

      return {
        success: true,
        message: 'You\'re strengthening a new pattern.',
      };
    } catch (error) {
      app.logger.error({ err: error, userId, alignmentId: id }, 'Failed to complete alignment');
      throw error;
    }
  });

  // GET /api/alignments/history
  fastify.get('/api/alignments/history', {
    schema: {
      description: 'Get alignment history for the user (returns empty data if unauthenticated)',
      tags: ['alignments'],
      response: {
        200: {
          description: 'Alignment history',
          type: 'object',
          properties: {
            alignments: {
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
                  generated_at: { type: 'string', format: 'date-time' },
                  reflection: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          reflection_text: { type: 'string' },
                          completed_at: { type: 'string', format: 'date-time' },
                        },
                      },
                      { type: 'null' },
                    ],
                  },
                },
              },
            },
            total_days: { type: 'integer' },
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
  ): Promise<{ alignments: any[]; total_days: number }> => {
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
        app.logger.info({}, 'Fetching alignment history for unauthenticated user');
        return {
          alignments: [],
          total_days: 0,
        };
      }

      app.logger.info({ userId }, 'Fetching alignment history');

      // Fetch all alignments for this user
      const alignments = await app.db
        .select()
        .from(schema.dailyAlignments)
        .where(eq(schema.dailyAlignments.userId, userId))
        .orderBy(desc(schema.dailyAlignments.generatedAt));

      // For each alignment, fetch its reflection if it exists
      const alignmentsWithReflections = await Promise.all(
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
            generated_at: alignment.generatedAt.toISOString(),
            reflection: reflections.length > 0 ? {
              reflection_text: reflections[0].reflectionText,
              completed_at: reflections[0].completedAt.toISOString(),
            } : null,
          };
        })
      );

      app.logger.info({ userId, count: alignmentsWithReflections.length }, 'Retrieved alignment history');

      return {
        alignments: alignmentsWithReflections,
        total_days: alignmentsWithReflections.length,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to fetch alignment history');
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
