import { createApplication, resend } from "@specific-dev/framework";
import { anonymous } from "better-auth/plugins";
import { createAuthMiddleware } from "@specific-dev/framework";
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
    "https://99b2qumnfz5hty3hbh5psgj3fm289p7w.app.specular.dev",
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
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      redirectURI: "https://99b2qumnfz5hty3hbh5psgj3fm289p7w.app.specular.dev/api/auth/callback/apple",
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
