import { pgTable, uuid, text, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth-schema.js';

export const userProgress = pgTable('user_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  dayCount: integer('day_count').notNull().default(1),
  streak: integer('streak').notNull().default(0),
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
  reflectionPrompt: text('reflection_prompt'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const alignmentReflections = pgTable('alignment_reflections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  alignmentId: uuid('alignment_id').notNull().references(() => dailyAlignments.id, { onDelete: 'cascade' }),
  reflectionText: text('reflection_text').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userArchetypes = pgTable('user_archetypes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  primaryArchetype: text('primary_archetype').notNull(),
  secondaryArchetype: text('secondary_archetype').notNull(),
  blendName: text('blend_name').notNull(),
  scores: jsonb('scores').notNull(),
  quizCompleted: boolean('quiz_completed').notNull().default(true),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
