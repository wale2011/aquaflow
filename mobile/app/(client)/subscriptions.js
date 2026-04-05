import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Modal, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { subscriptionsAPI, driversAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';
import { FREQUENCY_OPTIONS, DAYS_OF_WEEK, LAGOS_LGAS } from '../../constants/config';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newModal, setNewModal] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    driver_id: '', frequency: 'weekly', day_of_week: 1,
    preferred_time: '09:00', delivery_address: user?.address || '',
    lga: user?.lga || '', quantity_litres: '10000', notes: ''
  });

  const load = useCallback(async () => {
    try {
      const [subRes, drvRes] = await Promise.all([
        subscriptionsAPI.list(),
        driversAPI.list()
      ]);
      setSubscriptions(subRes.data.subscriptions || []);
      setDrivers(drvRes.data.drivers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleCreate = async () => {
    if (!form.driver_id) { Alert.alert('Select a Driver', 'Please select a driver for your subscription'); return; }
    if (!form.delivery_address) { Alert.alert('Address Required', 'Please enter delivery address'); return; }
    setCreating(true);
    try {
      await subscriptionsAPI.create({ ...form, quantity_litres: parseInt(form.quantity_litres) || 10000 });
      setNewModal(false);
      load();
      Alert.alert('🎉 Subscription Created!', 'Your recurring water delivery plan has been set up!');
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not create subscription');
    } finally {
      setCreating(false);
    }
  };

  const handlePauseCancel = (sub, action) => {
    const label = action === 'paused' ? 'Pause' : 'Cancel';
    Alert.alert(`${label} Subscription`, `Are you sure you want to ${label.toLowerCase()} this delivery plan?`, [
      { text: 'No', style: 'cancel' },
      {
        text: `Yes, ${label}`, style: action === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await subscriptionsAPI.update(sub.id, { status: action });
            load();
          } catch (err) {
            Alert.alert('Error', 'Could not update subscription');
          }
        }
      }
    ]);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const freqLabel = { daily: 'Every Day', weekly: 'Every Week', biweekly: 'Every 2 Weeks', monthly: 'Every Month' };
  const statusColor = { active: Colors.success, paused: Colors.accent, cancelled: Colors.error };

  const renderSub = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName}>{item.driver_name}</Text>
          <Text style={styles.freq}>{freqLabel[item.frequency]}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (statusColor[item.status] || Colors.gray[400]) + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor[item.status] || Colors.gray[400] }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        <Detail icon="time-outline" label="Time" value={item.preferred_time} />
        <Detail icon="location-outline" label="LGA" value={item.lga} />
        <Detail icon="water-outline" label="Volume" value={`${(item.quantity_litres / 1000).toFixed(0)}k L`} />
        <Detail icon="cash-outline" label="Per Delivery" value={`₦${item.price_per_delivery?.toLocaleString()}`} />
        <Detail icon="checkmark-circle-outline" label="Deliveries" value={item.total_deliveries} />
        {item.next_delivery_date && <Detail icon="calendar-outline" label="Next" value={item.next_delivery_date} />}
      </View>
      {item.status === 'active' && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.pauseBtn} onPress={() => handlePauseCancel(item, 'paused')}>
            <Ionicons name="pause-circle-outline" size={16} color={Colors.accent} />
            <Text style={styles.pauseBtnText}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => handlePauseCancel(item, 'cancelled')}>
            <Ionicons name="close-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.cancelBtnText}>Cancel Plan</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.status === 'paused' && (
        <TouchableOpacity style={styles.resumeBtn} onPress={async () => {
          await subscriptionsAPI.update(item.id, { status: 'active' });
          load();
        }}>
          <Ionicons name="play-circle-outline" size={16} color={Colors.success} />
          <Text style={styles.resumeBtnText}>Resume Plan</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Water Plans</Text>
            <Text style={styles.headerSubtitle}>Recurring delivery subscriptions</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setNewModal(true)}>
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : (
          <FlatList
            data={subscriptions}
            keyExtractor={item => item.id}
            renderItem={renderSub}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="repeat-outline" size={64} color={Colors.gray[300]} />
                <Text style={styles.emptyTitle}>No subscription plans yet</Text>
                <Text style={styles.emptySubtitle}>Set up a recurring water delivery and never run dry!</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => setNewModal(true)}>
                  <Ionicons name="add" size={18} color={Colors.white} />
                  <Text style={styles.emptyBtnText}>Create Plan</Text>
                </TouchableOpacity>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* New Subscription Modal */}
      <Modal visible={newModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Delivery Plan</Text>
              <TouchableOpacity onPress={() => setNewModal(false)}>
                <Ionicons name="close" size={26} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Driver Select */}
              <Text style={styles.fieldLabel}>Select Driver</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {drivers.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.driverChip, form.driver_id === d.id && styles.driverChipActive]}
                    onPress={() => set('driver_id', d.id)}
                  >
                    <Ionicons name="person" size={16} color={form.driver_id === d.id ? Colors.white : Colors.primary} />
                    <Text style={[styles.driverChipText, form.driver_id === d.id && { color: Colors.white }]}>
                      {d.name} – ₦{d.price_per_trip?.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Frequency */}
              <Text style={styles.fieldLabel}>Frequency</Text>
              <View style={styles.chipRow}>
                {FREQUENCY_OPTIONS.map(f => (
                  <TouchableOpacity
                    key={f.value}
                    style={[styles.chip, form.frequency === f.value && styles.chipActive]}
                    onPress={() => set('frequency', f.value)}
                  >
                    <Text style={[styles.chipText, form.frequency === f.value && { color: Colors.white }]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day of Week (for weekly/biweekly) */}
              {['weekly', 'biweekly'].includes(form.frequency) && (
                <>
                  <Text style={styles.fieldLabel}>Day of Week</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    {DAYS_OF_WEEK.map((d, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[styles.chip, form.day_of_week === i && styles.chipActive]}
                        onPress={() => set('day_of_week', i)}
                      >
                        <Text style={[styles.chipText, form.day_of_week === i && { color: Colors.white }]}>{d.slice(0, 3)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.fieldLabel}>Preferred Time (HH:MM)</Text>
              <View style={styles.textInput}>
                <Ionicons name="time-outline" size={18} color={Colors.gray[400]} />
                <Text style={{ flex: 1, color: Colors.text.primary, marginLeft: 8 }}>{form.preferred_time}</Text>
              </View>
              {/* Time quick picks */}
              <View style={styles.chipRow}>
                {['07:00','09:00','12:00','15:00','17:00'].map(t => (
                  <TouchableOpacity key={t} style={[styles.chip, form.preferred_time === t && styles.chipActive]} onPress={() => set('preferred_time', t)}>
                    <Text style={[styles.chipText, form.preferred_time === t && { color: Colors.white }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color={Colors.white} /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                    <Text style={styles.createBtnText}>Create Subscription</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const Detail = ({ icon, label, value }) => (
  <View style={styles.detailItem}>
    <Ionicons name={icon} size={13} color={Colors.gray[400]} />
    <Text style={styles.detailLabel}>{label}: </Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: Colors.primary
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center'
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 16,
    marginBottom: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  driverName: { fontSize: 16, fontWeight: '700', color: Colors.text.primary },
  freq: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  details: { gap: 6, marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 12, color: Colors.text.muted },
  detailValue: { fontSize: 12, fontWeight: '600', color: Colors.text.primary },
  actions: { flexDirection: 'row', gap: 10 },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.accent },
  pauseBtnText: { color: Colors.accent, fontSize: 13, fontWeight: '600' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.error },
  cancelBtnText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
  resumeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#DCFCE7', alignSelf: 'flex-start' },
  resumeBtnText: { color: Colors.success, fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  emptySubtitle: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.primary, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '500' },
  driverChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.white, marginRight: 8 },
  driverChipActive: { backgroundColor: Colors.primary },
  driverChipText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  textInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray[100], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, marginTop: 8, marginBottom: 20 },
  createBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
