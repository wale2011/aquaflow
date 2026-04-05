require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

async function seed() {
  console.log('🌱 Seeding AquaFlow database...\n');

  const password = await bcrypt.hash('password123', 12);

  // Seed Clients
  const clients = [
    { name: 'Amara Okafor', email: 'amara@test.com', phone: '08012345601', address: '14 Lekki Phase 1', lga: 'Eti-Osa' },
    { name: 'Emeka Nwosu', email: 'emeka@test.com', phone: '08012345602', address: '5 Victoria Island', lga: 'Eti-Osa' },
    { name: 'Chidinma Adeyemi', email: 'chidinma@test.com', phone: '08012345603', address: '22 Surulere Road', lga: 'Surulere' },
  ];

  for (const c of clients) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(c.email);
    if (!existing) {
      const id = uuidv4();
      db.prepare(`INSERT INTO users (id, name, email, phone, password_hash, role, address, lga) VALUES (?, ?, ?, ?, ?, 'client', ?, ?)`)
        .run(id, c.name, c.email, c.phone, password, c.address, c.lga);
      console.log(`✅ Client created: ${c.name}`);
    } else {
      console.log(`⏭  Client exists: ${c.name}`);
    }
  }

  // Seed Drivers
  const drivers = [
    {
      name: 'Chukwudi Obiora', email: 'chukwudi@test.com', phone: '08087654321',
      address: '3 Ikeja Estate', lga: 'Ikeja',
      profile: { tanker_capacity: 10000, price_per_trip: 3500, service_areas: ['Ikeja', 'Kosofe', 'Agege', 'Ifako-Ijaiye'], bio: 'Experienced water tanker driver with 5 years in Lagos. Clean water, professional service.', years_experience: 5, tanker_type: 'standard', tanker_plate: 'LND 234 KJA' }
    },
    {
      name: 'Babatunde Fashola', email: 'babatunde@test.com', phone: '08076543210',
      address: '8 Ikorodu Road', lga: 'Kosofe',
      profile: { tanker_capacity: 18000, price_per_trip: 5000, service_areas: ['Kosofe', 'Ikorodu', 'Alimosho', 'Shomolu'], bio: 'Large capacity tanker for commercial and residential delivery. Available 7 days a week.', years_experience: 8, tanker_type: 'large', tanker_plate: 'LND 567 ABJ' }
    },
    {
      name: 'Ngozi Eze', email: 'ngozi@test.com', phone: '08065432109',
      address: '20 Lekki Ajah', lga: 'Ibeju-Lekki',
      profile: { tanker_capacity: 10000, price_per_trip: 4000, service_areas: ['Ibeju-Lekki', 'Eti-Osa', 'Epe'], bio: 'Reliable water delivery for Lekki and environs. Clean tanker, fair prices.', years_experience: 3, tanker_type: 'standard', tanker_plate: 'LND 890 EFG' }
    },
  ];

  for (const d of drivers) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(d.email);
    let driverId;
    if (!existing) {
      driverId = uuidv4();
      db.prepare(`INSERT INTO users (id, name, email, phone, password_hash, role, address, lga) VALUES (?, ?, ?, ?, ?, 'driver', ?, ?)`)
        .run(driverId, d.name, d.email, d.phone, password, d.address, d.lga);
      const profileId = uuidv4();
      db.prepare(`INSERT INTO driver_profiles (id, user_id, tanker_capacity, price_per_trip, service_areas, bio, years_experience, tanker_type, tanker_plate, total_deliveries, rating_sum, rating_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(profileId, driverId, d.profile.tanker_capacity, d.profile.price_per_trip, JSON.stringify(d.profile.service_areas), d.profile.bio, d.profile.years_experience, d.profile.tanker_type, d.profile.tanker_plate, Math.floor(Math.random() * 50) + 10, Math.floor(Math.random() * 20) + 35, Math.floor(Math.random() * 10) + 8);

      // Seed availability (Mon-Sat)
      for (let day = 1; day <= 6; day++) {
        db.prepare(`INSERT INTO availability_slots (id, driver_id, day_of_week, start_time, end_time, max_bookings) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(uuidv4(), driverId, day, '07:00', '17:00', 4);
      }
      console.log(`✅ Driver created: ${d.name}`);
    } else {
      driverId = existing.id;
      console.log(`⏭  Driver exists: ${d.name}`);
    }
  }

  console.log('\n✅ Seed complete!\n');
  console.log('📱 Test accounts (password: password123):');
  console.log('   CLIENT:  amara@test.com');
  console.log('   CLIENT:  emeka@test.com');
  console.log('   DRIVER:  chukwudi@test.com');
  console.log('   DRIVER:  babatunde@test.com');
  console.log('   DRIVER:  ngozi@test.com\n');
}

seed().catch(console.error);
