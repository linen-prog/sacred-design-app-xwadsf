import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema/schema.js';
import * as authSchema from './db/schema/auth-schema.js';
import { register as registerDailyAlignmentRoutes } from './routes/daily-alignment.js';
import { register as registerAlignmentCompletionRoutes } from './routes/alignment-completion.js';

// Combine app schema and auth schema
const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth();

// Register routes - add your route modules here
// IMPORTANT: Always use registration functions to avoid circular dependency issues
registerDailyAlignmentRoutes(app, app.fastify);
registerAlignmentCompletionRoutes(app, app.fastify);

await app.run();
app.logger.info('Application running');
