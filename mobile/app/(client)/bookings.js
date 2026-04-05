import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { bookingsAPI } from '../../services/api';
import Colors from '../../constants/colors';
import { BOOKING_STATUS_LABELS } from '../../constants/config';

const STATUS_TABS = ['all', 'pending', 'confirmed', 'en_route', 'delivered', 'cancelled'];

export default function ClientBookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [reviewModal, setReviewModal] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleCancel = (bookingId) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await bookingsAPI.updateStatus(bookingId, { status: 'cancelled' });
            load();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to cancel booking');
          }
        }
      }
    ]);
  };

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      await bookingsAPI.review(reviewModal.id, { rating, comment });
      setReviewModal(null);
      setRating(5);
      setComment('');
      load();
      Alert.alert('✅ Review Submitted', 'Thank you for your feedback!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status) => Colors.status[status] || Colors.gray[400];

  const renderBooking = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>{item.driver_name}</Text>
          <Text style={styles.driverPhone}>{item.driver_phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
            {BOOKING_STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsGrid}>
        <Detail icon="calendar-outline" label="Date" value={item.scheduled_date} />
        <Detail icon="time-outline" label="Time" value={item.scheduled_time} />
        <Detail icon="water-outline" label="Quantity" value={`${(item.quantity_litres / 1000).toFixed(0)}k L`} />
        <Detail icon="cash-outline" label="Price" value={`₦${item.price?.toLocaleString()}`} />
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={Colors.primary} />
        <Text style={styles.address} numberOfLines={2}>{item.delivery_address}, {item.lga}</Text>
      </View>

      {item.payment_method && (
        <View style={styles.paymentRow}>
          <Ionicons name="wallet-outline" size={14} color={Colors.gray[400]} />
          <Text style={styles.paymentText}>Payment: {item.payment_method === 'cash' ? 'Cash on Delivery' : item.payment_method}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {['pending', 'confirmed'].includes(item.status) && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
            <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {item.status === 'delivered' && !item.rating && (
          <TouchableOpacity style={styles.reviewBtn} onPress={() => setReviewModal(item)}>
            <Ionicons name="star-outline" size={16} color={Colors.accent} />
            <Text style={styles.reviewBtnText}>Leave Review</Text>
          </TouchableOpacity>
        )}
        {item.status === 'delivered' && item.rating && (
          <View style={styles.ratedRow}>
            <Ionicons name="star" size={14} color={Colors.accent} />
            <Text style={styles.ratedText}>You rated {item.rating}/5</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>

        {/* Tab Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {STATUS_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'all' ? 'All' : tab === 'en_route' ? 'On The Way' : BOOKING_STATUS_LABELS[tab]}
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
                <Text style={styles.emptySubtitle}>Your deliveries will appear here</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Review Modal */}
      <Modal visible={!!reviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Your Delivery</Text>
            <Text style={styles.modalSubtitle}>How was your experience with {reviewModal?.driver_name}?</Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={40} color={Colors.accent} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
            </Text>
            <View style={styles.commentBox}>
              <Text style={styles.commentLabel}>Comment (optional)</Text>
              <View style={styles.commentInput}>
                <Ionicons name="chatbubble-outline" size={18} color={Colors.gray[400]} />
                <Modal visible={false} />
                {/* TextInput inline */}
              </View>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setReviewModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSubmitReview} disabled={submitting}>
                {submitting ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.modalSubmitText}>Submit Review</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const Detail = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <Ionicons name={icon} size={14} color={Colors.gray[400]} />
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: Colors.primary },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  driverName: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  driverPhone: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '44%' },
  detailLabel: { fontSize: 10, color: Colors.text.muted },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  address: { fontSize: 13, color: Colors.text.secondary, flex: 1 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  paymentText: { fontSize: 12, color: Colors.text.muted },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.error },
  cancelBtnText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: Colors.accent },
  reviewBtnText: { color: Colors.accent, fontSize: 13, fontWeight: '600' },
  ratedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratedText: { fontSize: 12, color: Colors.text.muted },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  emptySubtitle: { fontSize: 14, color: Colors.text.secondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.text.primary, marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  ratingLabel: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 20 },
  commentBox: { width: '100%', marginBottom: 20 },
  commentLabel: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, marginBottom: 8 },
  commentInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.gray[100], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: Colors.text.secondary },
  modalSubmitBtn: { flex: 1.5, paddingVertical: 16, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center' },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
