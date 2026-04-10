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
], async (req, res) => {
  try {
    const { name, address, lga } = req.body;

    await db.query(`
      UPDATE users SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        lga = COALESCE($3, lga),
        updated_at = NOW()
      WHERE id = $4
    `, [name || null, address || null, lga || null, req.user.id]);

    const userResult = await db.query(
      'SELECT id, name, email, phone, role, address, lga, state, profile_image FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];

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
    const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// GET /api/users/dashboard - Dashboard summary stats
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const isDriver = req.user.role === 'driver';

    if (isDriver) {
      const [
        totalBookings,
        pendingBookings,
        todayBookings,
        completedBookings,
        totalSubscriptions,
        totalEarnings,
        avgRating,
      ] = await Promise.all([
        db.query('SELECT COUNT(*)::int AS c FROM bookings WHERE driver_id = $1', [req.user.id]),
        db.query("SELECT COUNT(*)::int AS c FROM bookings WHERE driver_id = $1 AND status = 'pending'", [req.user.id]),
        db.query("SELECT COUNT(*)::int AS c FROM bookings WHERE driver_id = $1 AND scheduled_date = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')", [req.user.id]),
        db.query("SELECT COUNT(*)::int AS c FROM bookings WHERE driver_id = $1 AND status = 'delivered'", [req.user.id]),
        db.query("SELECT COUNT(*)::int AS c FROM subscriptions WHERE driver_id = $1 AND status = 'active'", [req.user.id]),
        db.query("SELECT COALESCE(SUM(price), 0)::double precision AS total FROM bookings WHERE driver_id = $1 AND status = 'delivered'", [req.user.id]),
        db.query(
          'SELECT CASE WHEN rating_count > 0 THEN ROUND((rating_sum / rating_count)::numeric, 1)::double precision ELSE 0 END AS avg FROM driver_profiles WHERE user_id = $1',
          [req.user.id]
        ),
      ]);

      const stats = {
        total_bookings: totalBookings.rows[0].c,
        pending_bookings: pendingBookings.rows[0].c,
        today_bookings: todayBookings.rows[0].c,
        completed_bookings: completedBookings.rows[0].c,
        total_subscriptions: totalSubscriptions.rows[0].c,
        total_earnings: totalEarnings.rows[0].total,
        avg_rating: avgRating.rows[0]?.avg || 0,
      };

      const upcomingResult = await db.query(`
        SELECT b.*, u.name as client_name, u.phone as client_phone
        FROM bookings b JOIN users u ON u.id = b.client_id
        WHERE b.driver_id = $1 AND b.status IN ('pending','confirmed')
        AND b.scheduled_date >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
        ORDER BY b.scheduled_date, b.scheduled_time LIMIT 5
      `, [req.user.id]);

      const upcoming = upcomingResult.rows;

      res.json({ success: true, stats, upcoming });
    } else {
      const [
        totalBookings,
        activeSubscriptions,
        completedDeliveries,
        upcomingDeliveries,
        totalSpent,
      ] = await Promise.all([
        db.query('SELECT COUNT(*)::int AS c FROM bookings WHERE client_id = $1', [req.user.id]),
        db.query("SELECT COUNT(*)::int AS c FROM subscriptions WHERE client_id = $1 AND status = 'active'", [req.user.id]),
        db.query("SELECT COUNT(*)::int AS c FROM bookings WHERE client_id = $1 AND status = 'delivered'", [req.user.id]),
        db.query("SELECT COUNT(*)::int AS c FROM bookings WHERE client_id = $1 AND status IN ('pending','confirmed','en_route') AND scheduled_date >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')", [req.user.id]),
        db.query("SELECT COALESCE(SUM(price), 0)::double precision AS total FROM bookings WHERE client_id = $1 AND status = 'delivered'", [req.user.id]),
      ]);

      const stats = {
        total_bookings: totalBookings.rows[0].c,
        active_subscriptions: activeSubscriptions.rows[0].c,
        completed_deliveries: completedDeliveries.rows[0].c,
        upcoming_deliveries: upcomingDeliveries.rows[0].c,
        total_spent: totalSpent.rows[0].total,
      };

      const upcomingResult = await db.query(`
        SELECT b.*, u.name as driver_name, u.phone as driver_phone
        FROM bookings b JOIN users u ON u.id = b.driver_id
        WHERE b.client_id = $1 AND b.status IN ('pending','confirmed','en_route')
        AND b.scheduled_date >= TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
        ORDER BY b.scheduled_date, b.scheduled_time LIMIT 5
      `, [req.user.id]);

      const upcoming = upcomingResult.rows;

      res.json({ success: true, stats, upcoming });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
});

module.exports = router;
