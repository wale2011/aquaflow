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
  validate
], (req, res) => {
  try {
    const {
      driver_id, scheduled_date, scheduled_time,
      delivery_address, lga, quantity_litres = 10000,
      payment_method = 'cash', client_notes
    } = req.body;

    // Verify driver exists
    const driver = db.prepare(`
      SELECT u.id, dp.price_per_trip, dp.is_available
      FROM users u JOIN driver_profiles dp ON dp.user_id = u.id
      WHERE u.id = ? AND u.role = 'driver' AND u.is_active = 1
    `).get(driver_id);

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (!driver.is_available) return res.status(400).json({ success: false, message: 'Driver is currently unavailable' });

    // Check if driver already has a booking at this time
    const conflict = db.prepare(`
      SELECT id FROM bookings
      WHERE driver_id = ? AND scheduled_date = ? AND scheduled_time = ?
      AND status NOT IN ('cancelled', 'failed')
    `).get(driver_id, scheduled_date, scheduled_time);

    if (conflict) return res.status(409).json({ success: false, message: 'Driver already has a booking at this time. Please choose another time.' });

    const bookingId = uuidv4();
    const price = driver.price_per_trip;

    db.prepare(`
      INSERT INTO bookings (id, client_id, driver_id, booking_type, scheduled_date, scheduled_time,
        delivery_address, lga, quantity_litres, price, payment_method, client_notes)
      VALUES (?, ?, ?, 'one_time', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bookingId, req.user.id, driver_id, scheduled_date, scheduled_time,
      delivery_address, lga, quantity_litres, price, payment_method, client_notes || null);

    // Create notification for driver
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, body, type, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), driver_id,
      '🚛 New Delivery Request!',
      `New booking for ${scheduled_date} at ${scheduled_time}`,
      'new_booking',
      JSON.stringify({ booking_id: bookingId })
    );

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    res.status(201).json({ success: true, message: 'Booking created successfully!', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

// GET /api/bookings - Get bookings for current user
router.get('/', authenticate, (req, res) => {
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
      WHERE ${isDriver ? 'b.driver_id' : 'b.client_id'} = ?
    `;
    const params = [req.user.id];

    if (status) {
      sql += ` AND b.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY b.scheduled_date DESC, b.scheduled_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const bookings = db.prepare(sql).all(...params);
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// GET /api/bookings/:id - Single booking detail
router.get('/:id', authenticate, (req, res) => {
  try {
    const booking = db.prepare(`
      SELECT 
        b.*,
        u_client.name as client_name, u_client.phone as client_phone, u_client.address as client_address,
        u_driver.name as driver_name, u_driver.phone as driver_phone,
        dp.tanker_capacity, dp.tanker_plate, dp.tanker_type
      FROM bookings b
      JOIN users u_client ON u_client.id = b.client_id
      JOIN users u_driver ON u_driver.id = b.driver_id
      LEFT JOIN driver_profiles dp ON dp.user_id = b.driver_id
      WHERE b.id = ? AND (b.client_id = ? OR b.driver_id = ?)
    `).get(req.params.id, req.user.id, req.user.id);

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
  validate
], (req, res) => {
  try {
    const { status, driver_notes } = req.body;
    const isDriver = req.user.role === 'driver';

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Access control
    if (isDriver && booking.driver_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }
    if (!isDriver && booking.client_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }

    // Clients can only cancel
    if (!isDriver && status !== 'cancelled') {
      return res.status(403).json({ success: false, message: 'Clients can only cancel bookings' });
    }

    // Status flow validation
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['en_route', 'cancelled'],
      en_route: ['delivered', 'failed'],
      delivered: [],
      cancelled: [],
      failed: []
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from '${booking.status}' to '${status}'`
      });
    }

    const completedAt = status === 'delivered' ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE bookings SET status = ?, driver_notes = COALESCE(?, driver_notes),
        completed_at = COALESCE(?, completed_at), updated_at = datetime('now')
      WHERE id = ?
    `).run(status, driver_notes || null, completedAt, req.params.id);

    // Update driver stats on delivery
    if (status === 'delivered') {
      db.prepare(`
        UPDATE driver_profiles SET total_deliveries = total_deliveries + 1
        WHERE user_id = ?
      `).run(booking.driver_id);
    }

    // Send notification to the other party
    const notifyUserId = isDriver ? booking.client_id : booking.driver_id;
    const statusMessages = {
      confirmed: { title: '✅ Booking Confirmed!', body: 'Your water delivery has been confirmed.' },
      en_route: { title: '🚛 On The Way!', body: 'Your water tanker is on its way!' },
      delivered: { title: '💧 Water Delivered!', body: 'Your water delivery is complete. Rate your experience!' },
      cancelled: { title: '❌ Booking Cancelled', body: 'A booking has been cancelled.' },
      failed: { title: '⚠️ Delivery Failed', body: 'There was an issue with your delivery. Please rebook.' }
    };

    const msg = statusMessages[status];
    if (msg) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, body, type, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), notifyUserId, msg.title, msg.body, `booking_${status}`,
        JSON.stringify({ booking_id: req.params.id }));
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
  validate
], (req, res) => {
  try {
    const { rating, comment } = req.body;

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND client_id = ?').get(req.params.id, req.user.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'delivered') return res.status(400).json({ success: false, message: 'Can only review completed deliveries' });
    if (booking.rating) return res.status(409).json({ success: false, message: 'Review already submitted' });

    db.exec('BEGIN');
    try {
      db.prepare('UPDATE bookings SET rating = ?, review = ? WHERE id = ?').run(rating, comment || null, req.params.id);
      db.prepare(`
        INSERT OR REPLACE INTO reviews (id, booking_id, client_id, driver_id, rating, comment)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), req.params.id, req.user.id, booking.driver_id, rating, comment || null);
      db.prepare(`
        UPDATE driver_profiles SET rating_sum = rating_sum + ?, rating_count = rating_count + 1
        WHERE user_id = ?
      `).run(rating, booking.driver_id);
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
    res.json({ success: true, message: 'Review submitted. Thank you!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

module.exports = router;
