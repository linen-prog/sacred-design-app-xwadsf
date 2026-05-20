import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

function getTodayDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export function calculateNewStreak(lastActiveDate: string | null | undefined, currentStreak: number): number {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  if (!lastActiveDate || lastActiveDate === '') {
    // No previous activity, start streak at 1
    return 1;
  }

  if (lastActiveDate === today) {
    // Already active today, don't change streak
    return currentStreak;
  }

  if (lastActiveDate === yesterday) {
    // Was active yesterday, increment streak
    return currentStreak + 1;
  }

  // More than 1 day gap, reset streak to 1
  return 1;
}

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

  // GET /api/progress
  fastify.get('/api/progress', {
    schema: {
      description: 'Get user progress including day count, streak, and last active date',
      tags: ['progress'],
      response: {
        200: {
          description: 'User progress data',
          type: 'object',
          properties: {
            day_count: { type: 'integer' },
            streak: { type: 'integer' },
            last_active_date: { type: ['string', 'null'] },
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
    const session = await getSessionFromRequest(request);
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    app.logger.info({ userId }, 'Fetching user progress');

    try {
      const progressRows = await app.db
        .select()
        .from(schema.userProgress)
        .where(eq(schema.userProgress.userId, userId))
        .limit(1);

      if (progressRows.length === 0) {
        app.logger.info({ userId }, 'No progress record found');
        return {
          day_count: 0,
          streak: 0,
          last_active_date: null,
        };
      }

      const progress = progressRows[0];

      app.logger.info({ userId, dayCount: progress.dayCount, streak: progress.streak }, 'Retrieved user progress');

      return {
        day_count: progress.dayCount,
        streak: progress.streak,
        last_active_date: progress.lastActiveDate || null,
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch progress');
      throw error;
    }
  });

  // GET /api/reflections
  fastify.get('/api/reflections', {
    schema: {
      description: 'Get user reflections with alignment details, ordered by most recent',
      tags: ['reflections'],
      response: {
        200: {
          description: 'Array of reflections',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              alignment_id: { type: 'string' },
              reflection_text: { type: 'string' },
              completed_at: { type: 'string', format: 'date-time' },
              day_number: { type: 'integer' },
              action: { type: 'string' },
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
  ): Promise<any | void> => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    app.logger.info({ userId }, 'Fetching user reflections');

    try {
      const reflections = await app.db
        .select({
          id: schema.alignmentReflections.id,
          alignmentId: schema.alignmentReflections.alignmentId,
          reflectionText: schema.alignmentReflections.reflectionText,
          completedAt: schema.alignmentReflections.completedAt,
          dayNumber: schema.dailyAlignments.dayNumber,
          action: schema.dailyAlignments.action,
        })
        .from(schema.alignmentReflections)
        .innerJoin(
          schema.dailyAlignments,
          eq(schema.alignmentReflections.alignmentId, schema.dailyAlignments.id)
        )
        .where(eq(schema.alignmentReflections.userId, userId))
        .orderBy(sql`${schema.alignmentReflections.completedAt} DESC`)
        .limit(50);

      app.logger.info({ userId, count: reflections.length }, 'Retrieved user reflections');

      return reflections.map((r) => ({
        id: r.id,
        alignment_id: r.alignmentId,
        reflection_text: r.reflectionText,
        completed_at: r.completedAt.toISOString(),
        day_number: r.dayNumber,
        action: r.action,
      }));
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch reflections');
      throw error;
    }
  });
}
