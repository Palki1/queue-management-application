import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import app from '../index.js';
import { runSeed } from '../db/seed.js';

let authToken;
let createdQueueId;
let createdTokenId1;
let createdTokenId2;
let createdTokenId3;

test.before(async () => {
  // Fresh seed
  runSeed();
});

// Robust in-memory HTTP dispatcher for Express without needing network sockets
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = options.method || 'GET';
    req.url = path;
    req.headers = {
      'content-type': 'application/json',
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    };
    req.socket = { remoteAddress: '127.0.0.1' };
    req.connection = req.socket;
    req.body = options.body || {};
    req.unpipe = () => {};
    req.resume = () => {};
    req.pause = () => {};

    const res = new EventEmitter();
    let resData = '';
    res.statusCode = 200;
    res.headersSent = false;
    res._headers = {};
    res.setHeader = (name, value) => { res._headers[name.toLowerCase()] = value; };
    res.getHeader = (name) => res._headers[name.toLowerCase()];
    res.removeHeader = (name) => { delete res._headers[name.toLowerCase()]; };
    res.hasHeader = (name) => name.toLowerCase() in res._headers;
    res.getHeaderNames = () => Object.keys(res._headers);
    res.writeHead = (code) => { res.statusCode = code; res.headersSent = true; };
    res.write = (chunk) => { resData += chunk; };
    res.status = (code) => { res.statusCode = code; return res; };

    let completed = false;
    const finish = (payload) => {
      if (completed) return;
      completed = true;
      res.headersSent = true;
      resolve({ status: res.statusCode, data: payload });
    };

    res.json = (data) => {
      finish(data);
    };

    res.send = (data) => {
      if (typeof data === 'object') {
        finish(data);
      } else {
        try {
          finish(JSON.parse(data));
        } catch {
          finish(data);
        }
      }
    };

    res.end = (chunk) => {
      if (chunk) resData += chunk;
      try {
        finish(JSON.parse(resData));
      } catch {
        finish(resData);
      }
    };

    try {
      app.handle(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------
// TEST SUITE: All 8 Core Requirements
// ---------------------------------------------------------

test('Requirement 1: Queue Manager can login and authenticate', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'admin@rugas.com', password: 'admin123' }
  });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.data.success, true);
  assert.ok(loginRes.data.token, 'Should return JWT token');
  assert.equal(loginRes.data.user.email, 'admin@rugas.com');

  authToken = loginRes.data.token;

  const meRes = await request('/api/auth/me');
  assert.equal(meRes.status, 200);
  assert.equal(meRes.data.user.name, 'Alex Morgan');
});

test('Requirement 2: Queue Manager can create Queues with a validated Name', async () => {
  const invalidRes = await request('/api/queues', {
    method: 'POST',
    body: { name: '   ', prefix: 'ERR' }
  });
  assert.equal(invalidRes.status, 400);

  const createRes = await request('/api/queues', {
    method: 'POST',
    body: {
      name: 'Pharmacy Dispensing Counter',
      prefix: 'RX',
      description: 'Prescription pickup and pharmacist consultation'
    }
  });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.data.success, true);
  assert.equal(createRes.data.queue.name, 'Pharmacy Dispensing Counter');
  assert.equal(createRes.data.queue.prefix, 'RX');

  createdQueueId = createRes.data.queue.id;

  const listRes = await request('/api/queues');
  assert.equal(listRes.status, 200);
  const found = listRes.data.queues.find(q => q.id === createdQueueId);
  assert.ok(found, 'Created queue should exist in queues list');
});

test('Requirement 3: Manager can add new persons / tokens into the queue (token created)', async () => {
  const t1Res = await request(`/api/queues/${createdQueueId}/tokens`, {
    method: 'POST',
    body: {
      customer_name: 'Jonathan Doe',
      customer_phone: '+1 555-4001',
      service_type: 'Prescription',
      priority: 'NORMAL'
    }
  });

  assert.equal(t1Res.status, 201);
  assert.equal(t1Res.data.success, true);
  assert.ok(t1Res.data.token.token_number.startsWith('RX-'), 'Token number must have queue prefix');
  assert.equal(t1Res.data.token.position, 1, 'First token should be position #1');
  assert.equal(t1Res.data.token.status, 'WAITING');
  createdTokenId1 = t1Res.data.token.id;

  const t2Res = await request(`/api/queues/${createdQueueId}/tokens`, {
    method: 'POST',
    body: {
      customer_name: 'Alice Cooper',
      customer_phone: '+1 555-4002',
      service_type: 'Consultation',
      priority: 'VIP'
    }
  });
  assert.equal(t2Res.status, 201);
  assert.equal(t2Res.data.token.position, 2, 'Second token should be position #2');
  createdTokenId2 = t2Res.data.token.id;

  const t3Res = await request(`/api/queues/${createdQueueId}/tokens`, {
    method: 'POST',
    body: {
      customer_name: 'Bob Marley',
      customer_phone: '+1 555-4003',
      service_type: 'Refill',
      priority: 'NORMAL'
    }
  });
  assert.equal(t3Res.status, 201);
  assert.equal(t3Res.data.token.position, 3, 'Third token should be position #3');
  createdTokenId3 = t3Res.data.token.id;
});

