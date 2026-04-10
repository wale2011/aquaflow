const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticate, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Helper: Calculate next delivery date based on frequency
function calculateNextDelivery(frequency, dayOfWeek) {
  const now = new Date();
  const nextDate = new Date();

  if (frequency === 'daily') {
    nextDate.setDate(now.getDate() + 1);
  } else if (frequency === 'weekly') {
    const targetDay = parseInt(dayOfWeek, 10);
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    nextDate.setDate(now.getDate() + daysUntil);
  } else if (frequency === 'biweekly') {
    const targetDay = parseInt(dayOfWeek, 10);
    const currentDay = now.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 14;
    nextDate.setDate(now.getDate() + daysUntil);
  } else if (frequency === 'monthly') {
    nextDate.setMonth(now.getMonth() + 1);
  }

  return nextDate.toISOString().split('T')[0];
}

// POST /api/subscriptions - Create a subscription plan (client only)
router.post('/', authenticate, requireRole('client'), [
  body('driver_id').notEmpty().withMessage('Driver ID required'),
  body('frequency').isIn(['daily', 'weekly', 'biweekly', 'monthly']).withMessage('Valid frequency required'),
  body('preferred_time').matches(/^\d{2}:\d{2}$/).withMessage('Time format HH:MM'),
  body('delivery_address').trim().notEmpty().withMessage('Delivery address required'),
  body('lga').notEmpty().withMessage('LGA required'),
  body('quantity_litres').optional().isInt({ min: 1000 }),
  body('day_of_week').optional().isInt({ min: 0, max: 6 }),
  validate,
], async (req, res) => {
  try {
    const {
      driver_id,
      frequency,
      day_of_week,
      preferred_time,
      delivery_address,
      lga,
      quantity_litres = 10000,
      notes,
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

    const existingResult = await db.query(
      `
      SELECT id FROM subscriptions
      WHERE client_id = $1 AND driver_id = $2 AND status = 'active'
      LIMIT 1
      `,
      [req.user.id, driver_id]
    );

    if (existingResult.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active subscription with this driver',
      });
    }

    const subscriptionId = uuidv4();
    const nextDeliveryDate = calculateNextDelivery(frequency, day_of_week);

    await db.query(
      `
      INSERT INTO subscriptions (
        id, client_id, driver_id, frequency, day_of_week, preferred_time,
        delivery_address, lga, quantity_litres, price_per_delivery, next_delivery_date, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        subscriptionId,
        req.user.id,
        driver_id,
        frequency,
        day_of_week !== undefined ? day_of_week : null,
        preferred_time,
        delivery_address,
        lga,
        quantity_litres,
        driver.price_per_trip,
        nextDeliveryDate,
        notes || null,
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
        '🔔 New Subscription!',
        `A client subscribed for ${frequency} water delivery`,
        'new_subscription',
        JSON.stringify({ subscription_id: subscriptionId }),
      ]
    );

    const subscriptionResult = await db.query('SELECT * FROM subscriptions WHERE id = $1', [subscriptionId]);
    res.status(201).json({
      success: true,
      message: 'Subscription created successfully!',
      subscription: subscriptionResult.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create subscription' });
  }
});

// GET /api/subscriptions - Get user subscriptions
router.get('/', authenticate, async (req, res) => {
  try {
    const isDriver = req.user.role === 'driver';
    const { status } = req.query;

    let sql = `
      SELECT
        s.*,
        u_client.name as client_name, u_client.phone as client_phone,
        u_driver.name as driver_name, u_driver.phone as driver_phone,
        dp.tanker_capacity, dp.tanker_type
      FROM subscriptions s
      JOIN users u_client ON u_client.id = s.client_id
      JOIN users u_driver ON u_driver.id = s.driver_id
      LEFT JOIN driver_profiles dp ON dp.user_id = s.driver_id
      WHERE ${isDriver ? 's.driver_id' : 's.client_id'} = $1
    `;
    const params = [req.user.id];

    if (status) {
      params.push(status);
      sql += ` AND s.status = $${params.length}`;
    }

    sql += ' ORDER BY s.created_at DESC';

    const subscriptionsResult = await db.query(sql, params);
    res.json({
      success: true,
      count: subscriptionsResult.rows.length,
      subscriptions: subscriptionsResult.rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
});

// PUT /api/subscriptions/:id - Pause or cancel subscription (client only)
router.put('/:id', authenticate, requireRole('client'), [
  body('status').isIn(['active', 'paused', 'cancelled']).withMessage('Invalid status'),
  validate,
], async (req, res) => {
  try {
    const subscriptionResult = await db.query(
      'SELECT * FROM subscriptions WHERE id = $1 AND client_id = $2',
      [req.params.id, req.user.id]
    );
    const subscription = subscriptionResult.rows[0];
    if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

    await db.query(
      'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2',
      [req.body.status, req.params.id]
    );

    const statusMsg = req.body.status === 'paused' ? 'paused' : 'cancelled';
    await db.query(
      `
      INSERT INTO notifications (id, user_id, title, body, type, data)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        uuidv4(),
        subscription.driver_id,
        `📋 Subscription ${statusMsg}`,
        `A client has ${statusMsg} their subscription`,
        'subscription_update',
        JSON.stringify({ subscription_id: req.params.id }),
      ]
    );

    res.json({ success: true, message: `Subscription ${statusMsg} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update subscription' });
  }
});

// POST /api/subscriptions/:id/generate - Generate next booking from subscription (cron/manual)
router.post('/:id/generate', authenticate, async (req, res) => {
  try {
    const subscriptionResult = await db.query(
      `
      SELECT s.*, dp.price_per_trip
      FROM subscriptions s
      JOIN driver_profiles dp ON dp.user_id = s.driver_id
      WHERE s.id = $1 AND s.status = 'active'
      `,
      [req.params.id]
    );

    const subscription = subscriptionResult.rows[0];
    if (!subscription) return res.status(404).json({ success: false, message: 'Active subscription not found' });

    const bookingId = uuidv4();
    await db.query(
      `
      INSERT INTO bookings (
        id, client_id, driver_id, subscription_id, booking_type,
        scheduled_date, scheduled_time, delivery_address, lga, quantity_litres, price, payment_method
      ) VALUES ($1, $2, $3, $4, 'subscription', $5, $6, $7, $8, $9, $10, 'cash')
      `,
      [
        bookingId,
        subscription.client_id,
        subscription.driver_id,
        subscription.id,
        subscription.next_delivery_date,
        subscription.preferred_time,
        subscription.delivery_address,
        subscription.lga,
        subscription.quantity_litres,
        subscription.price_per_delivery,
      ]
    );

    const nextDate = calculateNextDelivery(
      subscription.frequency,
      subscription.day_of_week
    );

    await db.query(
      `
      UPDATE subscriptions
      SET next_delivery_date = $1, total_deliveries = total_deliveries + 1, updated_at = NOW()
      WHERE id = $2
      `,
      [nextDate, subscription.id]
    );

    res.json({ success: true, message: 'Booking generated from subscription', booking_id: bookingId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to generate booking' });
  }
});

module.exports = router;
