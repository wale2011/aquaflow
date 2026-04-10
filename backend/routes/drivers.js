const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

function normalizeServiceAreas(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

// GET /api/drivers - List all available drivers (with optional LGA filter)
router.get('/', authenticate, async (req, res) => {
  try {
    const { lga } = req.query;

    let sql = `
      SELECT
        u.id, u.name, u.phone, u.lga, u.profile_image,
        dp.tanker_capacity, dp.tanker_type, dp.price_per_trip,
        dp.service_areas, dp.bio, dp.years_experience,
        dp.total_deliveries, dp.is_available,
        CASE WHEN dp.rating_count > 0 THEN ROUND((dp.rating_sum / dp.rating_count)::numeric, 1)::double precision ELSE 0 END as avg_rating,
        dp.rating_count
      FROM users u
      JOIN driver_profiles dp ON dp.user_id = u.id
      WHERE u.role = 'driver' AND u.is_active = TRUE AND dp.is_available = TRUE
    `;

    const params = [];
    if (lga) {
      sql += ` AND (dp.service_areas::text ILIKE $1 OR u.lga = $2)`;
      params.push(`%${lga}%`, lga);
    }

    sql += ` ORDER BY avg_rating DESC, dp.total_deliveries DESC`;

    const driversResult = await db.query(sql, params);
    const drivers = driversResult.rows.map((d) => ({
      ...d,
      service_areas: normalizeServiceAreas(d.service_areas),
    }));

    res.json({ success: true, count: drivers.length, drivers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
  }
});

// GET /api/drivers/:id - Single driver profile
router.get('/:id', authenticate, async (req, res) => {
  try {
    const driverResult = await db.query(
      `
      SELECT
        u.id, u.name, u.phone, u.lga, u.address, u.profile_image,
        dp.tanker_capacity, dp.tanker_type, dp.tanker_plate, dp.price_per_trip,
        dp.service_areas, dp.bio, dp.years_experience,
        dp.total_deliveries, dp.is_available,
        CASE WHEN dp.rating_count > 0 THEN ROUND((dp.rating_sum / dp.rating_count)::numeric, 1)::double precision ELSE 0 END as avg_rating,
        dp.rating_count
      FROM users u
      JOIN driver_profiles dp ON dp.user_id = u.id
      WHERE u.id = $1 AND u.role = 'driver'
      `,
      [req.params.id]
    );

    const driver = driverResult.rows[0];
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const availabilityResult = await db.query(
      `
      SELECT id, day_of_week, start_time, end_time, max_bookings
      FROM availability_slots
      WHERE driver_id = $1 AND is_active = TRUE
      ORDER BY day_of_week, start_time
      `,
      [req.params.id]
    );

    const reviewsResult = await db.query(
      `
      SELECT r.rating, r.comment, r.created_at, u.name as client_name
      FROM reviews r
      JOIN users u ON u.id = r.client_id
      WHERE r.driver_id = $1
      ORDER BY r.created_at DESC LIMIT 10
      `,
      [req.params.id]
    );

    res.json({
      success: true,
      driver: {
        ...driver,
        service_areas: normalizeServiceAreas(driver.service_areas),
        availability: availabilityResult.rows,
        reviews: reviewsResult.rows,
      },
    });
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
  validate,
], async (req, res) => {
  try {
    const {
      price_per_trip,
      tanker_capacity,
      tanker_plate,
      tanker_type,
      service_areas,
      bio,
      years_experience,
      is_available,
    } = req.body;

    const profileResult = await db.query('SELECT id FROM driver_profiles WHERE user_id = $1', [req.user.id]);
    if (!profileResult.rows[0]) return res.status(404).json({ success: false, message: 'Driver profile not found' });

    await db.query(
      `
      UPDATE driver_profiles SET
        price_per_trip = COALESCE($1, price_per_trip),
        tanker_capacity = COALESCE($2, tanker_capacity),
        tanker_plate = COALESCE($3, tanker_plate),
        tanker_type = COALESCE($4, tanker_type),
        service_areas = COALESCE($5::jsonb, service_areas),
        bio = COALESCE($6, bio),
        years_experience = COALESCE($7, years_experience),
        is_available = COALESCE($8, is_available),
        updated_at = NOW()
      WHERE user_id = $9
      `,
      [
        price_per_trip ?? null,
        tanker_capacity ?? null,
        tanker_plate ?? null,
        tanker_type ?? null,
        service_areas ? JSON.stringify(service_areas) : null,
        bio ?? null,
        years_experience ?? null,
        is_available === undefined ? null : Boolean(is_available),
        req.user.id,
      ]
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
  validate,
], async (req, res) => {
  try {
    const { slots } = req.body;

    await db.withTransaction(async (client) => {
      await client.query('UPDATE availability_slots SET is_active = FALSE WHERE driver_id = $1', [req.user.id]);

      for (const slot of slots) {
        await client.query(
          `
          INSERT INTO availability_slots (id, driver_id, day_of_week, start_time, end_time, max_bookings)
          VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [uuidv4(), req.user.id, slot.day_of_week, slot.start_time, slot.end_time, slot.max_bookings || 3]
        );
      }
    });

    res.json({ success: true, message: 'Availability updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
});

// GET /api/drivers/availability/my - Get my availability (driver only)
router.get('/availability/my', authenticate, requireRole('driver'), async (req, res) => {
  try {
    const slotsResult = await db.query(
      `
      SELECT id, day_of_week, start_time, end_time, max_bookings
      FROM availability_slots
      WHERE driver_id = $1 AND is_active = TRUE
      ORDER BY day_of_week, start_time
      `,
      [req.user.id]
    );

    res.json({ success: true, slots: slotsResult.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch availability' });
  }
});

module.exports = router;
