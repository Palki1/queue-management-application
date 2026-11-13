/**
 * Server-Sent Events (SSE) Hub for real-time queue updates.
 * Allows multiple manager screens and public displays to stay in sync live.
 */

class EventService {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);

    // Initial ping to establish connection
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(eventType, payload = {}) {
    const data = JSON.stringify({
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    });

    const deadClients = [];
    for (const client of this.clients) {
      try {
        client.write(`data: ${data}\n\n`);
      } catch (err) {
        deadClients.push(client);
      }
    }

    for (const client of deadClients) {
      this.clients.delete(client);
    }
  }

  broadcastQueueUpdate(queueId, eventType, data = {}) {
    this.broadcast(eventType, { queueId, ...data });
  }
}

export const eventService = new EventService();
