import bcrypt from 'bcryptjs';
import { db, initDatabase, reindexQueue } from './database.js';

export function runSeed() {
  console.log('🌱 Starting database seeding...');
  initDatabase();

  // Clear existing data for fresh seed
  db.exec(`
    DELETE FROM queue_events;
    DELETE FROM tokens;
    DELETE FROM queues;
    DELETE FROM users;
  `);

  // 1. Create Default Demo Manager
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('admin123', salt);

  const userRes = db.prepare(`
    INSERT INTO users (username, email, password_hash, name)
    VALUES (?, ?, ?, ?)
  `).run('manager', 'admin@rugas.com', passwordHash, 'Alex Morgan');

  const userId = Number(userRes.lastInsertRowid);
  console.log(`✅ Created Manager: Alex Morgan (admin@rugas.com / admin123)`);

  // 2. Create Realistic Queues
  const createQueue = db.prepare(`
    INSERT INTO queues (user_id, name, prefix, description, is_active)
    VALUES (?, ?, ?, ?, ?)
  `);

  const q1 = Number(createQueue.run(userId, 'Customer Support & Inquiries', 'CS', 'General customer support, ticket resolution, and assistance', 1).lastInsertRowid);
  const q2 = Number(createQueue.run(userId, 'Express Billing & Checkout', 'EXP', 'Fast-track billing, payments, and quick returns under 3 items', 1).lastInsertRowid);
  const q3 = Number(createQueue.run(userId, 'VIP Priority Desk', 'VIP', 'High-priority advisory, premium enterprise clients, and escalations', 1).lastInsertRowid);

  console.log(`✅ Created 3 Queues: CS (#${q1}), EXP (#${q2}), VIP (#${q3})`);

  // 3. Insert Historical Completed & Cancelled Tokens (for rich analytics trends)
  const insertToken = db.prepare(`
    INSERT INTO tokens (
      queue_id, token_number, customer_name, customer_phone, service_type,
      priority, status, position, notes, created_at, service_started_at,
      completed_at, cancelled_at, cancellation_reason, wait_time_seconds, service_time_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Generate historical data for today between 08:00 and 15:00
  const today = new Date().toISOString().split('T')[0];

  const historicalCompleted = [
    { name: 'Marcus Vance', phone: '+1 555-0101', q: q1, prefix: 'CS-001', hour: '08:15', wait: 240, serv: 320 },
    { name: 'Elena Rostova', phone: '+1 555-0102', q: q1, prefix: 'CS-002', hour: '08:35', wait: 310, serv: 410 },
    { name: 'Devon Miles', phone: '+1 555-0103', q: q1, prefix: 'CS-003', hour: '09:10', wait: 450, serv: 360 },
    { name: 'Aria Montgomery', phone: '+1 555-0104', q: q1, prefix: 'CS-004', hour: '09:40', wait: 520, serv: 480 },
    { name: 'Liam Gallagher', phone: '+1 555-0105', q: q1, prefix: 'CS-005', hour: '10:15', wait: 600, serv: 390 },
    { name: 'Sophia Chen', phone: '+1 555-0106', q: q1, prefix: 'CS-006', hour: '10:50', wait: 710, serv: 520 },
    { name: 'Tariq Al-Mansoor', phone: '+1 555-0107', q: q1, prefix: 'CS-007', hour: '11:20', wait: 580, serv: 340 },
    { name: 'Chloe Bennett', phone: '+1 555-0108', q: q1, prefix: 'CS-008', hour: '12:05', wait: 820, serv: 440 },

    { name: 'Ethan Wright', phone: '+1 555-0201', q: q2, prefix: 'EXP-001', hour: '08:20', wait: 120, serv: 180 },
    { name: 'Olivia Martinez', phone: '+1 555-0202', q: q2, prefix: 'EXP-002', hour: '09:05', wait: 190, serv: 210 },
    { name: 'Noah Adams', phone: '+1 555-0203', q: q2, prefix: 'EXP-003', hour: '10:00', wait: 250, serv: 190 },
    { name: 'Isabella Rossi', phone: '+1 555-0204', q: q2, prefix: 'EXP-004', hour: '11:15', wait: 310, serv: 240 },

    { name: 'Dr. Gregory House', phone: '+1 555-0301', q: q3, prefix: 'VIP-001', hour: '09:30', wait: 180, serv: 900 },
    { name: 'Claire Underwood', phone: '+1 555-0302', q: q3, prefix: 'VIP-002', hour: '11:00', wait: 240, serv: 850 }
  ];

  for (const item of historicalCompleted) {
    const created = `${today} ${item.hour}:00`;
    const started = `${today} ${item.hour}:00`;
    const completed = `${today} ${item.hour}:00`;
    insertToken.run(
      item.q,
      item.prefix,
      item.name,
      item.phone,
      'Standard',
      'NORMAL',
      'COMPLETED',
      0,
      'Seeded completed record',
      created,
      started,
      completed,
      null,
      null,
      item.wait,
      item.serv
    );
  }

  // Cancelled records
  insertToken.run(
    q1,
    'CS-009',
    'Jordan Bell',
    '+1 555-0109',
    'Inquiry',
    'NORMAL',
    'CANCELLED',
    0,
    'Customer had an appointment elsewhere',
    `${today} 11:45:00`,
    null,
    null,
    `${today} 12:00:00`,
    'Customer left queue due to time constraint',
    900,
    0
  );

  // 4. Currently In-Service Tokens (Requirement 6 demonstration)
  insertToken.run(
    q1,
    'CS-010',
    'Sarah Jenkins',
    '+1 555-0110',
    'Technical Support',
    'PRIORITY',
    'IN_SERVICE',
    0,
    'Urgent account security verification',
    `${today} 12:30:00`,
    new Date(Date.now() - 4 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
    null,
    null,
    null,
    420,
    null
  );

  insertToken.run(
    q2,
    'EXP-005',
    'Grace Hopper',
    '+1 555-0205',
    'Quick Payment',
    'NORMAL',
    'IN_SERVICE',
    0,
    'Card terminal transaction',
    `${today} 12:45:00`,
    new Date(Date.now() - 2 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
    null,
    null,
    null,
    180,
    null
  );

  // 5. Currently Waiting Tokens (Requirements 3, 4, 5, 6, 7 demonstration)
  const waitingQ1 = [
    { name: 'Michael Chang', phone: '+1 555-0111', service: 'Billing Dispute', priority: 'VIP', notes: 'VIP account holder requiring fee waiver' },
    { name: 'Amira Patel', phone: '+1 555-0112', service: 'Product Return', priority: 'NORMAL', notes: 'Defective cable return with receipt' },
    { name: 'David Rodriguez', phone: '+1 555-0113', service: 'Account Upgrade', priority: 'PRIORITY', notes: 'Upgrading enterprise license' },
    { name: 'Emily Watson', phone: '+1 555-0114', service: 'General Inquiry', priority: 'NORMAL', notes: 'International roaming setup' },
    { name: 'James O’Connor', phone: '+1 555-0115', service: 'Contract Renewal', priority: 'NORMAL', notes: 'Annual plan renewal' }
  ];

  let seq = 11;
  for (let i = 0; i < waitingQ1.length; i++) {
    const item = waitingQ1[i];
    const tokenNum = `CS-${String(seq++).padStart(3, '0')}`;
    const createdAt = new Date(Date.now() - (waitingQ1.length - i) * 6 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    insertToken.run(
      q1,
      tokenNum,
      item.name,
      item.phone,
      item.service,
      item.priority,
      'WAITING',
      i + 1,
      item.notes,
      createdAt,
      null,
      null,
      null,
      null,
      null,
      null
    );
  }

  // Waiting in Q2 (Express)
  const waitingQ2 = [
    { name: 'Lucas Scott', phone: '+1 555-0206', service: 'Express Checkout', priority: 'NORMAL', notes: '1 item cash payment' },
    { name: 'Zoe Kravitz', phone: '+1 555-0207', service: 'Express Checkout', priority: 'NORMAL', notes: 'Gift card purchase' },
    { name: 'Nathan Drake', phone: '+1 555-0208', service: 'Express Return', priority: 'PRIORITY', notes: 'Express swap' }
  ];

  seq = 6;
  for (let i = 0; i < waitingQ2.length; i++) {
    const item = waitingQ2[i];
    const tokenNum = `EXP-${String(seq++).padStart(3, '0')}`;
    const createdAt = new Date(Date.now() - (waitingQ2.length - i) * 4 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    insertToken.run(
      q2,
      tokenNum,
      item.name,
      item.phone,
      item.service,
      item.priority,
      'WAITING',
      i + 1,
      item.notes,
      createdAt,
      null,
      null,
      null,
      null,
      null,
      null
    );
  }

  // Waiting in Q3 (VIP)
  const waitingQ3 = [
    { name: 'Katherine Pierce', phone: '+1 555-0303', service: 'Executive Wealth Review', priority: 'VIP', notes: 'Quarterly portfolio review' },
    { name: 'Bruce Wayne', phone: '+1 555-0304', service: 'Private Client Advisory', priority: 'VIP', notes: 'Confidential corporate restructuring' }
  ];

  seq = 3;
  for (let i = 0; i < waitingQ3.length; i++) {
    const item = waitingQ3[i];
    const tokenNum = `VIP-${String(seq++).padStart(3, '0')}`;
    const createdAt = new Date(Date.now() - (waitingQ3.length - i) * 10 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

    insertToken.run(
      q3,
      tokenNum,
      item.name,
      item.phone,
      item.service,
      item.priority,
      'WAITING',
      i + 1,
      item.notes,
      createdAt,
      null,
      null,
      null,
      null,
      null,
      null
    );
  }

  // Ensure all queues are indexed
  reindexQueue(q1);
  reindexQueue(q2);
  reindexQueue(q3);

  console.log('🎉 Seeding successfully completed! Database is fully populated.');
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed();
}
