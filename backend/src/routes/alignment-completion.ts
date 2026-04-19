import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText } from 'ai';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface GenerateAlignmentBody {
  primary_archetype: string;
  secondary_archetype: string;
  blend_name: string;
  anxious_score: number;
  avoidant_score: number;
  overactive_score: number;
  grounded_score: number;
}

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
  // POST /api/alignments/generate
  fastify.post('/api/alignments/generate', {
    schema: {
      description: 'Generate a daily alignment for the authenticated user',
      tags: ['alignments'],
      body: {
        type: 'object',
        required: ['primary_archetype', 'secondary_archetype', 'blend_name', 'anxious_score', 'avoidant_score', 'overactive_score', 'grounded_score'],
        properties: {
          primary_archetype: { type: 'string' },
          secondary_archetype: { type: 'string' },
          blend_name: { type: 'string' },
          anxious_score: { type: 'number' },
          avoidant_score: { type: 'number' },
          overactive_score: { type: 'number' },
          grounded_score: { type: 'number' },
        },
      },
      response: {
        200: {
          description: 'Daily alignment generated',
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
            already_completed: { type: 'boolean' },
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
    request: FastifyRequest<{ Body: GenerateAlignmentBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const requireAuth = app.requireAuth();
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const today = getTodayDate();

    app.logger.info({ userId }, 'Generating or retrieving alignment');

    try {
      // Get or create user_progress
      let userProgress = await app.db
        .select()
        .from(schema.userProgress)
        .where(eq(schema.userProgress.userId, userId))
        .limit(1);

      let dayCount = 1;
      if (userProgress.length === 0) {
        await app.db.insert(schema.userProgress).values({
          userId,
          dayCount: 0,
          lastActiveDate: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        dayCount = 1;
      } else {
        dayCount = userProgress[0].dayCount + 1;
      }

      const level = determineLevelFromDayCount(dayCount - 1);

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
        const alignment = existingAlignments[0];

        // Check if reflection exists
        const reflections = await app.db
          .select()
          .from(schema.alignmentReflections)
          .where(eq(schema.alignmentReflections.alignmentId, alignment.id))
          .limit(1);

        const alreadyCompleted = reflections.length > 0;

        app.logger.info({ alignmentId: alignment.id, userId }, 'Returning existing alignment for today');

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
          already_completed: alreadyCompleted,
        };
      }

      // Generate new alignment with AI
      const {
        primary_archetype,
        secondary_archetype,
        blend_name,
        anxious_score,
        avoidant_score,
        overactive_score,
        grounded_score,
      } = request.body;

      const systemPrompt = `You are a spiritual growth coach for the Sacred Design app. Generate a personalized Daily Alignment for this user.

User Profile:
- Primary Archetype: ${primary_archetype} (70% influence)
- Secondary Archetype: ${secondary_archetype} (30% influence)
- Blend Name: ${blend_name}
- Day Number: ${dayCount}
- Level: ${level} (1=awareness/small action, 2=expression/discomfort, 3=identity/integration)
- Regulation Profile: anxious=${anxious_score}, avoidant=${avoidant_score}, overactive=${overactive_score}, grounded=${grounded_score}

Archetype themes:
- Peacemaker → voice, boundaries, honesty
- Courageous Leader → releasing control, shared responsibility
- Deep Feeler → grounding emotion, steady action
- Faithful Steward → slowing down, resting, releasing productivity pressure
- Light Bearer → visibility, courage, expression
- Truth Seeker → action over overthinking, clarity in motion
- Justice Carrier → calm conviction, truth with love

Regulation adjustments:
- If anxious_score > 6: soften tone, smaller actions, more grounding language
- If avoidant_score > 6: gently encourage engagement, avoid harsh language
- If overactive_score > 6: include slowing, breathing, pausing
- If grounded_score > 6: balanced tone, normal challenge level

Level guidance:
- Level 1: Awareness + small action. Very easy, low resistance.
- Level 2: Expression + discomfort. Slightly stretching.
- Level 3: Identity + integration. Embodied real-life action.

Action format rule: Action + Context + Constraint
Good: "Share one honest sentence in a conversation today without over-explaining it."
Bad: "Be more honest today."

Return ONLY valid JSON with exactly these fields:
{
  "action": "one specific, doable action for today",
  "guidance": "2-3 calm sentences explaining how to do the action in real life",
  "somatic_cue": "one body-based instruction (e.g. Take one slow breath before speaking.)",
  "scripture": "one short Bible verse aligned with the action (e.g. Speak the truth in love. — Ephesians 4:15)",
  "reflection_prompt": "one journaling question tied directly to the action"
}`;

      app.logger.info({ userId, level, dayCount }, 'Generating alignment with AI');

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
          dayNumber: dayCount,
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

      // Update user_progress
      await app.db
        .update(schema.userProgress)
        .set({
          dayCount,
          lastActiveDate: today,
          updatedAt: new Date(),
        })
        .where(eq(schema.userProgress.userId, userId));

      app.logger.info({ alignmentId: created.id, userId }, 'Alignment generated and created');

      return {
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
        already_completed: false,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to generate alignment');
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
    const requireAuth = app.requireAuth();
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

      // Insert reflection
      await app.db.insert(schema.alignmentReflections).values({
        userId,
        alignmentId: id,
        reflectionText: reflection_text,
        completedAt: new Date(),
      });

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
