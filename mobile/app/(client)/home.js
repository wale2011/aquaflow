import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, bookingsAPI } from '../../services/api';
import Colors from '../../constants/colors';
import { BOOKING_STATUS_LABELS } from '../../constants/config';

export default function ClientHome() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await usersAPI.dashboard();
      setStats(res.data.stats);
      setUpcoming(res.data.upcoming || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={['#0EA5E9', '#0369A1']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]} 👋</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.location}>{user?.lga}, Lagos</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/(client)/notifications')}>
            <Ionicons name="notifications" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Quick Action */}
        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/(client)/drivers')} activeOpacity={0.85}>
          <Ionicons name="water" size={22} color={Colors.primaryDark} />
          <Text style={styles.quickActionText}>Book Water Delivery Now</Text>
          <Ionicons name="arrow-forward" size={18} color={Colors.primaryDark} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard icon="calendar" label="Total Bookings" value={stats.total_bookings} color={Colors.primary} />
          <StatCard icon="repeat" label="Active Plans" value={stats.active_subscriptions} color={Colors.secondary} />
          <StatCard icon="checkmark-circle" label="Delivered" value={stats.completed_deliveries} color={Colors.success} />
          <StatCard icon="time" label="Upcoming" value={stats.upcoming_deliveries} color={Colors.accent} />
        </View>
      )}

      {/* Upcoming Deliveries */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚛 Upcoming Deliveries</Text>
          <TouchableOpacity onPress={() => router.push('/(client)/bookings')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {upcoming.length === 0 ? (
          <EmptyState
            icon="water-outline"
            title="No upcoming deliveries"
            subtitle="Book your first water delivery today!"
            actionLabel="Find Drivers"
            onAction={() => router.push('/(client)/drivers')}
          />
        ) : (
          upcoming.map(booking => (
            <BookingCard key={booking.id} booking={booking} onPress={() => router.push(`/(client)/booking-detail?id=${booking.id}`)} />
          ))
        )}
      </View>

      {/* Quick Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickLinks}>
          <QuickLink icon="car" label="Find Drivers" color="#EFF6FF" iconColor={Colors.primary} onPress={() => router.push('/(client)/drivers')} />
          <QuickLink icon="repeat" label="My Plans" color="#ECFDF5" iconColor={Colors.success} onPress={() => router.push('/(client)/subscriptions')} />
          <QuickLink icon="star" label="Reviews" color="#FFFBEB" iconColor={Colors.accent} onPress={() => router.push('/(client)/bookings')} />
          <QuickLink icon="person" label="Profile" color="#F5F3FF" iconColor="#8B5CF6" onPress={() => router.push('/(client)/profile')} />
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Ionicons name={icon} size={22} color={color} />
    <Text style={styles.statValue}>{value ?? 0}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const BookingCard = ({ booking, onPress }) => {
  const statusColor = Colors.status[booking.status] || Colors.gray[400];
  return (
    <TouchableOpacity style={styles.bookingCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bookingDriver}>{booking.driver_name}</Text>
        <Text style={styles.bookingDate}>
          <Ionicons name="calendar-outline" size={13} /> {booking.scheduled_date} at {booking.scheduled_time}
        </Text>
        <Text style={styles.bookingAddress} numberOfLines={1}>
          <Ionicons name="location-outline" size={13} /> {booking.delivery_address}
        </Text>
      </View>
      <View style={styles.bookingRight}>
        <Text style={[styles.bookingStatus, { color: statusColor }]}>
          {BOOKING_STATUS_LABELS[booking.status]}
        </Text>
        <Text style={styles.bookingPrice}>₦{booking.price?.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
};

const QuickLink = ({ icon, label, color, iconColor, onPress }) => (
  <TouchableOpacity style={[styles.quickLink, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.8}>
    <Ionicons name={icon} size={26} color={iconColor} />
    <Text style={styles.quickLinkText}>{label}</Text>
  </TouchableOpacity>
);

const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }) => (
  <View style={styles.emptyState}>
    <Ionicons name={icon} size={52} color={Colors.gray[300]} />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
    {actionLabel && (
      <TouchableOpacity style={styles.emptyBtn} onPress={onAction}>
        <Text style={styles.emptyBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 26, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center'
  },
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16
  },
  quickActionText: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.primaryDark },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 20, paddingTop: 20
  },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.white,
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderTopWidth: 3, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.text.primary },
  statLabel: { fontSize: 12, color: Colors.text.secondary, textAlign: 'center' },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  seeAll: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  bookingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginBottom: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
    shadowRadius: 4, elevation: 2
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  bookingDriver: { fontSize: 15, fontWeight: '700', color: Colors.text.primary, marginBottom: 3 },
  bookingDate: { fontSize: 13, color: Colors.text.secondary, marginBottom: 2 },
  bookingAddress: { fontSize: 12, color: Colors.text.muted },
  bookingRight: { alignItems: 'flex-end', gap: 4 },
  bookingStatus: { fontSize: 12, fontWeight: '600' },
  bookingPrice: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickLink: {
    flex: 1, minWidth: '44%', borderRadius: 16,
    padding: 20, alignItems: 'center', gap: 8
  },
  quickLinkText: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  emptySubtitle: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: Colors.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12
  },
  emptyBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
});
