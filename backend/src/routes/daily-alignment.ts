import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import * as schema from '../db/schema/schema.js';
import { calculateNewStreak } from './progress.js';
import type { App } from '../index.js';

interface CreateAlignmentBody {
  primary_archetype: string;
  secondary_archetype: string;
  blend_name: string;
  avoidant_score: number;
  anxious_score: number;
  overactive_score: number;
  grounded_score: number;
}

interface AlignmentResponse {
  id: string;
  day_number: number;
  level: number;
  action: string;
  guidance: string;
  scripture: string;
  somatic_cue: string;
  primary_archetype: string;
  secondary_archetype: string;
  blend_name: string;
  generated_at: string;
}

interface TodayResponse {
  alignment: AlignmentResponse | null;
}

const alignmentSchema = z.object({
  action: z.string(),
  guidance: z.string(),
  scripture: z.string(),
  somatic_cue: z.string(),
});

type AlignmentOutput = z.infer<typeof alignmentSchema>;

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function determineLevelFromDayCount(dayCount: number): number {
  if (dayCount <= 7) return 1;
  if (dayCount <= 21) return 2;
  return 3;
}

export function register(app: App, fastify: any) {
  fastify.post('/api/daily-alignment', {
    schema: {
      description: 'Get or create a daily alignment for the current user',
      tags: ['daily-alignment'],
      body: {
        type: 'object',
        required: ['primary_archetype', 'secondary_archetype', 'blend_name', 'avoidant_score', 'anxious_score', 'overactive_score', 'grounded_score'],
        properties: {
          primary_archetype: { type: 'string' },
          secondary_archetype: { type: 'string' },
          blend_name: { type: 'string' },
          avoidant_score: { type: 'number', minimum: 0, maximum: 10 },
          anxious_score: { type: 'number', minimum: 0, maximum: 10 },
          overactive_score: { type: 'number', minimum: 0, maximum: 10 },
          grounded_score: { type: 'number', minimum: 0, maximum: 10 },
        },
      },
      response: {
        200: {
          description: 'Daily alignment retrieved or created',
          type: 'object',
          properties: {
            id: { type: 'string' },
            day_number: { type: 'integer' },
            level: { type: 'integer' },
            action: { type: 'string' },
            guidance: { type: 'string' },
            scripture: { type: 'string' },
            somatic_cue: { type: 'string' },
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
        500: {
          description: 'Server error',
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Body: CreateAlignmentBody }>,
    reply: FastifyReply
  ): Promise<AlignmentResponse | void> => {
    const requireAuth = app.requireAuth();
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const today = getTodayDate();

    app.logger.info({ userId }, 'Creating or retrieving daily alignment');

    try {
      // Check if alignment already exists for today
      const existingAlignment = await app.db
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

      if (existingAlignment.length > 0) {
        const alignment = existingAlignment[0];
        app.logger.info({ alignmentId: alignment.id, userId }, 'Returning existing alignment for today');
        return {
          id: alignment.id,
          day_number: alignment.dayNumber,
          level: alignment.level,
          action: alignment.action,
          guidance: alignment.guidance,
          scripture: alignment.scripture,
          somatic_cue: alignment.somaticCue,
          primary_archetype: alignment.primaryArchetype,
          secondary_archetype: alignment.secondaryArchetype,
          blend_name: alignment.blendName,
          generated_at: alignment.generatedAt.toISOString(),
        };
      }

      // Get or create user progress
      const userProgressRecords = await app.db
        .select()
        .from(schema.userProgress)
        .where(eq(schema.userProgress.userId, userId));

      let dayCount = 1;
      let userProgressRecord = userProgressRecords[0];

      if (userProgressRecord) {
        if (userProgressRecord.lastActiveDate !== today) {
          // New day, increment
          dayCount = userProgressRecord.dayCount + 1;
          const newStreak = calculateNewStreak(userProgressRecord.lastActiveDate, userProgressRecord.streak);
          await app.db
            .update(schema.userProgress)
            .set({
              dayCount,
              streak: newStreak,
              lastActiveDate: today,
              updatedAt: new Date(),
            })
            .where(eq(schema.userProgress.userId, userId));
          app.logger.info({ userId, dayCount, streak: newStreak }, 'Updated user progress for new day');
        } else {
          // Same day, use existing day count
          dayCount = userProgressRecord.dayCount;
        }
      } else {
        // First time
        await app.db.insert(schema.userProgress).values({
          userId,
          dayCount: 1,
          streak: 1,
          lastActiveDate: today,
        });
        app.logger.info({ userId }, 'Created initial user progress');
      }

      const level = determineLevelFromDayCount(dayCount);

      // Build AI prompt
      const {
        primary_archetype,
        secondary_archetype,
        blend_name,
        avoidant_score,
        anxious_score,
        overactive_score,
        grounded_score,
      } = request.body;

      const systemPrompt = `You are a spiritual formation guide for the Sacred Design app. Your role is to generate daily alignment prompts that help users grow into their unique design through small, specific, repeated actions.

Tone: calm, grounded, warm, non-judgmental, human. Never clinical. Never preachy.

Each alignment must include:
1. ACTION — one clear behavioral instruction. Format: Action + Context + Constraint. Specific and directive.
2. GUIDANCE — 2–3 short supportive sentences. Not long. Not generic.
3. SCRIPTURE — one short, relevant scripture reference and text (keep it brief, 1 sentence max).
4. SOMATIC_CUE — one simple body-based instruction (e.g. "Place your hand on your chest and take three slow breaths before you begin.").

Progression levels:
- Level 1 (Days 1–7): Awareness + small action. Very easy, low resistance.
- Level 2 (Days 8–21): Expression + discomfort. Slightly stretching.
- Level 3 (Day 22+): Identity + integration. Real-life embodiment.

Personalization rules:
- Primary archetype determines the growth focus.
- Secondary archetype shapes how the action is expressed.
- If anxious_score > 6: soften tone, reduce pressure, use gentler language.
- If avoidant_score > 6: gently encourage action, name the tendency without shame.
- If overactive_score > 6: include a slowing or pausing element in the action.
- If grounded_score < 4: add grounding language.

Occasionally (not every day) include one of these neuroplasticity reinforcement phrases naturally woven into the guidance:
"You are strengthening a new pattern."
"Each time you do this, it becomes easier."

Never generate generic advice. Never repeat the same action. Keep prompts fresh but consistent in tone.`;

      const userPrompt = `Generate a Level ${level} daily alignment for Day ${dayCount} of the user's journey.

Their Sacred Design:
- Blend Name: ${blend_name}
- Primary Archetype: ${primary_archetype}
- Secondary Archetype: ${secondary_archetype}

Regulation profile:
- Avoidant score: ${avoidant_score}/10
- Anxious score: ${anxious_score}/10
- Overactive score: ${overactive_score}/10
- Grounded score: ${grounded_score}/10

Return a single daily alignment with action, guidance, scripture, and somatic_cue.`;

      app.logger.info({ userId, level, dayCount }, 'Generating alignment with AI');

      const { output } = await generateText({
        model: gateway('google/gemini-3-flash'),
        system: systemPrompt,
        prompt: userPrompt,
        output: Output.object({
          schema: alignmentSchema,
          name: 'DailyAlignment',
          description: 'Daily alignment with action, guidance, scripture, and somatic cue',
        }),
      });

      const aiOutput = output as AlignmentOutput;

      // Insert into daily alignments
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
          generatedAt: now,
        })
        .returning();

      const created = insertResult[0];
      app.logger.info({ alignmentId: created.id, userId, dayCount }, 'Daily alignment created');

      return {
        id: created.id,
        day_number: created.dayNumber,
        level: created.level,
        action: created.action,
        guidance: created.guidance,
        scripture: created.scripture,
        somatic_cue: created.somaticCue,
        primary_archetype: created.primaryArchetype,
        secondary_archetype: created.secondaryArchetype,
        blend_name: created.blendName,
        generated_at: created.generatedAt.toISOString(),
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to create daily alignment');
      throw error;
    }
  });

  fastify.get('/api/daily-alignment/today', {
    schema: {
      description: 'Get today\'s alignment',
      tags: ['daily-alignment'],
      response: {
        200: {
          description: 'Today\'s alignment or null if not found',
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
                    scripture: { type: 'string' },
                    somatic_cue: { type: 'string' },
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
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<TodayResponse | void> => {
    const requireAuth = app.requireAuth();
    const session = await requireAuth(request, reply);
    if (!session) return;

    const userId = session.user.id;
    const today = getTodayDate();

    app.logger.info({ userId }, 'Fetching today\'s alignment');

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
        return { alignment: null };
      }

      const alignment = alignments[0];
      app.logger.info({ alignmentId: alignment.id, userId }, 'Retrieved today\'s alignment');

      return {
        alignment: {
          id: alignment.id,
          day_number: alignment.dayNumber,
          level: alignment.level,
          action: alignment.action,
          guidance: alignment.guidance,
          scripture: alignment.scripture,
          somatic_cue: alignment.somaticCue,
          primary_archetype: alignment.primaryArchetype,
          secondary_archetype: alignment.secondaryArchetype,
          blend_name: alignment.blendName,
          generated_at: alignment.generatedAt.toISOString(),
        },
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch today\'s alignment');
      throw error;
    }
  });
}
