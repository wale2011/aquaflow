import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bookingsAPI } from '../../services/api';
import Colors from '../../constants/colors';
import { BOOKING_STATUS_LABELS } from '../../constants/config';

const STATUS_TABS = ['all', 'pending', 'confirmed', 'en_route', 'delivered', 'cancelled'];

export default function DriverBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const load = useCallback(async () => {
    try {
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const res = await bookingsAPI.list(params);
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => { setLoading(true); load(); }, [activeTab]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const updateStatus = async (bookingId, status) => {
    try {
      await bookingsAPI.updateStatus(bookingId, { status });
      load();
      const msgs = {
        confirmed: '✅ Booking confirmed!',
        en_route: '🚛 You are now on your way!',
        delivered: '💧 Delivery marked as complete!',
        cancelled: '❌ Booking cancelled',
      };
      Alert.alert('Updated', msgs[status] || 'Status updated');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update');
    }
  };

  const confirmAction = (bookingId, status, label) => {
    Alert.alert(`${label}?`, `Are you sure you want to ${label.toLowerCase()} this booking?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => updateStatus(bookingId, status) }
    ]);
  };

  const renderBooking = ({ item }) => {
    const statusColor = Colors.status[item.status] || Colors.gray[400];
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.clientAvatar}>
            <Ionicons name="person" size={22} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{item.client_name}</Text>
            <Text style={styles.clientPhone}>{item.client_phone}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {BOOKING_STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.details}>
          <DetailRow icon="calendar-outline" value={`${item.scheduled_date} at ${item.scheduled_time}`} />
          <DetailRow icon="location-outline" value={`${item.delivery_address}, ${item.lga}`} />
          <DetailRow icon="water-outline" value={`${(item.quantity_litres / 1000).toFixed(0)}k Litres`} />
          <DetailRow icon="cash-outline" value={`₦${item.price?.toLocaleString()} (${item.payment_method})`} />
          {item.client_notes && <DetailRow icon="chatbubble-outline" value={item.client_notes} />}
          {item.booking_type === 'subscription' && (
            <View style={styles.subBadge}>
              <Ionicons name="repeat" size={12} color={Colors.secondary} />
              <Text style={styles.subBadgeText}>Subscription Delivery</Text>
            </View>
          )}
        </View>

        {/* Rating if delivered */}
        {item.status === 'delivered' && item.rating && (
          <View style={styles.ratingRow}>
            {[1,2,3,4,5].map(s => (
              <Ionicons key={s} name={s <= item.rating ? 'star' : 'star-outline'} size={14} color={Colors.accent} />
            ))}
            {item.review && <Text style={styles.reviewText}>"{item.review}"</Text>}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => updateStatus(item.id, 'confirmed')}>
                <Ionicons name="checkmark" size={15} color={Colors.white} />
                <Text style={styles.confirmBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => confirmAction(item.id, 'cancelled', 'Cancel')}>
                <Ionicons name="close" size={15} color={Colors.error} />
                <Text style={styles.rejectBtnText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
          {item.status === 'confirmed' && (
            <TouchableOpacity style={styles.enRouteBtn} onPress={() => updateStatus(item.id, 'en_route')}>
              <Ionicons name="navigate" size={15} color={Colors.white} />
              <Text style={styles.enRouteBtnText}>Start Delivery</Text>
            </TouchableOpacity>
          )}
          {item.status === 'en_route' && (
            <TouchableOpacity style={styles.deliverBtn} onPress={() => confirmAction(item.id, 'delivered', 'Mark as Delivered')}>
              <Ionicons name="checkmark-circle" size={15} color={Colors.white} />
              <Text style={styles.deliverBtnText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Bookings</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'all' ? 'All' : tab === 'en_route' ? 'En Route' : BOOKING_STATUS_LABELS[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color={Colors.gray[300]} />
              <Text style={styles.emptyTitle}>No bookings found</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const DetailRow = ({ icon, value }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={14} color={Colors.gray[400]} />
    <Text style={styles.detailText}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: Colors.primaryDark },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white },
  tabs: { backgroundColor: Colors.white, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: Colors.gray[100] },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '500' },
  tabTextActive: { color: Colors.white, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 16,
    marginBottom: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  clientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  clientName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  clientPhone: { fontSize: 13, color: Colors.text.secondary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  details: { gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  detailText: { fontSize: 13, color: Colors.text.secondary, flex: 1 },
  subBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDFA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  subBadgeText: { fontSize: 11, color: Colors.secondary, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  reviewText: { fontSize: 12, color: Colors.text.muted, fontStyle: 'italic', flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.success, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  confirmBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.error },
  rejectBtnText: { color: Colors.error, fontWeight: '700', fontSize: 13 },
  enRouteBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#8B5CF6', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  enRouteBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  deliverBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  deliverBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
});
