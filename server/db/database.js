import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import fs from 'node:fs';
import path from 'node:path';

// Ensure database directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(config.dbPath);

// Enable WAL mode and foreign key constraints for integrity and performance
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
`);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS queues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      prefix TEXT NOT NULL DEFAULT 'TK',
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_id INTEGER NOT NULL,
      token_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT DEFAULT '',
      service_type TEXT DEFAULT 'General',
      priority TEXT DEFAULT 'NORMAL', -- 'VIP', 'PRIORITY', 'NORMAL'
      status TEXT NOT NULL DEFAULT 'WAITING', -- 'WAITING', 'IN_SERVICE', 'COMPLETED', 'CANCELLED'
      position INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      cancellation_reason TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      service_started_at DATETIME DEFAULT NULL,
      completed_at DATETIME DEFAULT NULL,
      cancelled_at DATETIME DEFAULT NULL,
      wait_time_seconds INTEGER DEFAULT NULL,
      service_time_seconds INTEGER DEFAULT NULL,
      FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS queue_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      queue_id INTEGER NOT NULL,
      token_id INTEGER DEFAULT NULL,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (queue_id) REFERENCES queues(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tokens_queue_status ON tokens(queue_id, status);
    CREATE INDEX IF NOT EXISTS idx_tokens_position ON tokens(queue_id, position);
    CREATE INDEX IF NOT EXISTS idx_queue_events_queue ON queue_events(queue_id, created_at);
  `);
}

/**
 * Re-indexes all WAITING tokens in a queue to guarantee contiguous positions: 1, 2, 3, ... N
 * This prevents dead gaps or duplicate positions if items are cancelled or moved.
 */
export function reindexQueue(queueId) {
  const waitingTokens = db.prepare(`
    SELECT id FROM tokens
    WHERE queue_id = ? AND status = 'WAITING'
    ORDER BY position ASC, id ASC
  `).all(queueId);

  const updateStmt = db.prepare(`
    UPDATE tokens SET position = ? WHERE id = ?
  `);

  for (let i = 0; i < waitingTokens.length; i++) {
    updateStmt.run(i + 1, waitingTokens[i].id);
  }

  return waitingTokens.length;
}

/**
 * Logs a timeline event for audit trail, analytics, and live SSE broadcasts
 */
export function logQueueEvent(queueId, tokenId, eventType, description, metadata = {}) {
  try {
    const metaStr = typeof metadata === 'object' ? JSON.stringify(metadata) : String(metadata);
    const stmt = db.prepare(`
      INSERT INTO queue_events (queue_id, token_id, event_type, description, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    const res = stmt.run(queueId, tokenId || null, eventType, description, metaStr);
    return Number(res.lastInsertRowid);
  } catch (err) {
    console.error('Error logging queue event:', err);
    return null;
  }
}
