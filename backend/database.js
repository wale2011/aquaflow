// Node.js v22.5+ has a built-in sqlite module - no native compilation needed!
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = process.env.DB_PATH || './aquaflow.db';

const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    -- Users table (both clients and drivers)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('client', 'driver', 'admin')),
      profile_image TEXT,
      address TEXT,
      lga TEXT,
      state TEXT DEFAULT 'Lagos',
      is_active INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 0,
      push_token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Driver profiles (extended info for drivers)
    CREATE TABLE IF NOT EXISTS driver_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tanker_capacity INTEGER NOT NULL DEFAULT 10000,
      tanker_plate TEXT,
      tanker_type TEXT DEFAULT 'standard',
      price_per_trip REAL NOT NULL DEFAULT 3000,
      service_areas TEXT NOT NULL DEFAULT '[]',
      bio TEXT,
      years_experience INTEGER DEFAULT 0,
      total_deliveries INTEGER DEFAULT 0,
      rating_sum REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      is_available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Driver availability slots
    CREATE TABLE IF NOT EXISTS availability_slots (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_bookings INTEGER DEFAULT 3,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Subscriptions (recurring delivery plans)
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
      day_of_week INTEGER,
      preferred_time TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      lga TEXT NOT NULL,
      quantity_litres INTEGER NOT NULL DEFAULT 10000,
      price_per_delivery REAL NOT NULL,
      total_deliveries INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled')),
      next_delivery_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Bookings (individual delivery requests)
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id TEXT REFERENCES subscriptions(id),
      booking_type TEXT DEFAULT 'one_time' CHECK(booking_type IN ('one_time', 'subscription')),
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      lga TEXT NOT NULL,
      quantity_litres INTEGER NOT NULL DEFAULT 10000,
      price REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'en_route', 'delivered', 'cancelled', 'failed')),
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded')),
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'transfer', 'card')),
      driver_notes TEXT,
      client_notes TEXT,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      review TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT DEFAULT '{}',
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Reviews
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id),
      client_id TEXT NOT NULL REFERENCES users(id),
      driver_id TEXT NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_availability_driver ON availability_slots(driver_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);

  console.log('✅ Database initialized successfully');
}

initializeDatabase();

module.exports = db;
