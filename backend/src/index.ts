import { createApplication, resend } from "@specific-dev/framework";
import { anonymous } from "better-auth/plugins";
import { createAuthMiddleware } from "@specific-dev/framework";
import * as jose from 'jose';
import { createPrivateKey } from 'crypto';
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { register as registerDailyAlignmentRoutes } from './routes/daily-alignment.js';
import { register as registerAlignmentCompletionRoutes } from './routes/alignment-completion.js';
import { register as registerArchetypeRoutes } from './routes/archetypes.js';
import { register as registerProgressRoutes } from './routes/progress.js';
import { register as registerAccountRoutes } from './routes/account.js';
import { register as registerMoodsRoutes } from './routes/moods.js';
import { initializeAuth } from './utils/auth.js';

// Combine app schema and auth schema
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Generate Apple client secret JWT at startup using jose
async function generateAppleClientSecretJWT(): Promise<string> {
  const privateKey = process.env.APPLE_PRIVATE_KEY;

  // Log first 20 characters of private key to confirm it's set
  if (privateKey) {
    const preview = privateKey.substring(0, 20);
    app.logger.info({ keyPreview: preview }, 'Apple private key is configured');
  } else {
    app.logger.warn('APPLE_PRIVATE_KEY environment variable is not set');
  }

  if (!privateKey) {
    throw new Error('APPLE_PRIVATE_KEY environment variable is required for Apple OAuth');
  }

  try {
    // Convert escaped newlines to actual newlines
    let formattedKey = privateKey.replace(/\\n/g, '\n');

    // If the key doesn't start with -----BEGIN, it's likely base64-encoded DER format
    // Wrap it in PEM format headers for PKCS#8 format
    if (!formattedKey.includes('-----BEGIN')) {
      formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`;
    }

    // Use Node's crypto to import the private key (handles both PKCS#8 and SEC1 formats)
    const privateKeyObj = createPrivateKey(formattedKey);

    const payload = {
      iss: 'ZSU6WP9K6J',
      aud: 'https://appleid.apple.com',
      sub: 'com.sacreddesign.app',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60), // 180 days
    };

    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'ES256', kid: '2B969AJ4AZ' })
      .sign(privateKeyObj);

    app.logger.info('Apple client secret JWT generated successfully with jose');
    return token;
  } catch (error) {
    app.logger.error({ err: error }, 'Failed to generate Apple client secret JWT');
    throw error;
  }
}

// Generate Apple JWT at startup
const appleClientSecret = await generateAppleClientSecretJWT();

// Enable authentication with email/password, Google OAuth, Apple OAuth, and anonymous sign-in
const authBeforeHook = createAuthMiddleware(async (ctx) => {
  // Log oauth callback requests to help debug redirect issues
  if (ctx.path?.includes('/callback/')) {
    const body = ctx.body as Record<string, unknown> | undefined;
    const redirectTo = body?.redirect_to || 'none';
    app.logger.info({ path: ctx.path, redirect_to: redirectTo }, 'Processing OAuth callback');
  }
});

app.withAuth({
  trustedOrigins: [
    "sacreddesign://",
    "sacreddesign://auth-callback",
    "exp://",
    "https://1b8ef625-33f1-4c4f-b692-f737f97ecb03.newly.dev",
    "https://ndkts8vdqz2rr5jxdn9saub4v57bk4p7.app.specular.dev",
    "https://eegnmx97zpckyedgdvpgescqwme3qq4j.app.specular.dev",
    "https://*.newly.dev",
    "http://localhost:3001",
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
      const plainTextBody = `You requested a password reset for your Sacred Design account.

Tap the link below to set a new password. This link expires in 1 hour.

${url}

If you didn't request this, you can safely ignore this email.`;

      const htmlBody = `<p>You requested a password reset for your Sacred Design account.</p>
<p>Tap the link below to set a new password. This link expires in 1 hour.</p>
<p><a href="${url}">${url}</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>`;

      app.logger.info({ userId: user.id, email: user.email }, 'Sending password reset email');

      resend.emails.send({
        from: 'noreply@sacreddesign.app',
        to: user.email,
        subject: 'Reset your Sacred Design password',
        text: plainTextBody,
        html: htmlBody,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: "https://ndkts8vdqz2rr5jxdn9saub4v57bk4p7.app.specular.dev/api/auth/callback/google",
      ...(process.env.GOOGLE_IOS_CLIENT_ID && { iosClientId: process.env.GOOGLE_IOS_CLIENT_ID }),
    },
    apple: {
      clientId: 'com.sacreddesign.app',
      clientSecret: appleClientSecret,
    },
  },
});

// Log auth configuration on startup
app.logger.info('Better Auth initialized with providers: email, google, apple');

// Initialize auth middleware (must be after app.withAuth())
initializeAuth(app);

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
