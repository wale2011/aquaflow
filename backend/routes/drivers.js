const express = require('express');
const { body, query } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// GET /api/drivers - List all available drivers (with optional LGA filter)
router.get('/', authenticate, (req, res) => {
  try {
    const { lga, date, time } = req.query;

    let sql = `
      SELECT 
        u.id, u.name, u.phone, u.lga, u.profile_image,
        dp.tanker_capacity, dp.tanker_type, dp.price_per_trip,
        dp.service_areas, dp.bio, dp.years_experience,
        dp.total_deliveries, dp.is_available,
        CASE WHEN dp.rating_count > 0 THEN ROUND(dp.rating_sum / dp.rating_count, 1) ELSE 0 END as avg_rating,
        dp.rating_count
      FROM users u
      JOIN driver_profiles dp ON dp.user_id = u.id
      WHERE u.role = 'driver' AND u.is_active = 1 AND dp.is_available = 1
    `;
    const params = [];

    if (lga) {
      sql += ` AND (dp.service_areas LIKE ? OR u.lga = ?)`;
      params.push(`%${lga}%`, lga);
    }

    sql += ` ORDER BY avg_rating DESC, dp.total_deliveries DESC`;

    const drivers = db.prepare(sql).all(...params);
    drivers.forEach(d => {
      d.service_areas = JSON.parse(d.service_areas || '[]');
    });

    res.json({ success: true, count: drivers.length, drivers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
  }
});

// GET /api/drivers/:id - Single driver profile
router.get('/:id', authenticate, (req, res) => {
  try {
    const driver = db.prepare(`
      SELECT 
        u.id, u.name, u.phone, u.lga, u.address, u.profile_image,
        dp.tanker_capacity, dp.tanker_type, dp.tanker_plate, dp.price_per_trip,
        dp.service_areas, dp.bio, dp.years_experience,
        dp.total_deliveries, dp.is_available,
        CASE WHEN dp.rating_count > 0 THEN ROUND(dp.rating_sum / dp.rating_count, 1) ELSE 0 END as avg_rating,
        dp.rating_count
      FROM users u
      JOIN driver_profiles dp ON dp.user_id = u.id
      WHERE u.id = ? AND u.role = 'driver'
    `).get(req.params.id);

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    driver.service_areas = JSON.parse(driver.service_areas || '[]');

    // Get availability slots
    const availability = db.prepare(`
      SELECT id, day_of_week, start_time, end_time, max_bookings
      FROM availability_slots WHERE driver_id = ? AND is_active = 1
      ORDER BY day_of_week, start_time
    `).all(req.params.id);

    // Get recent reviews
    const reviews = db.prepare(`
      SELECT r.rating, r.comment, r.created_at, u.name as client_name
      FROM reviews r
      JOIN users u ON u.id = r.client_id
      WHERE r.driver_id = ?
      ORDER BY r.created_at DESC LIMIT 10
    `).all(req.params.id);

    res.json({ success: true, driver: { ...driver, availability, reviews } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch driver profile' });
  }
});

// PUT /api/drivers/profile - Update driver profile (driver only)
router.put('/profile', authenticate, requireRole('driver'), [
  body('price_per_trip').optional().isFloat({ min: 500 }).withMessage('Price must be at least ₦500'),
  body('tanker_capacity').optional().isInt({ min: 1000 }).withMessage('Capacity must be at least 1000 litres'),
  body('service_areas').optional().isArray().withMessage('Service areas must be an array'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio max 500 characters'),
  validate
], (req, res) => {
  try {
    const { price_per_trip, tanker_capacity, tanker_plate, tanker_type, service_areas, bio, years_experience, is_available } = req.body;

    const profile = db.prepare('SELECT id FROM driver_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Driver profile not found' });

    db.prepare(`
      UPDATE driver_profiles SET
        price_per_trip = COALESCE(?, price_per_trip),
        tanker_capacity = COALESCE(?, tanker_capacity),
        tanker_plate = COALESCE(?, tanker_plate),
        tanker_type = COALESCE(?, tanker_type),
        service_areas = COALESCE(?, service_areas),
        bio = COALESCE(?, bio),
        years_experience = COALESCE(?, years_experience),
        is_available = COALESCE(?, is_available),
        updated_at = datetime('now')
      WHERE user_id = ?
    `).run(
      price_per_trip, tanker_capacity, tanker_plate, tanker_type,
      service_areas ? JSON.stringify(service_areas) : null,
      bio, years_experience, is_available !== undefined ? (is_available ? 1 : 0) : null,
      req.user.id
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// POST /api/drivers/availability - Set availability slots (driver only)
router.post('/availability', authenticate, requireRole('driver'), [
  body('slots').isArray({ min: 1 }).withMessage('At least one slot required'),
  body('slots.*.day_of_week').isInt({ min: 0, max: 6 }).withMessage('Day must be 0-6'),
  body('slots.*.start_time').matches(/^\d{2}:\d{2}$/).withMessage('Start time format HH:MM'),
  body('slots.*.end_time').matches(/^\d{2}:\d{2}$/).withMessage('End time format HH:MM'),
  validate
], (req, res) => {
  try {
    const { slots } = req.body;

    // Clear existing slots and add new ones
    const deleteSlots = db.prepare('UPDATE availability_slots SET is_active = 0 WHERE driver_id = ?');
    const insertSlot = db.prepare(`
      INSERT INTO availability_slots (id, driver_id, day_of_week, start_time, end_time, max_bookings)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN');
    try {
      deleteSlots.run(req.user.id);
      for (const slot of slots) {
        insertSlot.run(uuidv4(), req.user.id, slot.day_of_week, slot.start_time, slot.end_time, slot.max_bookings || 3);
      }
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }

    res.json({ success: true, message: 'Availability updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
});

// GET /api/drivers/availability/my - Get my availability (driver only)
router.get('/availability/my', authenticate, requireRole('driver'), (req, res) => {
  try {
    const slots = db.prepare(`
      SELECT id, day_of_week, start_time, end_time, max_bookings
      FROM availability_slots WHERE driver_id = ? AND is_active = 1
      ORDER BY day_of_week, start_time
    `).all(req.user.id);
    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch availability' });
  }
});

module.exports = router;
