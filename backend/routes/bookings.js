const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// POST /api/bookings - Create a one-time booking (client only)
router.post('/', authenticate, requireRole('client'), [
  body('driver_id').notEmpty().withMessage('Driver ID required'),
  body('scheduled_date').isISO8601().withMessage('Valid date required (YYYY-MM-DD)'),
  body('scheduled_time').matches(/^\d{2}:\d{2}$/).withMessage('Time format HH:MM required'),
  body('delivery_address').trim().notEmpty().withMessage('Delivery address required'),
  body('lga').notEmpty().withMessage('LGA required'),
  body('quantity_litres').optional().isInt({ min: 1000 }).withMessage('Minimum 1000 litres'),
  body('payment_method').optional().isIn(['cash', 'transfer', 'card']).withMessage('Invalid payment method'),
  validate,
], async (req, res) => {
  try {
    const {
      driver_id,
      scheduled_date,
      scheduled_time,
      delivery_address,
      lga,
      quantity_litres = 10000,
      payment_method = 'cash',
      client_notes,
    } = req.body;

    const driverResult = await db.query(
      `
      SELECT u.id, dp.price_per_trip, dp.is_available
      FROM users u
      JOIN driver_profiles dp ON dp.user_id = u.id
      WHERE u.id = $1 AND u.role = 'driver' AND u.is_active = TRUE
      `,
      [driver_id]
    );
    const driver = driverResult.rows[0];

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (!driver.is_available) return res.status(400).json({ success: false, message: 'Driver is currently unavailable' });

    const conflictResult = await db.query(
      `
      SELECT id FROM bookings
      WHERE driver_id = $1 AND scheduled_date = $2 AND scheduled_time = $3
      AND status NOT IN ('cancelled', 'failed')
      LIMIT 1
      `,
      [driver_id, scheduled_date, scheduled_time]
    );
    if (conflictResult.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Driver already has a booking at this time. Please choose another time.' });
    }

    const bookingId = uuidv4();
    const price = driver.price_per_trip;

    await db.query(
      `
      INSERT INTO bookings (
        id, client_id, driver_id, booking_type, scheduled_date, scheduled_time,
        delivery_address, lga, quantity_litres, price, payment_method, client_notes
      ) VALUES ($1, $2, $3, 'one_time', $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        bookingId,
        req.user.id,
        driver_id,
        scheduled_date,
        scheduled_time,
        delivery_address,
        lga,
        quantity_litres,
        price,
        payment_method,
        client_notes || null,
      ]
    );

    await db.query(
      `
      INSERT INTO notifications (id, user_id, title, body, type, data)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        uuidv4(),
        driver_id,
        '🚛 New Delivery Request!',
        `New booking for ${scheduled_date} at ${scheduled_time}`,
        'new_booking',
        JSON.stringify({ booking_id: bookingId }),
      ]
    );

    const bookingResult = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    res.status(201).json({ success: true, message: 'Booking created successfully!', booking: bookingResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

// GET /api/bookings - Get bookings for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;
    const isDriver = req.user.role === 'driver';

    let sql = `
      SELECT
        b.*,
        u_client.name as client_name, u_client.phone as client_phone,
        u_driver.name as driver_name, u_driver.phone as driver_phone,
        dp.price_per_trip
      FROM bookings b
      JOIN users u_client ON u_client.id = b.client_id
      JOIN users u_driver ON u_driver.id = b.driver_id
      LEFT JOIN driver_profiles dp ON dp.user_id = b.driver_id
      WHERE ${isDriver ? 'b.driver_id' : 'b.client_id'} = $1
    `;
    const params = [req.user.id];

    if (status) {
      params.push(status);
      sql += ` AND b.status = $${params.length}`;
    }

    params.push(parseInt(limit, 10), parseInt(offset, 10));
    sql += ` ORDER BY b.scheduled_date DESC, b.scheduled_time DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const bookingsResult = await db.query(sql, params);
    res.json({ success: true, count: bookingsResult.rows.length, bookings: bookingsResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id - Single booking detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const bookingResult = await db.query(
      `
      SELECT
        b.*,
        u_client.name as client_name, u_client.phone as client_phone, u_client.address as client_address,
        u_driver.name as driver_name, u_driver.phone as driver_phone,
        dp.tanker_capacity, dp.tanker_plate, dp.tanker_type
      FROM bookings b
      JOIN users u_client ON u_client.id = b.client_id
      JOIN users u_driver ON u_driver.id = b.driver_id
      LEFT JOIN driver_profiles dp ON dp.user_id = b.driver_id
      WHERE b.id = $1 AND (b.client_id = $2 OR b.driver_id = $3)
      `,
      [req.params.id, req.user.id, req.user.id]
    );

    const booking = bookingResult.rows[0];
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch booking' });
  }
});

// PUT /api/bookings/:id/status - Update booking status (driver or client)
router.put('/:id/status', authenticate, [
  body('status').isIn(['confirmed', 'en_route', 'delivered', 'cancelled', 'failed']).withMessage('Invalid status'),
  body('driver_notes').optional().isString(),
  validate,
], async (req, res) => {
  try {
    const { status, driver_notes } = req.body;
    const isDriver = req.user.role === 'driver';

    const bookingResult = await db.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
    const booking = bookingResult.rows[0];
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (isDriver && booking.driver_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }
    if (!isDriver && booking.client_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }
    if (!isDriver && status !== 'cancelled') {
      return res.status(403).json({ success: false, message: 'Clients can only cancel bookings' });
    }

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['en_route', 'cancelled'],
      en_route: ['delivered', 'failed'],
      delivered: [],
      cancelled: [],
      failed: [],
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from '${booking.status}' to '${status}'`,
      });
    }

    const completedAt = status === 'delivered' ? new Date().toISOString() : null;

    await db.query(
      `
      UPDATE bookings SET
        status = $1,
        driver_notes = COALESCE($2, driver_notes),
        completed_at = COALESCE($3, completed_at),
        updated_at = NOW()
      WHERE id = $4
      `,
      [status, driver_notes || null, completedAt, req.params.id]
    );

    if (status === 'delivered') {
      await db.query('UPDATE driver_profiles SET total_deliveries = total_deliveries + 1 WHERE user_id = $1', [booking.driver_id]);
    }

    const notifyUserId = isDriver ? booking.client_id : booking.driver_id;
    const statusMessages = {
      confirmed: { title: '✅ Booking Confirmed!', body: 'Your water delivery has been confirmed.' },
      en_route: { title: '🚛 On The Way!', body: 'Your water tanker is on its way!' },
      delivered: { title: '💧 Water Delivered!', body: 'Your water delivery is complete. Rate your experience!' },
      cancelled: { title: '❌ Booking Cancelled', body: 'A booking has been cancelled.' },
      failed: { title: '⚠️ Delivery Failed', body: 'There was an issue with your delivery. Please rebook.' },
    };

    const msg = statusMessages[status];
    if (msg) {
      await db.query(
        `
        INSERT INTO notifications (id, user_id, title, body, type, data)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [uuidv4(), notifyUserId, msg.title, msg.body, `booking_${status}`, JSON.stringify({ booking_id: req.params.id })]
      );
    }

    res.json({ success: true, message: `Booking ${status} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update booking' });
  }
});

