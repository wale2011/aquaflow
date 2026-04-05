import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { bookingsAPI, usersAPI } from '../../services/api';
import Colors from '../../constants/colors';

export default function EarningsScreen() {
  const [stats, setStats] = useState(null);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [dashRes, bookRes] = await Promise.all([
        usersAPI.dashboard(),
        bookingsAPI.list({ status: 'delivered', limit: 20 })
      ]);
      setStats(dashRes.data.stats);
      setRecentDeliveries(bookRes.data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
  );

  const avgPerTrip = stats?.total_earnings > 0 && stats?.completed_bookings > 0
    ? (stats.total_earnings / stats.completed_bookings).toFixed(0) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={['#059669', '#047857']} style={styles.header}>
        <Text style={styles.headerLabel}>Total Earnings</Text>
        <Text style={styles.totalEarnings}>₦{stats?.total_earnings?.toLocaleString() || '0'}</Text>
        <Text style={styles.headerSub}>All completed deliveries</Text>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard icon="checkmark-circle" label="Deliveries" value={stats?.completed_bookings || 0} color={Colors.success} />
        <StatCard icon="cash" label="Avg per Trip" value={`₦${parseInt(avgPerTrip).toLocaleString()}`} color={Colors.primary} />
        <StatCard icon="star" label="Rating" value={stats?.avg_rating || '–'} color={Colors.accent} />
      </View>

      {/* Recent Earnings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Deliveries</Text>
        {recentDeliveries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cash-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>No completed deliveries yet</Text>
          </View>
        ) : (
          recentDeliveries.map(delivery => (
            <View key={delivery.id} style={styles.earningRow}>
              <View style={styles.earningIcon}>
                <Ionicons name="water" size={18} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.earningClient}>{delivery.client_name}</Text>
                <Text style={styles.earningDate}>{delivery.scheduled_date} · {delivery.lga}</Text>
                {delivery.rating && (
                  <View style={styles.ratingRow}>
                    {[1,2,3,4,5].map(s => (
                      <Ionicons key={s} name={s <= delivery.rating ? 'star' : 'star-outline'} size={12} color={Colors.accent} />
                    ))}
                  </View>
                )}
              </View>
              <Text style={styles.earningAmount}>+₦{delivery.price?.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={20} color={Colors.accent} />
        <Text style={styles.tipText}>
          Tip: Maintain a high rating and complete deliveries on time to attract more clients and subscription plans!
        </Text>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const StatCard = ({ icon, label, value, color }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 70, paddingBottom: 40, alignItems: 'center', paddingHorizontal: 20 },
  headerLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  totalEarnings: { fontSize: 44, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -20 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    alignItems: 'center', borderTopWidth: 3, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3
  },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  statLabel: { fontSize: 11, color: Colors.text.secondary, textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary, marginBottom: 12 },
  emptyCard: { alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16, padding: 32, gap: 10 },
  emptyText: { fontSize: 14, color: Colors.text.secondary },
  earningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    marginBottom: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  earningIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center'
  },
  earningClient: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  earningDate: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', gap: 2, marginTop: 3 },
  earningAmount: { fontSize: 16, fontWeight: '800', color: Colors.success },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: 14, padding: 16,
    marginHorizontal: 16, borderWidth: 1, borderColor: Colors.accent + '40'
  },
  tipText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 },
});
