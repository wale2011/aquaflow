const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Lagos LGAs for validation
const LAGOS_LGAS = [
  'Agege','Ajeromi-Ifelodun','Alimosho','Amuwo-Odofin','Apapa',
  'Badagry','Epe','Eti-Osa','Ibeju-Lekki','Ifako-Ijaiye',
  'Ikeja','Ikorodu','Kosofe','Lagos Island','Lagos Mainland',
  'Mushin','Ojo','Oshodi-Isolo','Shomolu','Surulere'
];

// POST /api/auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').matches(/^(\+234|0)[789]\d{9}$/).withMessage('Valid Nigerian phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['client', 'driver']).withMessage('Role must be client or driver'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('lga').isIn(LAGOS_LGAS).withMessage('Valid Lagos LGA required'),
  validate
], async (req, res) => {
  try {
    const { name, email, phone, password, role, address, lga } = req.body;

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existingPhone) {
      return res.status(409).json({ success: false, message: 'Phone number already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, role, address, lga, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Lagos')
    `).run(userId, name, email, phone, passwordHash, role, address, lga);

    // Create driver profile if registering as driver
    if (role === 'driver') {
      const { tanker_capacity = 10000, price_per_trip = 3000, service_areas = [] } = req.body;
      db.prepare(`
        INSERT INTO driver_profiles (id, user_id, tanker_capacity, price_per_trip, service_areas)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), userId, tanker_capacity, price_per_trip, JSON.stringify(service_areas));
    }

    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    const user = db.prepare('SELECT id, name, email, phone, role, address, lga, state, created_at FROM users WHERE id = ?').get(userId);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to AquaFlow.',
      token,
      user
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact support.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    let profile = null;
    if (user.role === 'driver') {
      profile = db.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').get(user.id);
      if (profile) profile.service_areas = JSON.parse(profile.service_areas || '[]');
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        lga: user.lga,
        state: user.state,
        profile_image: user.profile_image,
        push_token: user.push_token,
        profile
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, name, email, phone, role, address, lga, state, profile_image, is_verified, push_token, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);

    let profile = null;
    if (user.role === 'driver') {
      profile = db.prepare('SELECT * FROM driver_profiles WHERE user_id = ?').get(user.id);
      if (profile) profile.service_areas = JSON.parse(profile.service_areas || '[]');
    }

    res.json({ success: true, user: { ...user, profile } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// PUT /api/auth/push-token
router.put('/push-token', authenticate, [
  body('push_token').notEmpty().withMessage('Push token required'),
  validate
], (req, res) => {
  try {
    db.prepare('UPDATE users SET push_token = ? WHERE id = ?').run(req.body.push_token, req.user.id);
    res.json({ success: true, message: 'Push token updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update push token' });
  }
});

module.exports = router;