// POST /api/bookings/:id/review - Submit a review (client only, after delivery)
router.post('/:id/review', authenticate, requireRole('client'), [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('comment').optional().isLength({ max: 500 }),
  validate,
], async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const bookingResult = await db.query('SELECT * FROM bookings WHERE id = $1 AND client_id = $2', [req.params.id, req.user.id]);
    const booking = bookingResult.rows[0];
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'delivered') return res.status(400).json({ success: false, message: 'Can only review completed deliveries' });
    if (booking.rating) return res.status(409).json({ success: false, message: 'Review already submitted' });

    await db.withTransaction(async (client) => {
      await client.query('UPDATE bookings SET rating = $1, review = $2, updated_at = NOW() WHERE id = $3', [rating, comment || null, req.params.id]);

      await client.query(
        `
        INSERT INTO reviews (id, booking_id, client_id, driver_id, rating, comment)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (booking_id)
        DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
        `,
        [uuidv4(), req.params.id, req.user.id, booking.driver_id, rating, comment || null]
      );

      await client.query(
        'UPDATE driver_profiles SET rating_sum = rating_sum + $1, rating_count = rating_count + 1, updated_at = NOW() WHERE user_id = $2',
        [rating, booking.driver_id]
      );
    });

    res.json({ success: true, message: 'Review submitted. Thank you!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

module.exports = router;
