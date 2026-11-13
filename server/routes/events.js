import express from 'express';
import { eventService } from '../services/eventService.js';

const router = express.Router();

/**
 * SSE endpoint for live queue updates
 */
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders?.();

  eventService.addClient(res);

  // Send a heartbeat comment every 25 seconds
  const intervalId = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (err) {
      clearInterval(intervalId);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

export default router;