test('Requirement 4: The queue displays the list of people / tokens waiting in the queue', async () => {
  const res = await request(`/api/queues/${createdQueueId}/tokens?status=WAITING`);
  assert.equal(res.status, 200);
  assert.equal(res.data.tokens.length, 3);
  assert.equal(res.data.tokens[0].id, createdTokenId1);
  assert.equal(res.data.tokens[0].position, 1);
  assert.equal(res.data.tokens[1].id, createdTokenId2);
  assert.equal(res.data.tokens[1].position, 2);
  assert.equal(res.data.tokens[2].id, createdTokenId3);
  assert.equal(res.data.tokens[2].position, 3);
});

test('Requirement 5: The manager can move tokens up and down in the queue', async () => {
  // Move Token #2 UP (swaps with #1)
  const moveUpRes = await request(`/api/queues/${createdQueueId}/tokens/${createdTokenId2}/move`, {
    method: 'POST',
    body: { direction: 'UP' }
  });
  assert.equal(moveUpRes.status, 200);

  // Verify list order after move UP: Token 2 is #1, Token 1 is #2
  const resAfterUp = await request(`/api/queues/${createdQueueId}/tokens?status=WAITING`);
  assert.equal(resAfterUp.data.tokens[0].id, createdTokenId2);
  assert.equal(resAfterUp.data.tokens[1].id, createdTokenId1);

  // Boundary check: top cannot move UP
  const boundaryUpRes = await request(`/api/queues/${createdQueueId}/tokens/${createdTokenId2}/move`, {
    method: 'POST',
    body: { direction: 'UP' }
  });
  assert.equal(boundaryUpRes.status, 400);

  // Move Token 2 DOWN (swaps back with Token 1)
  const moveDownRes = await request(`/api/queues/${createdQueueId}/tokens/${createdTokenId2}/move`, {
    method: 'POST',
    body: { direction: 'DOWN' }
  });
  assert.equal(moveDownRes.status, 200);

  const resAfterDown = await request(`/api/queues/${createdQueueId}/tokens?status=WAITING`);
  assert.equal(resAfterDown.data.tokens[0].id, createdTokenId1);
  assert.equal(resAfterDown.data.tokens[1].id, createdTokenId2);

  // Boundary check: bottom cannot move DOWN
  const boundaryDownRes = await request(`/api/queues/${createdQueueId}/tokens/${createdTokenId3}/move`, {
    method: 'POST',
    body: { direction: 'DOWN' }
  });
  assert.equal(boundaryDownRes.status, 400);
});

test('Requirement 6: The manager can assign token at top of queue for service with a button click', async () => {
  // Serve top token (#1 which is Token 1)
  const serveRes = await request(`/api/queues/${createdQueueId}/serve-next`, {
    method: 'POST'
  });

  assert.equal(serveRes.status, 200);
  assert.equal(serveRes.data.success, true);
  assert.equal(serveRes.data.token.id, createdTokenId1);
  assert.equal(serveRes.data.token.status, 'IN_SERVICE');
  assert.ok(serveRes.data.token.service_started_at);

  // Remaining waiting tokens should automatically shift up (Token 2 is now #1, Token 3 is now #2)
  const waitingRes = await request(`/api/queues/${createdQueueId}/tokens?status=WAITING`);
  assert.equal(waitingRes.data.tokens.length, 2);
  assert.equal(waitingRes.data.tokens[0].id, createdTokenId2);
  assert.equal(waitingRes.data.tokens[0].position, 1);
  assert.equal(waitingRes.data.tokens[1].id, createdTokenId3);
  assert.equal(waitingRes.data.tokens[1].position, 2);

  // Complete service on Token 1
  const completeRes = await request(`/api/queues/${createdQueueId}/tokens/${createdTokenId1}/complete`, {
    method: 'POST'
  });
  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.data.token.status, 'COMPLETED');
});

test('Requirement 7: The manager shall be able to cancel a token from the queue', async () => {
  // Cancel Token 2 (which is currently position #1)
  const cancelRes = await request(`/api/queues/${createdQueueId}/tokens/${createdTokenId2}/cancel`, {
    method: 'POST',
    body: { reason: 'Customer left for another appointment' }
  });

  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.data.token.status, 'CANCELLED');
  assert.equal(cancelRes.data.token.cancellation_reason, 'Customer left for another appointment');

  // Verify remaining queue: Token 3 should now become position #1
  const waitingRes = await request(`/api/queues/${createdQueueId}/tokens?status=WAITING`);
  assert.equal(waitingRes.data.tokens.length, 1);
  assert.equal(waitingRes.data.tokens[0].id, createdTokenId3);
  assert.equal(waitingRes.data.tokens[0].position, 1);
});

test('Requirement 8: Dashboard shows analytics on wait times, queue length trends, and distribution', async () => {
  const overviewRes = await request('/api/analytics/overview');
  assert.equal(overviewRes.status, 200);
  assert.ok(overviewRes.data.summary.total_tokens > 0);
  assert.ok(overviewRes.data.summary.avg_wait_minutes !== undefined);

  const trendsRes = await request('/api/analytics/trends');
  assert.equal(trendsRes.status, 200);
  assert.ok(Array.isArray(trendsRes.data.trends));
  assert.ok(trendsRes.data.trends.length > 0);
  assert.ok(trendsRes.data.trends[0].queue_length !== undefined);

  const distRes = await request('/api/analytics/wait-distribution');
  assert.equal(distRes.status, 200);
  assert.ok(Array.isArray(distRes.data.distribution));

  const activityRes = await request('/api/analytics/activity-log');
  assert.equal(activityRes.status, 200);
  assert.ok(Array.isArray(activityRes.data.events));
  assert.ok(activityRes.data.events.length > 0);
});
