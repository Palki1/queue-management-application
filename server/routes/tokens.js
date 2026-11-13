import express from 'express';
import { db, reindexQueue, logQueueEvent } from '../db/database.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { eventService } from '../services/eventService.js';

const router = express.Router({ mergeParams: true });

/**
 * Helper: Calculate average service time (in seconds) for a queue
 */
function getQueueAvgServiceSeconds(queueId) {
  const result = db.prepare(`
    SELECT AVG(service_time_seconds) as avg_sec
    FROM tokens
    WHERE queue_id = ? AND status = 'COMPLETED' AND service_time_seconds > 0
  `).get(queueId);

  // Default to 5 minutes (300 seconds) if no completed tokens yet
  return (result && result.avg_sec) ? Math.round(result.avg_sec) : 300;
}

/**
 * Requirement 4: List tokens for a queue
 * - WAITING tokens ordered strictly by position ASC
 * - Active IN_SERVICE tokens
 * - Optional history of COMPLETED & CANCELLED tokens
 */
router.get('/', optionalAuth, (req, res, next) => {
  try {
    const queueId = req.params.queueId;
    const { status, search } = req.query;

    const queue = db.prepare('SELECT * FROM queues WHERE id = ?').get(queueId);
    if (!queue) {
      return res.status(404).json({ success: false, error: 'Queue not found.' });
    }

    const avgServiceSec = getQueueAvgServiceSeconds(queueId);

    let query = `SELECT * FROM tokens WHERE queue_id = ?`;
    const params = [queueId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (customer_name LIKE ? OR token_number LIKE ? OR customer_phone LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // Order: In service first, then waiting by position, then recent
    query += ` ORDER BY
      CASE status
        WHEN 'IN_SERVICE' THEN 1
        WHEN 'WAITING' THEN 2
        ELSE 3
      END,
      position ASC,
      id ASC
    `;

    const tokens = db.prepare(query).all(...params);

    // Compute estimated wait time and live elapsed wait time
    const enrichedTokens = tokens.map(t => {
      let estimatedWaitMinutes = 0;
      if (t.status === 'WAITING' && t.position > 0) {
        estimatedWaitMinutes = Math.max(1, Math.round(((t.position - 1) * avgServiceSec) / 60));
      }

      return {
        ...t,
        estimated_wait_minutes: estimatedWaitMinutes
      };
    });

    // Also fetch currently serving token
    const serving = db.prepare(`
      SELECT * FROM tokens
      WHERE queue_id = ? AND status = 'IN_SERVICE'
      ORDER BY service_started_at DESC LIMIT 1
    `).get(queueId);

    res.json({
      success: true,
      queue,
      tokens: enrichedTokens,
      current_serving: serving || null,
      avg_service_seconds: avgServiceSec
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Requirement 3: Add new person / token into the queue
 * Once added, a token is created with a unique token number and position.
 */
router.post('/', authenticateToken, (req, res, next) => {
  try {
    const queueId = req.params.queueId;
    const { customer_name, customer_phone, service_type, priority, notes } = req.body;

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Customer / Person name is required.'
      });
    }

    const queue = db.prepare('SELECT * FROM queues WHERE id = ?').get(queueId);
    if (!queue) {
      return res.status(404).json({ success: false, error: 'Queue not found.' });
    }

    // Count total tokens created today in this queue to generate sequential token number
    const countToday = db.prepare(`
      SELECT COUNT(*) as total FROM tokens
      WHERE queue_id = ? AND date(created_at) = date('now')
    `).get(queueId);

    const tokenSeq = (countToday?.total || 0) + 1;
    const paddedSeq = String(tokenSeq).padStart(3, '0');
    const tokenNumber = `${queue.prefix}-${paddedSeq}`;

    // Find the next position among WAITING tokens
    const maxPos = db.prepare(`
      SELECT MAX(position) as max_p FROM tokens
      WHERE queue_id = ? AND status = 'WAITING'
    `).get(queueId);

    const nextPosition = (maxPos?.max_p || 0) + 1;

    const insertStmt = db.prepare(`
      INSERT INTO tokens (
        queue_id, token_number, customer_name, customer_phone,
        service_type, priority, status, position, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 'WAITING', ?, ?)
    `);

    const result = insertStmt.run(
      queueId,
      tokenNumber,
      customer_name.trim(),
      (customer_phone || '').trim(),
      service_type || 'General',
      priority || 'NORMAL',
      nextPosition,
      (notes || '').trim()
    );

    const tokenId = Number(result.lastInsertRowid);
    const newToken = db.prepare('SELECT * FROM tokens WHERE id = ?').get(tokenId);

    // Audit log
    logQueueEvent(
      queueId,
      tokenId,
      'TOKEN_CREATED',
      `Token ${tokenNumber} created for "${customer_name.trim()}" at position #${nextPosition}`
    );

    // Broadcast SSE update
    eventService.broadcast('TOKEN_CREATED', {
      queueId: Number(queueId),
      token: newToken
    });

    res.status(201).json({
      success: true,
      message: `Token ${tokenNumber} successfully created for ${customer_name.trim()}.`,
      token: newToken
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Requirement 5: Move tokens UP and DOWN in the queue
 * Swaps positions with the adjacent token and maintains contiguous ordering.
 */
router.post('/:tokenId/move', authenticateToken, (req, res, next) => {
  try {
    const { queueId, tokenId } = req.params;
    const { direction, targetPosition } = req.body;

    const token = db.prepare(`
      SELECT * FROM tokens WHERE id = ? AND queue_id = ?
    `).get(tokenId, queueId);

    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found.' });
    }

    if (token.status !== 'WAITING') {
      return res.status(400).json({
        success: false,
        error: `Only waiting tokens can be reordered. Current status: ${token.status}`
      });
    }

    // Ensure contiguous positions before moving
    reindexQueue(queueId);

    // Refresh token after reindex
    const freshToken = db.prepare('SELECT * FROM tokens WHERE id = ?').get(tokenId);
    const currentPos = freshToken.position;

    // Get all waiting tokens in order
    const waitingTokens = db.prepare(`
      SELECT * FROM tokens
      WHERE queue_id = ? AND status = 'WAITING'
      ORDER BY position ASC
    `).all(queueId);

    const totalWaiting = waitingTokens.length;

    let swapWithToken = null;

    if (direction === 'UP') {
      if (currentPos <= 1) {
        return res.status(400).json({
          success: false,
          error: `Token ${token.token_number} is already at the top of the queue (#1).`
        });
      }
      swapWithToken = waitingTokens.find(t => t.position === currentPos - 1);
    } else if (direction === 'DOWN') {
      if (currentPos >= totalWaiting) {
        return res.status(400).json({
          success: false,
          error: `Token ${token.token_number} is already at the end of the queue (#${totalWaiting}).`
        });
      }
      swapWithToken = waitingTokens.find(t => t.position === currentPos + 1);
    } else if (targetPosition !== undefined) {
      const target = Math.max(1, Math.min(totalWaiting, Number(targetPosition)));
      if (target === currentPos) {
        return res.json({ success: true, message: 'Position unchanged.', token: freshToken });
      }

      // Reorder by placing token at target position
      const reordered = waitingTokens.filter(t => t.id !== freshToken.id);
      reordered.splice(target - 1, 0, freshToken);

      const updateStmt = db.prepare('UPDATE tokens SET position = ? WHERE id = ?');
      for (let i = 0; i < reordered.length; i++) {
        updateStmt.run(i + 1, reordered[i].id);
      }

      logQueueEvent(
        queueId,
        tokenId,
        'TOKEN_REORDERED',
        `Token ${token.token_number} moved to position #${target}`
      );

      eventService.broadcast('QUEUE_REORDERED', { queueId: Number(queueId) });

      return res.json({
        success: true,
        message: `Token ${token.token_number} moved to position #${target}.`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please specify direction ("UP" or "DOWN") or targetPosition.'
      });
    }

    if (!swapWithToken) {
      return res.status(400).json({
        success: false,
        error: 'Cannot find adjacent token to swap positions with.'
      });
    }

    // Atomic position swap
    const updateStmt = db.prepare('UPDATE tokens SET position = ? WHERE id = ?');
    updateStmt.run(swapWithToken.position, freshToken.id);
    updateStmt.run(currentPos, swapWithToken.id);

    const newPos = swapWithToken.position;
    logQueueEvent(
      queueId,
      tokenId,
      direction === 'UP' ? 'TOKEN_MOVED_UP' : 'TOKEN_MOVED_DOWN',
      `Token ${token.token_number} moved ${direction} to position #${newPos} (swapped with ${swapWithToken.token_number})`
    );

    eventService.broadcast('QUEUE_REORDERED', {
      queueId: Number(queueId),
      movedTokenId: Number(tokenId),
      direction,
      newPosition: newPos
    });

    const updatedToken = db.prepare('SELECT * FROM tokens WHERE id = ?').get(tokenId);

    res.json({
      success: true,
      message: `Token ${token.token_number} moved ${direction.toLowerCase()} to position #${newPos}.`,
      token: updatedToken
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Requirement 6: Assign the token at the top of the queue for service [With a simple button click]
 * Endpoint: POST /api/queues/:queueId/serve-next
 */
router.post('/serve-next', authenticateToken, (req, res, next) => {
  try {
    const queueId = req.params.queueId;

    // Ensure queue positions are clean
    reindexQueue(queueId);

    // Find the token at position #1
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

    // Check if another token is currently in service; if so, automatically mark it completed
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

      logQueueEvent(
        queueId,
        currentServing.id,
        'TOKEN_COMPLETED',
        `Previous token ${currentServing.token_number} marked completed to serve next token.`
      );
    }

    // Transition top token to IN_SERVICE
    db.prepare(`
      UPDATE tokens
      SET status = 'IN_SERVICE',
          position = 0,
          service_started_at = CURRENT_TIMESTAMP,
          wait_time_seconds = MAX(0, CAST((strftime('%s', 'now') - strftime('%s', created_at)) AS INTEGER))
      WHERE id = ?
    `).run(topToken.id);

    // Reindex remaining waiting tokens so #2 becomes #1, #3 becomes #2, etc.
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

/**
 * Assign a specific token to service (by ID)
 */
router.post('/:tokenId/serve', authenticateToken, (req, res, next) => {
  try {
    const { queueId, tokenId } = req.params;

    const token = db.prepare('SELECT * FROM tokens WHERE id = ? AND queue_id = ?').get(tokenId, queueId);
    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found.' });
    }

    if (token.status !== 'WAITING') {
      return res.status(400).json({
        success: false,
        error: `Token is not in waiting state (current: ${token.status}).`
      });
    }

    // Auto-complete any existing in-service token
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
    `).run(token.id);

    reindexQueue(queueId);

    const servedToken = db.prepare('SELECT * FROM tokens WHERE id = ?').get(token.id);

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

/**
 * Mark an IN_SERVICE token as COMPLETED
 */
router.post('/:tokenId/complete', authenticateToken, (req, res, next) => {
  try {
    const { queueId, tokenId } = req.params;

    const token = db.prepare('SELECT * FROM tokens WHERE id = ? AND queue_id = ?').get(tokenId, queueId);
    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found.' });
    }

    if (token.status !== 'IN_SERVICE') {
      return res.status(400).json({
        success: false,
        error: `Only tokens currently in service can be marked completed. Current: ${token.status}`
      });
    }

    db.prepare(`
      UPDATE tokens
      SET status = 'COMPLETED',
          completed_at = CURRENT_TIMESTAMP,
          service_time_seconds = MAX(30, CAST((strftime('%s', 'now') - strftime('%s', service_started_at)) AS INTEGER))
      WHERE id = ?
    `).run(token.id);

    const completedToken = db.prepare('SELECT * FROM tokens WHERE id = ?').get(token.id);

    logQueueEvent(
      queueId,
      token.id,
      'TOKEN_COMPLETED',
      `Service completed for Token ${token.token_number} (${token.customer_name}) in ${Math.round(completedToken.service_time_seconds / 60)} mins.`
    );

    eventService.broadcast('TOKEN_COMPLETED', {
      queueId: Number(queueId),
      token: completedToken
    });

    res.json({
      success: true,
      message: `Token ${token.token_number} service completed.`,
      token: completedToken
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Requirement 7: The manager shall be able to cancel a token from the queue.
 * Endpoint: POST /api/queues/:queueId/tokens/:tokenId/cancel
 */
router.post('/:tokenId/cancel', authenticateToken, (req, res, next) => {
  try {
    const { queueId, tokenId } = req.params;
    const { reason } = req.body;

    const token = db.prepare('SELECT * FROM tokens WHERE id = ? AND queue_id = ?').get(tokenId, queueId);
    if (!token) {
      return res.status(404).json({ success: false, error: 'Token not found.' });
    }

    if (token.status === 'COMPLETED' || token.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel a token that is already ${token.status.toLowerCase()}.`
      });
    }

    const cancelReason = (reason && reason.trim()) || 'Cancelled by manager';

    db.prepare(`
      UPDATE tokens
      SET status = 'CANCELLED',
          position = 0,
          cancelled_at = CURRENT_TIMESTAMP,
          cancellation_reason = ?,
          wait_time_seconds = MAX(0, CAST((strftime('%s', 'now') - strftime('%s', created_at)) AS INTEGER))
      WHERE id = ?
    `).run(cancelReason, token.id);

    // Reindex remaining waiting tokens so order remains clean
    reindexQueue(queueId);

    const cancelledToken = db.prepare('SELECT * FROM tokens WHERE id = ?').get(token.id);

    logQueueEvent(
      queueId,
      token.id,
      'TOKEN_CANCELLED',
      `Token ${token.token_number} (${token.customer_name}) cancelled. Reason: ${cancelReason}`
    );

    eventService.broadcast('TOKEN_CANCELLED', {
      queueId: Number(queueId),
      token: cancelledToken
    });

    res.json({
      success: true,
      message: `Token ${token.token_number} has been cancelled.`,
      token: cancelledToken
    });
  } catch (err) {
    next(err);
  }
});

export default router;
