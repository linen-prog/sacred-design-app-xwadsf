import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const userProgress = pgTable('user_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  dayCount: integer('day_count').notNull().default(1),
  lastActiveDate: text('last_active_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dailyAlignments = pgTable('daily_alignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  level: integer('level').notNull(),
  action: text('action').notNull(),
  guidance: text('guidance').notNull(),
  scripture: text('scripture').notNull(),
  somaticCue: text('somatic_cue').notNull(),
  primaryArchetype: text('primary_archetype').notNull(),
  secondaryArchetype: text('secondary_archetype').notNull(),
  blendName: text('blend_name').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
});
