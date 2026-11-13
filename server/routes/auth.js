import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';
import { config } from '../config.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Register a new Queue Manager
 */
router.post('/register', (req, res, next) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Please provide full name, username, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.trim().toLowerCase(), email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A manager with this username or email already exists.'
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const insertStmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, name)
      VALUES (?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      username.trim().toLowerCase(),
      email.trim().toLowerCase(),
      passwordHash,
      name.trim()
    );

    const userId = Number(result.lastInsertRowid);
    const user = {
      id: userId,
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      name: name.trim()
    };

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Login Queue Manager
 */
router.post('/login', (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your email/username and password.'
      });
    }

    const user = db.prepare(`
      SELECT * FROM users
      WHERE username = ? OR email = ?
    `).get(identifier.trim().toLowerCase(), identifier.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password. Please try again.'
      });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name
    };

    const token = jwt.sign(
      { id: safeUser.id, username: safeUser.username, email: safeUser.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Demo Login: Allows 1-click test login for evaluators
 */
router.post('/demo-login', (req, res, next) => {
  try {
    let demoUser = db.prepare('SELECT * FROM users WHERE email = ?').get('demo@rugas.com');

    if (!demoUser) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('demo1234', salt);
      const insert = db.prepare(`
        INSERT INTO users (username, email, password_hash, name)
        VALUES (?, ?, ?, ?)
      `).run('demomanager', 'demo@rugas.com', hash, 'Rugas Demo Manager');

      demoUser = {
        id: Number(insert.lastInsertRowid),
        username: 'demomanager',
        email: 'demo@rugas.com',
        name: 'Rugas Demo Manager'
      };
    }

    const safeUser = {
      id: demoUser.id,
      username: demoUser.username,
      email: demoUser.email,
      name: demoUser.name
    };

    const token = jwt.sign(
      { id: safeUser.id, username: safeUser.username, email: safeUser.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      success: true,
      message: 'Demo login successful.',
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get current authenticated user
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

export default router;
