require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = require('../database');

function toBool(value, fallback = false) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return Boolean(value);
}

function toJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function pickSqlitePath() {
  const candidates = [
    process.env.SQLITE_PATH,
    process.env.DB_PATH,
    '/data/aquaflow.db',
    path.join(__dirname, '../aquaflow.db'),
    path.join(process.cwd(), 'aquaflow.db'),
  ].filter(Boolean);

  return candidates.find((p) => fs.existsSync(p));
}

async function migrate() {
  const sqlitePath = pickSqlitePath();
  if (!sqlitePath) {
    throw new Error('SQLite source file not found. Set SQLITE_PATH=/path/to/aquaflow.db');
  }

  console.log(`📦 SQLite source: ${sqlitePath}`);

  const sqlite = new DatabaseSync(sqlitePath);

  try {
    await db.initializeDatabase();

    const users = sqlite.prepare('SELECT * FROM users').all();
    const driverProfiles = sqlite.prepare('SELECT * FROM driver_profiles').all();
    const availabilitySlots = sqlite.prepare('SELECT * FROM availability_slots').all();
    const subscriptions = sqlite.prepare('SELECT * FROM subscriptions').all();
    const bookings = sqlite.prepare('SELECT * FROM bookings').all();
    const notifications = sqlite.prepare('SELECT * FROM notifications').all();
    const reviews = sqlite.prepare('SELECT * FROM reviews').all();

    await db.withTransaction(async (client) => {
      for (const row of users) {
        await client.query(
          `
          INSERT INTO users (
            id, name, email, phone, password_hash, role, profile_image, address, lga, state,
            is_active, is_verified, push_token, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            profile_image = EXCLUDED.profile_image,
            address = EXCLUDED.address,
            lga = EXCLUDED.lga,
            state = EXCLUDED.state,
            is_active = EXCLUDED.is_active,
            is_verified = EXCLUDED.is_verified,
            push_token = EXCLUDED.push_token,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.name,
            row.email,
            row.phone,
            row.password_hash,
            row.role,
            row.profile_image ?? null,
            row.address ?? null,
            row.lga ?? null,
            row.state ?? 'Lagos',
            toBool(row.is_active, true),
            toBool(row.is_verified, false),
            row.push_token ?? null,
            row.created_at ?? new Date().toISOString(),
            row.updated_at ?? new Date().toISOString(),
          ]
        );
      }

      for (const row of driverProfiles) {
        await client.query(
          `
          INSERT INTO driver_profiles (
            id, user_id, tanker_capacity, tanker_plate, tanker_type, price_per_trip, service_areas,
            bio, years_experience, total_deliveries, rating_sum, rating_count, is_available, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7::jsonb,
            $8, $9, $10, $11, $12, $13, $14, $15
          )
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            tanker_capacity = EXCLUDED.tanker_capacity,
            tanker_plate = EXCLUDED.tanker_plate,
            tanker_type = EXCLUDED.tanker_type,
            price_per_trip = EXCLUDED.price_per_trip,
            service_areas = EXCLUDED.service_areas,
            bio = EXCLUDED.bio,
            years_experience = EXCLUDED.years_experience,
            total_deliveries = EXCLUDED.total_deliveries,
            rating_sum = EXCLUDED.rating_sum,
            rating_count = EXCLUDED.rating_count,
            is_available = EXCLUDED.is_available,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.user_id,
            row.tanker_capacity ?? 10000,
            row.tanker_plate ?? null,
            row.tanker_type ?? 'standard',
            row.price_per_trip ?? 3000,
            JSON.stringify(toJson(row.service_areas, [])),
            row.bio ?? null,
            row.years_experience ?? 0,
            row.total_deliveries ?? 0,
            row.rating_sum ?? 0,
            row.rating_count ?? 0,
            toBool(row.is_available, true),
            row.created_at ?? new Date().toISOString(),
            row.updated_at ?? new Date().toISOString(),
          ]
        );
      }

      for (const row of availabilitySlots) {
        await client.query(
          `
          INSERT INTO availability_slots (
            id, driver_id, day_of_week, start_time, end_time, max_bookings, is_active, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8
          )
          ON CONFLICT (id) DO UPDATE SET
            driver_id = EXCLUDED.driver_id,
            day_of_week = EXCLUDED.day_of_week,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            max_bookings = EXCLUDED.max_bookings,
            is_active = EXCLUDED.is_active,
            created_at = EXCLUDED.created_at
          `,
          [
            row.id,
            row.driver_id,
            row.day_of_week,
            row.start_time,
            row.end_time,
            row.max_bookings ?? 3,
            toBool(row.is_active, true),
            row.created_at ?? new Date().toISOString(),
          ]
        );
      }

      for (const row of subscriptions) {
        await client.query(
          `
          INSERT INTO subscriptions (
            id, client_id, driver_id, frequency, day_of_week, preferred_time,
            delivery_address, lga, quantity_litres, price_per_delivery, total_deliveries,
            status, next_delivery_date, notes, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16
          )
          ON CONFLICT (id) DO UPDATE SET
            client_id = EXCLUDED.client_id,
            driver_id = EXCLUDED.driver_id,
            frequency = EXCLUDED.frequency,
            day_of_week = EXCLUDED.day_of_week,
            preferred_time = EXCLUDED.preferred_time,
            delivery_address = EXCLUDED.delivery_address,
            lga = EXCLUDED.lga,
            quantity_litres = EXCLUDED.quantity_litres,
            price_per_delivery = EXCLUDED.price_per_delivery,
            total_deliveries = EXCLUDED.total_deliveries,
            status = EXCLUDED.status,
            next_delivery_date = EXCLUDED.next_delivery_date,
            notes = EXCLUDED.notes,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.client_id,
            row.driver_id,
            row.frequency,
            row.day_of_week ?? null,
            row.preferred_time,
            row.delivery_address,
            row.lga,
            row.quantity_litres ?? 10000,
            row.price_per_delivery,
            row.total_deliveries ?? 0,
            row.status ?? 'active',
            row.next_delivery_date ?? null,
            row.notes ?? null,
            row.created_at ?? new Date().toISOString(),
            row.updated_at ?? new Date().toISOString(),
          ]
        );
      }

      for (const row of bookings) {
        await client.query(
          `
          INSERT INTO bookings (
            id, client_id, driver_id, subscription_id, booking_type,
            scheduled_date, scheduled_time, delivery_address, lga, quantity_litres, price,
            status, payment_status, payment_method, driver_notes, client_notes, rating, review,
            completed_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21
          )
          ON CONFLICT (id) DO UPDATE SET
            client_id = EXCLUDED.client_id,
            driver_id = EXCLUDED.driver_id,
            subscription_id = EXCLUDED.subscription_id,
            booking_type = EXCLUDED.booking_type,
            scheduled_date = EXCLUDED.scheduled_date,
            scheduled_time = EXCLUDED.scheduled_time,
            delivery_address = EXCLUDED.delivery_address,
            lga = EXCLUDED.lga,
            quantity_litres = EXCLUDED.quantity_litres,
            price = EXCLUDED.price,
            status = EXCLUDED.status,
            payment_status = EXCLUDED.payment_status,
            payment_method = EXCLUDED.payment_method,
            driver_notes = EXCLUDED.driver_notes,
            client_notes = EXCLUDED.client_notes,
            rating = EXCLUDED.rating,
            review = EXCLUDED.review,
            completed_at = EXCLUDED.completed_at,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
          `,
          [
            row.id,
            row.client_id,
            row.driver_id,
            row.subscription_id ?? null,
            row.booking_type ?? 'one_time',
            row.scheduled_date,
            row.scheduled_time,
            row.delivery_address,
            row.lga,
            row.quantity_litres ?? 10000,
            row.price,
            row.status ?? 'pending',
            row.payment_status ?? 'pending',
            row.payment_method ?? 'cash',
            row.driver_notes ?? null,
            row.client_notes ?? null,
            row.rating ?? null,
            row.review ?? null,
            row.completed_at ?? null,
            row.created_at ?? new Date().toISOString(),
            row.updated_at ?? new Date().toISOString(),
          ]
        );
      }

      for (const row of notifications) {
        await client.query(
          `
          INSERT INTO notifications (
            id, user_id, title, body, type, data, is_read, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6::jsonb, $7, $8
          )
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            type = EXCLUDED.type,
            data = EXCLUDED.data,
            is_read = EXCLUDED.is_read,
            created_at = EXCLUDED.created_at
          `,
          [
            row.id,
            row.user_id,
            row.title,
            row.body,
            row.type,
            JSON.stringify(toJson(row.data, {})),
            toBool(row.is_read, false),
            row.created_at ?? new Date().toISOString(),
          ]
        );
      }

      for (const row of reviews) {
        await client.query(
          `
          INSERT INTO reviews (
            id, booking_id, client_id, driver_id, rating, comment, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
          )
          ON CONFLICT (booking_id) DO UPDATE SET
            rating = EXCLUDED.rating,
            comment = EXCLUDED.comment,
            created_at = EXCLUDED.created_at
          `,
          [
            row.id,
            row.booking_id,
            row.client_id,
            row.driver_id,
            row.rating,
            row.comment ?? null,
            row.created_at ?? new Date().toISOString(),
          ]
        );
      }
    });

    console.log('✅ SQLite -> PostgreSQL migration complete');
    console.log('   users:', users.length);
    console.log('   driver_profiles:', driverProfiles.length);
    console.log('   availability_slots:', availabilitySlots.length);
    console.log('   subscriptions:', subscriptions.length);
    console.log('   bookings:', bookings.length);
    console.log('   notifications:', notifications.length);
    console.log('   reviews:', reviews.length);
  } finally {
    if (typeof sqlite.close === 'function') sqlite.close();
    await db.pool.end();
  }
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

