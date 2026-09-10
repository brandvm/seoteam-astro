import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
export const threads = sqliteTable('review_threads', {
  id: integer('id').primaryKey({ autoIncrement:true }), requestId:text('request_id').notNull().unique(),
  page:text('page').notNull(), anchor:text('anchor').notNull(), anchorLabel:text('anchor_label').notNull(),
  x:integer('x').notNull(), y:integer('y').notNull(), createdAt:integer('created_at').notNull(),
  resolved:integer('resolved').notNull().default(0), resolvedBy:text('resolved_by'), resolvedAt:integer('resolved_at'),
},t=>[index('idx_review_threads_page_id').on(t.page,t.id)]);
export const messages = sqliteTable('review_messages', {
  id:integer('id').primaryKey({autoIncrement:true}),requestId:text('request_id').notNull().unique(),
  threadId:integer('thread_id').notNull().references(()=>threads.id,{onDelete:'cascade'}),
  visitorId:text('visitor_id').notNull(),name:text('name').notNull(),body:text('body').notNull(),createdAt:integer('created_at').notNull(),
},t=>[index('idx_review_messages_thread_id').on(t.threadId,t.id)]);
export const reactions = sqliteTable('review_reactions', {
  messageId:integer('message_id').notNull().references(()=>messages.id,{onDelete:'cascade'}),
  visitorId:text('visitor_id').notNull(),emoji:text('emoji').notNull(),
},t=>[primaryKey({columns:[t.messageId,t.visitorId,t.emoji]})]);
export const rateLimits = sqliteTable('review_rate_limits', {
  key:text('key').primaryKey(),window:integer('window').notNull(),count:integer('count').notNull(),
},t=>[index('idx_review_rate_window').on(t.window)]);
