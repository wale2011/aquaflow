const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for AquaFlow backend (PostgreSQL migration)');
}

const useSsl = process.env.PGSSLMODE === 'require' || process.env.PGSSL === 'true';

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

let initialized = false;

async function query(text, params = []) {
  return pool.query(text, params);
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  if (initialized) return;

  await pool.query(`
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
      is_active BOOLEAN DEFAULT TRUE,
      is_verified BOOLEAN DEFAULT FALSE,
      push_token TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS driver_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tanker_capacity INTEGER NOT NULL DEFAULT 10000,
      tanker_plate TEXT,
      tanker_type TEXT DEFAULT 'standard',
      price_per_trip DOUBLE PRECISION NOT NULL DEFAULT 3000,
      service_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
      bio TEXT,
      years_experience INTEGER DEFAULT 0,
      total_deliveries INTEGER DEFAULT 0,
      rating_sum DOUBLE PRECISION DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      is_available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS availability_slots (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_bookings INTEGER DEFAULT 3,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

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
      price_per_delivery DOUBLE PRECISION NOT NULL,
      total_deliveries INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled')),
      next_delivery_date TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

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
      price DOUBLE PRECISION NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'en_route', 'delivered', 'cancelled', 'failed')),
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded')),
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'transfer', 'card')),
      driver_notes TEXT,
      client_notes TEXT,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      review TEXT,
      completed_at TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      data JSONB DEFAULT '{}'::jsonb,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id),
      client_id TEXT NOT NULL REFERENCES users(id),
      driver_id TEXT NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_availability_driver ON availability_slots(driver_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_client ON subscriptions(client_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);

  initialized = true;
  console.log('✅ PostgreSQL database initialized successfully');
}

module.exports = {
  pool,
  query,
  withTransaction,
  initializeDatabase,
};
