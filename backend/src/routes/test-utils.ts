import type { FastifyRequest, FastifyReply } from 'fastify';
import { testTokenMap } from '../utils/require-auth-with-test.js';
import type { App } from '../index.js';

interface RegisterTokenBody {
  token: string;
  userId: string;
}

export function register(app: App, fastify: any) {
  // POST /api/test-register-token - Register a test token for authentication
  // Only enabled when TEST_AUTH_ENABLED=true and not in production
  fastify.post('/api/test-register-token', {
    schema: {
      description: 'Register a test token for authentication (test-only endpoint)',
      tags: ['test'],
      body: {
        type: 'object',
        required: ['token', 'userId'],
        properties: {
          token: { type: 'string', description: 'The token to register' },
          userId: { type: 'string', description: 'The user ID to map the token to' },
        },
      },
      response: {
        200: {
          description: 'Token registered successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            mapSize: { type: 'integer' },
          },
        },
        400: {
          description: 'Invalid request or test auth not enabled',
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
    request: FastifyRequest<{ Body: RegisterTokenBody }>,
    reply: FastifyReply
  ): Promise<any | void> => {
    const testAuthEnabled = (process.env.TEST_AUTH_ENABLED || '').toLowerCase().trim() === 'true';
    const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';

    app.logger.info({
      testAuthEnabled,
      isProduction,
      tokenLength: request.body.token?.length,
      userId: request.body.userId,
    }, 'POST /api/test-register-token received');

    // Check if test auth is enabled
    if (!testAuthEnabled || isProduction) {
      app.logger.warn({
        testAuthEnabled,
        isProduction,
      }, 'Test auth endpoint called but test auth is not enabled');
      reply.status(400).send({ error: 'Test authentication is not enabled' });
      return;
    }

    const { token, userId } = request.body;

    if (!token || !userId) {
      app.logger.warn({ token: !!token, userId: !!userId }, 'Missing required fields in test token registration');
      reply.status(400).send({ error: 'Missing required fields: token and userId' });
      return;
    }

    try {
      const normalizedToken = (token || '').trim();
      testTokenMap.set(normalizedToken, userId);
      app.logger.info({
        tokenLength: normalizedToken.length,
        userId,
        mapSize: testTokenMap.size,
        tokenFirstChar: normalizedToken.charCodeAt(0),
        tokenLastChar: normalizedToken.charCodeAt(normalizedToken.length - 1),
      }, 'Test token registered successfully');

      return {
        success: true,
        mapSize: testTokenMap.size,
      };
    } catch (error) {
      app.logger.error({ err: error }, 'Failed to register test token');
      reply.status(500).send({ error: 'Failed to register token' });
    }
  });
}
