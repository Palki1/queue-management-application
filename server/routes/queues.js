import express from 'express';
import { db, logQueueEvent, reindexQueue } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { eventService } from '../services/eventService.js';

const router = express.Router();

/**
 * List all queues with live metrics
 */
router.get('/', authenticateToken, (req, res, next) => {
  try {
    // Get queues created by this user or all queues
    const queues = db.prepare(`
      SELECT q.*, u.name as manager_name
      FROM queues q
      LEFT JOIN users u ON q.user_id = u.id
      ORDER BY q.created_at DESC
    `).all();

    // Enrich each queue with current live metrics
    const enrichedQueues = queues.map(queue => {
      const waiting = db.prepare(`
        SELECT COUNT(*) as count FROM tokens
        WHERE queue_id = ? AND status = 'WAITING'
      `).get(queue.id);

      const serving = db.prepare(`
        SELECT id, token_number, customer_name, service_type, service_started_at
        FROM tokens
        WHERE queue_id = ? AND status = 'IN_SERVICE'
        ORDER BY service_started_at DESC LIMIT 1
      `).get(queue.id);

      const todayStats = db.prepare(`
        SELECT
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_today,
          COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_today,
          AVG(CASE WHEN status = 'COMPLETED' THEN wait_time_seconds END) as avg_wait_seconds,
          AVG(CASE WHEN status = 'COMPLETED' THEN service_time_seconds END) as avg_service_seconds
        FROM tokens
        WHERE queue_id = ? AND date(created_at) = date('now')
      `).get(queue.id);

      return {
        ...queue,
        waiting_count: waiting?.count || 0,
        current_serving: serving || null,
        completed_today: todayStats?.completed_today || 0,
        cancelled_today: todayStats?.cancelled_today || 0,
        avg_wait_minutes: todayStats?.avg_wait_seconds ? Math.round(todayStats.avg_wait_seconds / 60) : 0,
        avg_service_minutes: todayStats?.avg_service_seconds ? Math.round(todayStats.avg_service_seconds / 60) : 0
      };
    });

    res.json({
      success: true,
      queues: enrichedQueues
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get single queue details by ID
 */
router.get('/:id', authenticateToken, (req, res, next) => {
  try {
    const queue = db.prepare(`
      SELECT q.*, u.name as manager_name
      FROM queues q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.id = ?
    `).get(req.params.id);

    if (!queue) {
      return res.status(404).json({ success: false, error: 'Queue not found.' });
    }

    res.json({ success: true, queue });
  } catch (err) {
    next(err);
  }
});

/**
 * Create a new Queue (Requirements 1 & 2: Manager can login and create Queues; Each Queue has a Name)
 */
router.post('/', authenticateToken, (req, res, next) => {
  try {
    const { name, prefix, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Queue name is required and cannot be empty.'
      });
    }

    const cleanName = name.trim();
    // Default prefix to 2-3 uppercase letters
    let cleanPrefix = (prefix || cleanName.substring(0, 3)).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPrefix) cleanPrefix = 'Q';

    const insertStmt = db.prepare(`
      INSERT INTO queues (user_id, name, prefix, description, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    const result = insertStmt.run(
      req.user.id,
      cleanName,
      cleanPrefix,
      (description || '').trim()
    );

    const queueId = Number(result.lastInsertRowid);
    const newQueue = db.prepare('SELECT * FROM queues WHERE id = ?').get(queueId);

    logQueueEvent(queueId, null, 'QUEUE_CREATED', `Queue "${cleanName}" created by ${req.user.name}`);
    eventService.broadcast('QUEUE_CREATED', { queue: newQueue });

    res.status(201).json({
      success: true,
      message: 'Queue created successfully.',
      queue: newQueue
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Update Queue
 */
router.put('/:id', authenticateToken, (req, res, next) => {
  try {
    const { name, prefix, description, is_active } = req.body;
    const queue = db.prepare('SELECT * FROM queues WHERE id = ?').get(req.params.id);

    if (!queue) {
      return res.status(404).json({ success: false, error: 'Queue not found.' });
    }

    const updatedName = name !== undefined ? name.trim() : queue.name;
    if (!updatedName) {
      return res.status(400).json({ success: false, error: 'Queue name cannot be empty.' });
    }

    const updatedPrefix = prefix !== undefined ? prefix.trim().toUpperCase() : queue.prefix;
    const updatedDesc = description !== undefined ? description.trim() : queue.description;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : queue.is_active;

    db.prepare(`
      UPDATE queues
      SET name = ?, prefix = ?, description = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(updatedName, updatedPrefix, updatedDesc, updatedActive, queue.id);

    const updatedQueue = db.prepare('SELECT * FROM queues WHERE id = ?').get(queue.id);
    eventService.broadcast('QUEUE_UPDATED', { queue: updatedQueue });

    res.json({
      success: true,
      message: 'Queue updated successfully.',
      queue: updatedQueue
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete Queue
 */
router.delete('/:id', authenticateToken, (req, res, next) => {
  try {
    const queue = db.prepare('SELECT * FROM queues WHERE id = ?').get(req.params.id);
    if (!queue) {
      return res.status(404).json({ success: false, error: 'Queue not found.' });
    }

    db.prepare('DELETE FROM queues WHERE id = ?').run(queue.id);
    eventService.broadcast('QUEUE_DELETED', { queueId: queue.id });

    res.json({
      success: true,
      message: `Queue "${queue.name}" deleted successfully.`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Requirement 6: Quick serve next token from queue root route
 * Endpoint: POST /api/queues/:id/serve-next
 */
router.post('/:id/serve-next', authenticateToken, (req, res, next) => {
  try {
    const queueId = req.params.id;
    reindexQueue(queueId);

    const topToken = db.prepare(`
      SELECT * FROM tokens
      WHERE queue_id = ? AND status = 'WAITING' AND position = 1
    `).get(queueId);

    if (!topToken) {
      return res.status(400).json({
        success: false,
        error: 'No waiting tokens found in this queue to serve.'
      });
    }

    // Auto-complete existing in-service token
    const currentServing = db.prepare(`
      SELECT * FROM tokens
      WHERE queue_id = ? AND status = 'IN_SERVICE'
    `).get(queueId);

    if (currentServing) {
      db.prepare(`
        UPDATE tokens
        SET status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP,
            service_time_seconds = MAX(30, CAST((strftime('%s', 'now') - strftime('%s', service_started_at)) AS INTEGER))
        WHERE id = ?
      `).run(currentServing.id);
    }

    db.prepare(`
      UPDATE tokens
      SET status = 'IN_SERVICE',
          position = 0,
          service_started_at = CURRENT_TIMESTAMP,
          wait_time_seconds = MAX(0, CAST((strftime('%s', 'now') - strftime('%s', created_at)) AS INTEGER))
      WHERE id = ?
    `).run(topToken.id);

    reindexQueue(queueId);
    const servedToken = db.prepare('SELECT * FROM tokens WHERE id = ?').get(topToken.id);

    logQueueEvent(
      queueId,
      servedToken.id,
      'TOKEN_SERVED',
      `Token ${servedToken.token_number} (${servedToken.customer_name}) called to service desk.`
    );

    eventService.broadcast('TOKEN_SERVED', {
      queueId: Number(queueId),
      token: servedToken
    });

    res.json({
      success: true,
      message: `Now serving Token ${servedToken.token_number} - ${servedToken.customer_name}!`,
      token: servedToken
    });
  } catch (err) {
    next(err);
  }
});

export default router;
