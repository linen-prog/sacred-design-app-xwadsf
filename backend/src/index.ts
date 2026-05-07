import { createApplication, resend } from "@specific-dev/framework";
import { anonymous } from "better-auth/plugins";
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { register as registerDailyAlignmentRoutes } from './routes/daily-alignment.js';
import { register as registerAlignmentCompletionRoutes } from './routes/alignment-completion.js';
import { register as registerArchetypeRoutes } from './routes/archetypes.js';
import { register as registerProgressRoutes } from './routes/progress.js';
import { register as registerAccountRoutes } from './routes/account.js';

// Combine app schema and auth schema
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication with email/password, Google OAuth, Apple OAuth, and anonymous sign-in
// OAuth providers (Google, Apple) are handled automatically via proxy - no credentials needed
app.withAuth({
  trustedOrigins: [
    "sacred-design://",
    "exp://",
    "https://cs3k7h8f4szhmtksqpktmjeg97sgd89z.app.specular.dev",
  ],
  plugins: [
    anonymous(),
  ],
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
  // OAuth providers configured automatically:
  // - Google OAuth (/api/auth/sign-in/social with provider=google)
  // - Apple OAuth (/api/auth/sign-in/social with provider=apple)
});

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerDailyAlignmentRoutes(app, app.fastify);
registerAlignmentCompletionRoutes(app, app.fastify);
registerArchetypeRoutes(app, app.fastify);
registerProgressRoutes(app, app.fastify);
registerAccountRoutes(app, app.fastify);

await app.run();
app.logger.info('Application running');
