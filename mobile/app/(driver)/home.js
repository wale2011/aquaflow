import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Switch, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, driversAPI, bookingsAPI } from '../../services/api';
import Colors from '../../constants/colors';
import { BOOKING_STATUS_LABELS } from '../../constants/config';

export default function DriverHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [available, setAvailable] = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);

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

  const toggleAvailability = async (val) => {
    setTogglingAvail(true);
    try {
      await driversAPI.updateProfile({ is_available: val });
      setAvailable(val);
    } catch {
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setTogglingAvail(false);
    }
  };

  const handleAccept = async (bookingId) => {
    try {
      await bookingsAPI.updateStatus(bookingId, { status: 'confirmed' });
      load();
      Alert.alert('✅ Accepted!', 'Booking confirmed. Client has been notified.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to confirm booking');
    }
  };

  const handleEnRoute = async (bookingId) => {
    try {
      await bookingsAPI.updateStatus(bookingId, { status: 'en_route' });
      load();
    } catch (err) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleDeliver = async (bookingId) => {
    Alert.alert('Mark as Delivered', 'Confirm this delivery has been completed?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Delivered', onPress: async () => {
          try {
            await bookingsAPI.updateStatus(bookingId, { status: 'delivered' });
            load();
            Alert.alert('💧 Delivery Complete!', 'Great job! Payment will be collected.');
          } catch {
            Alert.alert('Error', 'Failed to mark delivered');
          }
        }
      }
    ]);
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
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
      <LinearGradient colors={['#0369A1', '#1E3A5F']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting}, Driver</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]} 🚛</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/(driver)/notifications')}>
            <Ionicons name="notifications" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Availability Toggle */}
        <View style={styles.availCard}>
          <View style={styles.availLeft}>
            <View style={[styles.availDot, { backgroundColor: available ? Colors.success : Colors.error }]} />
            <View>
              <Text style={styles.availLabel}>Status</Text>
              <Text style={styles.availStatus}>{available ? '✅ Available for Bookings' : '❌ Not Available'}</Text>
            </View>
          </View>
          {togglingAvail ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Switch
              value={available}
              onValueChange={toggleAvailability}
              trackColor={{ false: Colors.error + '50', true: Colors.success + '50' }}
              thumbColor={available ? Colors.success : Colors.error}
            />
          )}
        </View>
      </LinearGradient>

      {/* Stats */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard icon="calendar" label="Today" value={stats.today_bookings} color={Colors.primary} />
          <StatCard icon="time" label="Pending" value={stats.pending_bookings} color={Colors.accent} />
          <StatCard icon="checkmark-circle" label="Completed" value={stats.completed_bookings} color={Colors.success} />
          <StatCard icon="repeat" label="Subscriptions" value={stats.total_subscriptions} color={Colors.secondary} />
        </View>
      )}

      {/* Earnings Summary */}
      {stats && (
        <View style={styles.earningsCard}>
          <LinearGradient colors={['#10B981', '#059669']} style={styles.earningsGradient}>
            <View>
              <Text style={styles.earningsLabel}>Total Earnings</Text>
              <Text style={styles.earningsValue}>₦{stats.total_earnings?.toLocaleString() || '0'}</Text>
            </View>
            <View style={styles.ratingSection}>
              <Ionicons name="star" size={20} color={Colors.accent} />
              <Text style={styles.ratingValue}>{stats.avg_rating || '0'}</Text>
              <Text style={styles.ratingLabel}>Rating</Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Upcoming / Pending Bookings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 Incoming Requests</Text>
          <TouchableOpacity onPress={() => router.push('/(driver)/bookings')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyTitle}>No pending bookings</Text>
            <Text style={styles.emptySubtitle}>New booking requests will appear here</Text>
          </View>
        ) : (
          upcoming.map(booking => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.clientIcon}>
                  <Ionicons name="person" size={20} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>{booking.client_name}</Text>
                  <Text style={styles.clientPhone}>{booking.client_phone}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: Colors.status[booking.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: Colors.status[booking.status] }]}>
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </Text>
                </View>
              </View>
              <View style={styles.bookingDetails}>
                <BDetail icon="calendar-outline" value={`${booking.scheduled_date} at ${booking.scheduled_time}`} />
                <BDetail icon="location-outline" value={`${booking.delivery_address}, ${booking.lga}`} />
                <BDetail icon="water-outline" value={`${(booking.quantity_litres / 1000).toFixed(0)}k Litres`} />
                <BDetail icon="cash-outline" value={`₦${booking.price?.toLocaleString()}`} />
              </View>
              {/* Action Buttons */}
              <View style={styles.bookingActions}>
                {booking.status === 'pending' && (
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(booking.id)}>
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  </TouchableOpacity>
                )}
                {booking.status === 'confirmed' && (
                  <TouchableOpacity style={styles.enRouteBtn} onPress={() => handleEnRoute(booking.id)}>
                    <Ionicons name="navigate" size={16} color={Colors.white} />
                    <Text style={styles.enRouteBtnText}>I'm On My Way</Text>
                  </TouchableOpacity>
                )}
                {booking.status === 'en_route' && (
                  <TouchableOpacity style={styles.deliverBtn} onPress={() => handleDeliver(booking.id)}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                    <Text style={styles.deliverBtnText}>Mark Delivered</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickLinks}>
          <QuickLink icon="time" label="My Schedule" color="#EFF6FF" iconColor={Colors.primary} onPress={() => router.push('/(driver)/availability')} />
          <QuickLink icon="cash" label="Earnings" color="#ECFDF5" iconColor={Colors.success} onPress={() => router.push('/(driver)/earnings')} />
          <QuickLink icon="create" label="Edit Profile" color="#FFFBEB" iconColor={Colors.accent} onPress={() => router.push('/(driver)/profile')} />
          <QuickLink icon="star" label="My Ratings" color="#F5F3FF" iconColor="#8B5CF6" onPress={() => router.push('/(driver)/bookings')} />
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={styles.statValue}>{value ?? 0}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const BDetail = ({ icon, value }) => (
  <View style={styles.bdetailRow}>
    <Ionicons name={icon} size={13} color={Colors.gray[400]} />
    <Text style={styles.bdetailText}>{value}</Text>
  </View>
);

const QuickLink = ({ icon, label, color, iconColor, onPress }) => (
  <TouchableOpacity style={[styles.quickLink, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.8}>
    <Ionicons name={icon} size={26} color={iconColor} />
    <Text style={styles.quickLinkText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 26, fontWeight: '800', color: Colors.white },
  notifBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  availCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, borderRadius: 16, padding: 16 },
  availLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  availDot: { width: 12, height: 12, borderRadius: 6 },
  availLabel: { fontSize: 11, color: Colors.text.muted },
  availStatus: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: Colors.white, borderRadius: 14,
    padding: 14, alignItems: 'center', borderTopWidth: 3, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.text.primary },
  statLabel: { fontSize: 12, color: Colors.text.secondary },
  earningsCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  earningsGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  earningsLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  earningsValue: { fontSize: 28, fontWeight: '800', color: Colors.white },
  ratingSection: { alignItems: 'center', gap: 4 },
  ratingValue: { fontSize: 24, fontWeight: '800', color: Colors.white },
  ratingLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  seeAll: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  emptyCard: { alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16, padding: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  emptySubtitle: { fontSize: 13, color: Colors.text.secondary, textAlign: 'center' },
  bookingCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3
  },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  clientIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  clientName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  clientPhone: { fontSize: 13, color: Colors.text.secondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: '600' },
  bookingDetails: { gap: 5, marginBottom: 12 },
  bdetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bdetailText: { fontSize: 13, color: Colors.text.secondary },
  bookingActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  acceptBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  enRouteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  enRouteBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  deliverBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  deliverBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickLink: { flex: 1, minWidth: '44%', borderRadius: 14, padding: 18, alignItems: 'center', gap: 6 },
  quickLinkText: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
});
