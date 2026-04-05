const express = require('express');
const { body } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// PUT /api/users/profile - Update user profile
router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('address').optional().trim().notEmpty(),
  body('lga').optional().notEmpty(),
  validate
], (req, res) => {
  try {
    const { name, address, lga } = req.body;
    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        address = COALESCE(?, address),
        lga = COALESCE(?, lga),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name || null, address || null, lga || null, req.user.id);

    const user = db.prepare('SELECT id, name, email, phone, role, address, lga, state, profile_image FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// PUT /api/users/password - Change password
router.put('/password', authenticate, [
  body('current_password').notEmpty().withMessage('Current password required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate
], async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// GET /api/users/dashboard - Dashboard summary stats
router.get('/dashboard', authenticate, (req, res) => {
  try {
    const isDriver = req.user.role === 'driver';

    if (isDriver) {
      const stats = {
        total_bookings: db.prepare('SELECT COUNT(*) as c FROM bookings WHERE driver_id = ?').get(req.user.id).c,
        pending_bookings: db.prepare("SELECT COUNT(*) as c FROM bookings WHERE driver_id = ? AND status = 'pending'").get(req.user.id).c,
        today_bookings: db.prepare("SELECT COUNT(*) as c FROM bookings WHERE driver_id = ? AND scheduled_date = date('now')").get(req.user.id).c,
        completed_bookings: db.prepare("SELECT COUNT(*) as c FROM bookings WHERE driver_id = ? AND status = 'delivered'").get(req.user.id).c,
        total_subscriptions: db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE driver_id = ? AND status = 'active'").get(req.user.id).c,
        total_earnings: db.prepare("SELECT COALESCE(SUM(price), 0) as total FROM bookings WHERE driver_id = ? AND status = 'delivered'").get(req.user.id).total,
        avg_rating: db.prepare('SELECT CASE WHEN rating_count > 0 THEN ROUND(rating_sum / rating_count, 1) ELSE 0 END as avg FROM driver_profiles WHERE user_id = ?').get(req.user.id)?.avg || 0
      };

      const upcoming = db.prepare(`
        SELECT b.*, u.name as client_name, u.phone as client_phone
        FROM bookings b JOIN users u ON u.id = b.client_id
        WHERE b.driver_id = ? AND b.status IN ('pending','confirmed')
        AND b.scheduled_date >= date('now')
        ORDER BY b.scheduled_date, b.scheduled_time LIMIT 5
      `).all(req.user.id);

      res.json({ success: true, stats, upcoming });
    } else {
      const stats = {
        total_bookings: db.prepare('SELECT COUNT(*) as c FROM bookings WHERE client_id = ?').get(req.user.id).c,
        active_subscriptions: db.prepare("SELECT COUNT(*) as c FROM subscriptions WHERE client_id = ? AND status = 'active'").get(req.user.id).c,
        completed_deliveries: db.prepare("SELECT COUNT(*) as c FROM bookings WHERE client_id = ? AND status = 'delivered'").get(req.user.id).c,
        upcoming_deliveries: db.prepare("SELECT COUNT(*) as c FROM bookings WHERE client_id = ? AND status IN ('pending','confirmed','en_route') AND scheduled_date >= date('now')").get(req.user.id).c,
        total_spent: db.prepare("SELECT COALESCE(SUM(price), 0) as total FROM bookings WHERE client_id = ? AND status = 'delivered'").get(req.user.id).total
      };

      const upcoming = db.prepare(`
        SELECT b.*, u.name as driver_name, u.phone as driver_phone
        FROM bookings b JOIN users u ON u.id = b.driver_id
        WHERE b.client_id = ? AND b.status IN ('pending','confirmed','en_route')
        AND b.scheduled_date >= date('now')
        ORDER BY b.scheduled_date, b.scheduled_time LIMIT 5
      `).all(req.user.id);

      res.json({ success: true, stats, upcoming });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
});

module.exports = router;
