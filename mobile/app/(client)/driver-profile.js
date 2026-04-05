import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { driversAPI, bookingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';
import { DAYS_OF_WEEK, PAYMENT_METHODS } from '../../constants/config';

export default function DriverProfileScreen() {
  const { id } = useLocalSearchParams();
  const driverId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user } = useAuth();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(false);
  const [booking, setBooking] = useState(false);

  const [form, setForm] = useState({
    scheduled_date: '', scheduled_time: '',
    delivery_address: user?.address || '',
    lga: user?.lga || '',
    quantity_litres: '10000',
    payment_method: 'cash',
    client_notes: ''
  });

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }

    driversAPI.getOne(driverId)
      .then(res => setDriver(res.data.driver))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [driverId]);

  const handleBook = async () => {
    if (!form.scheduled_date || !form.scheduled_time) {
      Alert.alert('Missing Info', 'Please enter date and time for delivery');
      return;
    }
    setBooking(true);
    try {
      await bookingsAPI.create({ driver_id: driverId, ...form, quantity_litres: parseInt(form.quantity_litres) || 10000 });
      setBookingModal(false);
      Alert.alert('🎉 Booked!', 'Your water delivery has been booked. The driver will confirm shortly.', [
        { text: 'View Booking', onPress: () => router.push('/(client)/bookings') }
      ]);
    } catch (err) {
      Alert.alert('Booking Failed', err.response?.data?.message || 'Please try again');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
  );
  if (!driver) return (
    <View style={styles.center}><Text>Driver not found</Text></View>
  );

  const stars = Array(5).fill(0).map((_, i) => i < Math.round(driver.avg_rating) ? 'star' : 'star-outline');

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#0EA5E9', '#0369A1']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Ionicons name="person" size={50} color={Colors.white} />
          </View>
          <Text style={styles.driverName}>{driver.name}</Text>
          <View style={styles.starsRow}>
            {stars.map((s, i) => <Ionicons key={i} name={s} size={18} color={Colors.accent} />)}
            <Text style={styles.ratingText}>{driver.avg_rating > 0 ? driver.avg_rating : 'No ratings yet'}</Text>
          </View>
          <View style={styles.badgeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>{driver.total_deliveries} Trips</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>{driver.lga}</Text></View>
            {driver.is_available
              ? <View style={[styles.badge, { backgroundColor: '#10B981' }]}><Text style={styles.badgeText}>✓ Available</Text></View>
              : <View style={[styles.badge, { backgroundColor: Colors.error }]}><Text style={styles.badgeText}>Busy</Text></View>
            }
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Info Cards */}
          <View style={styles.infoGrid}>
            <InfoCard icon="water" label="Capacity" value={`${(driver.tanker_capacity / 1000).toFixed(0)}k Litres`} color={Colors.primary} />
            <InfoCard icon="cash" label="Per Trip" value={`₦${driver.price_per_trip?.toLocaleString()}`} color={Colors.success} />
            <InfoCard icon="time" label="Experience" value={`${driver.years_experience || 0} yrs`} color={Colors.accent} />
            <InfoCard icon="car" label="Tanker Type" value={driver.tanker_type || 'Standard'} color={Colors.secondary} />
          </View>

          {/* Bio */}
          {driver.bio && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>About</Text>
              <Text style={styles.bio}>{driver.bio}</Text>
            </View>
          )}

          {/* Service Areas */}
          {driver.service_areas?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Service Areas</Text>
              <View style={styles.areaGrid}>
                {driver.service_areas.map((area, i) => (
                  <View key={i} style={styles.areaChip}>
                    <Ionicons name="location" size={12} color={Colors.primary} />
                    <Text style={styles.areaText}>{area}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Availability */}
          {driver.availability?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Availability Schedule</Text>
              {driver.availability.map((slot, i) => (
                <View key={i} style={styles.slotRow}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <Text style={styles.slotDay}>{DAYS_OF_WEEK[slot.day_of_week]}</Text>
                  <Text style={styles.slotTime}>{slot.start_time} – {slot.end_time}</Text>
                  <View style={styles.slotBadge}>
                    <Text style={styles.slotBadgeText}>Max {slot.max_bookings}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Reviews */}
          {driver.reviews?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Reviews</Text>
              {driver.reviews.slice(0, 3).map((review, i) => (
                <View key={i} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{review.client_name}</Text>
                    <View style={styles.reviewStars}>
                      {Array(review.rating).fill(0).map((_, j) => <Ionicons key={j} name="star" size={12} color={Colors.accent} />)}
                    </View>
                  </View>
                  {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                  <Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Book Button */}
      {driver.is_available && (
        <View style={styles.footer}>
          <View style={styles.footerPrice}>
            <Text style={styles.footerPriceLabel}>Price per trip</Text>
            <Text style={styles.footerPriceValue}>₦{driver.price_per_trip?.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={() => setBookingModal(true)} activeOpacity={0.85}>
            <Ionicons name="water" size={20} color={Colors.white} />
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Booking Modal */}
      <Modal visible={bookingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book Water Delivery</Text>
              <TouchableOpacity onPress={() => setBookingModal(false)}>
                <Ionicons name="close" size={26} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Field label="Delivery Date (YYYY-MM-DD)" icon="calendar-outline"
                placeholder="e.g. 2024-06-15" value={form.scheduled_date}
                onChangeText={v => setForm(f => ({ ...f, scheduled_date: v }))} />
              <Field label="Preferred Time (HH:MM)" icon="time-outline"
                placeholder="e.g. 09:00" value={form.scheduled_time}
                onChangeText={v => setForm(f => ({ ...f, scheduled_time: v }))} />
              <Field label="Delivery Address" icon="location-outline"
                placeholder="Full delivery address" value={form.delivery_address}
                onChangeText={v => setForm(f => ({ ...f, delivery_address: v }))} />
              <Field label="LGA" icon="map-outline"
                placeholder="e.g. Lekki" value={form.lga}
                onChangeText={v => setForm(f => ({ ...f, lga: v }))} />
              <Field label="Notes to Driver (optional)" icon="chatbubble-outline"
                placeholder="Special instructions..." value={form.client_notes}
                onChangeText={v => setForm(f => ({ ...f, client_notes: v }))} multiline />

              <Text style={styles.fieldLabel}>Payment Method</Text>
              <View style={styles.paymentRow}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.paymentChip, form.payment_method === m.value && styles.paymentChipActive]}
                    onPress={() => setForm(f => ({ ...f, payment_method: m.value }))}
                  >
                    <Text style={[styles.paymentChipText, form.payment_method === m.value && { color: Colors.white }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleBook} disabled={booking}>
                {booking ? <ActivityIndicator color={Colors.white} /> : (
                  <Text style={styles.confirmBtnText}>Confirm Booking – ₦{driver.price_per_trip?.toLocaleString()}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const Field = ({ label, icon, ...props }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={18} color={Colors.gray[400]} style={{ marginRight: 8 }} />
      <TextInput style={[styles.fieldInput, props.multiline && { height: 70, textAlignVertical: 'top' }]}
        placeholderTextColor={Colors.gray[400]} {...props} />
    </View>
  </View>
);

const InfoCard = ({ icon, label, value, color }) => (
  <View style={[styles.infoCard, { borderTopColor: color }]}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={styles.infoValue}>{value}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 28, alignItems: 'center', paddingHorizontal: 20 },
  backBtn: {
    position: 'absolute', top: 60, left: 20, padding: 8,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)'
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)'
  },
  driverName: { fontSize: 24, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  ratingText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  content: { padding: 16 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  infoCard: {
    flex: 1, minWidth: '44%', backgroundColor: Colors.white, borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 4, borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  infoValue: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  infoLabel: { fontSize: 11, color: Colors.text.muted },
  card: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginBottom: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginBottom: 12 },
  bio: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22 },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10
  },
  areaText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  slotDay: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, flex: 1 },
  slotTime: { fontSize: 13, color: Colors.text.secondary },
  slotBadge: { backgroundColor: Colors.gray[100], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  slotBadgeText: { fontSize: 11, color: Colors.text.muted },
  reviewItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewName: { fontSize: 14, fontWeight: '600', color: Colors.text.primary },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 13, color: Colors.text.secondary, marginBottom: 4 },
  reviewDate: { fontSize: 11, color: Colors.text.muted },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: Colors.border
  },
  footerPrice: { flex: 1 },
  footerPriceLabel: { fontSize: 12, color: Colors.text.muted },
  footerPriceValue: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark },
  bookBtn: {
    flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16
  },
  bookBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.primary, marginBottom: 6 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.gray[100], borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12
  },
  fieldInput: { flex: 1, fontSize: 14, color: Colors.text.primary },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  paymentChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.white
  },
  paymentChipActive: { backgroundColor: Colors.primary },
  paymentChipText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  confirmBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginBottom: 16
  },
  confirmBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
