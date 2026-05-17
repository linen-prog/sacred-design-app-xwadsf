import type { FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, and } from 'drizzle-orm';
import * as schema from '../db/schema/schema.js';
import type { App } from '../index.js';

interface CreateMoodBody {
  mood: string;
  note?: string;
  date: string;
}

export function register(app: App, fastify: any) {
  // Helper function to get session from request headers
  const getSessionFromRequest = async (request: any) => {
    const headers = new Headers();
    Object.entries(request.headers).forEach(([key, value]: [string, any]) => {
      if (value) {
        headers.append(key, Array.isArray(value) ? value[0] : value);
      }
    });

    const authHeader = request.headers.authorization;
    app.logger.debug({
      authHeader: authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : 'none',
      hasCookie: !!request.headers.cookie
    }, 'Session extraction: checking auth headers');

    const session = await app.auth.api.getSession({ headers });

    if (!session) {
      app.logger.warn({
        authHeader: authHeader ? 'present' : 'missing',
        hasCookie: !!request.headers.cookie
      }, 'Session extraction: failed');
    } else {
      app.logger.debug({ userId: session.user.id }, 'Session extraction: success');
    }

    return session;
  };

  // POST /api/moods
  fastify.post('/api/moods', {
    schema: {
      description: 'Create a new mood entry',
      tags: ['moods'],
      body: {
        type: 'object',
        required: ['mood', 'date'],
        properties: {
          mood: { type: 'string' },
          note: { type: 'string' },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Date in YYYY-MM-DD format' },
        },
      },
      response: {
        201: {
          description: 'Mood entry created successfully',
          type: 'object',
          properties: {
            mood: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                user_id: { type: 'string' },
                mood: { type: 'string' },
                note: { type: ['string', 'null'] },
                recorded_at: { type: 'string', format: 'date-time' },
                date: { type: 'string' },
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
    request: FastifyRequest<{ Body: CreateMoodBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { mood, note, date } = request.body;

    app.logger.info({ userId, mood, date }, 'Creating mood entry');

    try {
      const insertResult = await app.db
        .insert(schema.moodEntries)
        .values({
          userId,
          mood,
          note: note || null,
          recordedAt: new Date(),
          date,
        })
        .returning();

      const inserted = insertResult[0];
      app.logger.info({ userId, moodId: inserted.id }, 'Mood entry created');

      reply.status(201);
      return {
        mood: {
          id: inserted.id,
          user_id: inserted.userId,
          mood: inserted.mood,
          note: inserted.note,
          recorded_at: inserted.recordedAt.toISOString(),
          date: inserted.date,
        },
      };
    } catch (error) {
      app.logger.error({ err: error, userId, mood, date }, 'Failed to create mood entry');
      throw error;
    }
  });

  // GET /api/moods
  fastify.get('/api/moods', {
    schema: {
      description: 'Get mood entries for the user',
      tags: ['moods'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', default: 30, minimum: 1, maximum: 100, description: 'Max results (default 30, max 100)' },
        },
      },
      response: {
        200: {
          description: 'Mood entries',
          type: 'object',
          properties: {
            moods: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  user_id: { type: 'string' },
                  mood: { type: 'string' },
                  note: { type: ['string', 'null'] },
                  recorded_at: { type: 'string', format: 'date-time' },
                  date: { type: 'string' },
                },
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
    request: FastifyRequest<{ Querystring: { limit?: number } }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const limit = Math.min(request.query.limit || 30, 100);

    app.logger.info({ userId, limit }, 'Fetching mood entries');

    try {
      const moodEntries = await app.db
        .select()
        .from(schema.moodEntries)
        .where(eq(schema.moodEntries.userId, userId))
        .orderBy(desc(schema.moodEntries.recordedAt))
        .limit(limit);

      app.logger.info({ userId, count: moodEntries.length }, 'Retrieved mood entries');

      return {
        moods: moodEntries.map(entry => ({
          id: entry.id,
          user_id: entry.userId,
          mood: entry.mood,
          note: entry.note,
          recorded_at: entry.recordedAt.toISOString(),
          date: entry.date,
        })),
      };
    } catch (error) {
      app.logger.error({ err: error, userId }, 'Failed to fetch mood entries');
      throw error;
    }
  });

  // GET /api/moods/today
  fastify.get('/api/moods/today', {
    schema: {
      description: 'Get most recent mood entry for a specific date',
      tags: ['moods'],
      querystring: {
        type: 'object',
        required: ['date'],
        properties: {
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Date in YYYY-MM-DD format' },
        },
      },
      response: {
        200: {
          description: 'Mood entry or null',
          type: 'object',
          properties: {
            mood: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    user_id: { type: 'string' },
                    mood: { type: 'string' },
                    note: { type: ['string', 'null'] },
                    recorded_at: { type: 'string', format: 'date-time' },
                    date: { type: 'string' },
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
    request: FastifyRequest<{ Querystring: { date: string } }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { date } = request.query;

    app.logger.info({ userId, date }, 'Fetching mood entry for date');

    try {
      const moodEntries = await app.db
        .select()
        .from(schema.moodEntries)
        .where(
          and(
            eq(schema.moodEntries.userId, userId),
            eq(schema.moodEntries.date, date)
          )
        )
        .orderBy(desc(schema.moodEntries.recordedAt))
        .limit(1);

      if (moodEntries.length === 0) {
        app.logger.info({ userId, date }, 'No mood entry found for date');
        return { mood: null };
      }

      const entry = moodEntries[0];
      app.logger.info({ userId, date, moodId: entry.id }, 'Retrieved mood entry');

      return {
        mood: {
          id: entry.id,
          user_id: entry.userId,
          mood: entry.mood,
          note: entry.note,
          recorded_at: entry.recordedAt.toISOString(),
          date: entry.date,
        },
      };
    } catch (error) {
      app.logger.error({ err: error, userId, date }, 'Failed to fetch mood entry');
      throw error;
    }
  });
}
