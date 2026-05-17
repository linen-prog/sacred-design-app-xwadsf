import { createApplication, resend } from "@specific-dev/framework";
import { anonymous } from "better-auth/plugins";
import { createAuthMiddleware } from "@specific-dev/framework";
import jwt from 'jsonwebtoken';
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { register as registerDailyAlignmentRoutes } from './routes/daily-alignment.js';
import { register as registerAlignmentCompletionRoutes } from './routes/alignment-completion.js';
import { register as registerArchetypeRoutes } from './routes/archetypes.js';
import { register as registerProgressRoutes } from './routes/progress.js';
import { register as registerAccountRoutes } from './routes/account.js';
import { register as registerMoodsRoutes } from './routes/moods.js';

// Combine app schema and auth schema
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Generate Apple client secret JWT (lazy evaluation with fallback)
function generateAppleClientSecret(): string {
  // Try to use static secret first (for testing/development)
  if (process.env.APPLE_CLIENT_SECRET) {
    return process.env.APPLE_CLIENT_SECRET;
  }

  // Try to generate JWT from private key (for production)
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  if (privateKey) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + (180 * 24 * 60 * 60); // 180 days from now

      const payload = {
        iss: 'ZSU6WP9K6J',
        aud: 'https://appleid.apple.com',
        sub: 'com.sacreddesign.app',
        iat: now,
        exp: expiresAt,
      };

      return jwt.sign(payload, privateKey, {
        algorithm: 'ES256',
        keyid: '2B969AJ4AZ',
      });
    } catch (error) {
      // If JWT signing fails, log and use a placeholder
      console.warn('Failed to generate Apple JWT, using placeholder:', error instanceof Error ? error.message : String(error));
      return 'apple_client_secret_placeholder';
    }
  }

  // Fallback for testing/development when neither is configured
  return 'apple_client_secret_placeholder';
}

// Enable authentication with email/password, Google OAuth, Apple OAuth, and anonymous sign-in
// baseURL is configured via BETTER_AUTH_URL environment variable (managed automatically by Specular)
const authBeforeHook = createAuthMiddleware(async (ctx) => {
  // Log oauth callback requests to help debug redirect issues
  if (ctx.path?.includes('/callback/')) {
    const body = ctx.body as Record<string, unknown> | undefined;
    const redirectTo = body?.redirect_to || 'none';
    console.log('[oauth-callback]', {
      path: ctx.path,
      redirect_to: redirectTo,
      timestamp: new Date().toISOString(),
    });
  }
});

app.withAuth({
  trustedOrigins: [
    "sacreddesign://",
    "sacreddesign://auth-callback",
    "https://1b8ef625-33f1-4c4f-b692-f737f97ecb03.newly.dev",
    "https://99b2qumnfz5hty3hbh5psgj3fm289p7w.app.specular.dev",
    "https://*.newly.dev",
    "http://localhost:8081",
    "http://localhost:19006",
  ],
  plugins: [
    anonymous(),
  ],
  hooks: {
    before: authBeforeHook,
  },
  emailAndPassword: {
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      resend.emails.send({
        from: 'Sacred Design <noreply@example.com>',
        to: user.email,
        subject: 'Reset your password',
        html: `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: "https://99b2qumnfz5hty3hbh5psgj3fm289p7w.app.specular.dev/api/auth/callback/google",
    },
    apple: {
      clientId: 'com.sacreddesign.app',
      clientSecret: generateAppleClientSecret(),
    },
  },
});

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerDailyAlignmentRoutes(app, app.fastify);
registerAlignmentCompletionRoutes(app, app.fastify);
registerArchetypeRoutes(app, app.fastify);
registerProgressRoutes(app, app.fastify);
registerAccountRoutes(app, app.fastify);
registerMoodsRoutes(app, app.fastify);

await app.run();
app.logger.info('Application running');
