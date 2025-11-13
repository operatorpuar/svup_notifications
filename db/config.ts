import { defineDb, defineTable, column } from 'astro:db';

// FCM Tokens table for storing user FCM registration tokens
export const FCMToken = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    username: column.text({ unique: true }),
    fcm_token: column.text(),
    created_at: column.date(),
    updated_at: column.date()
  },
  indexes: {
    username_idx: { on: ['username'], unique: true }
  }
});

// Notifications table for storing user notifications
export const Notification = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    username: column.text(),
    notification_title: column.text(),
    status: column.text(), // 'New' or 'Read'
    created_at: column.date()
  },
  indexes: {
    username_idx: { on: ['username'] },
    created_at_idx: { on: ['created_at'] },
    status_idx: { on: ['status'] }
  }
});

// https://astro.build/db/config
export default defineDb({
  tables: {
    FCMToken,
    Notification
  }
});
