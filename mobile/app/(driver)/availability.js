import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driversAPI } from '../../services/api';
import Colors from '../../constants/colors';
import { DAYS_OF_WEEK } from '../../constants/config';

const TIME_SLOTS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

const defaultSlots = DAYS_OF_WEEK.map((day, i) => ({
  day_of_week: i,
  day_name: day,
  enabled: i >= 1 && i <= 5, // Mon-Fri default
  start_time: '08:00',
  end_time: '17:00',
  max_bookings: 3
}));

export default function AvailabilityScreen() {
  const [slots, setSlots] = useState(defaultSlots);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    driversAPI.getMyAvailability()
      .then(res => {
        const existing = res.data.slots || [];
        if (existing.length > 0) {
          setSlots(prev => prev.map(slot => {
            const match = existing.find(e => e.day_of_week === slot.day_of_week);
            if (match) return { ...slot, enabled: true, start_time: match.start_time, end_time: match.end_time, max_bookings: match.max_bookings };
            return { ...slot, enabled: false };
          }));
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (dayIndex) => {
    setSlots(prev => prev.map(s => s.day_of_week === dayIndex ? { ...s, enabled: !s.enabled } : s));
  };

  const updateSlot = (dayIndex, field, value) => {
    setSlots(prev => prev.map(s => s.day_of_week === dayIndex ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    const activeSlots = slots.filter(s => s.enabled).map(({ day_of_week, start_time, end_time, max_bookings }) => ({
      day_of_week, start_time, end_time, max_bookings
    }));

    if (activeSlots.length === 0) {
      Alert.alert('No Days Selected', 'Please enable at least one day of availability');
      return;
    }

    setSaving(true);
    try {
      await driversAPI.setAvailability(activeSlots);
      Alert.alert('✅ Saved!', 'Your availability schedule has been updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
  );

  const enabledCount = slots.filter(s => s.enabled).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <Text style={styles.headerSubtitle}>{enabledCount} day{enabledCount !== 1 ? 's' : ''} active</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>Set the days and hours you're available for water deliveries. Clients can only book during these times.</Text>
        </View>

        {slots.map(slot => (
          <View key={slot.day_of_week} style={[styles.slotCard, !slot.enabled && styles.slotCardDisabled]}>
            <View style={styles.slotHeader}>
              <View>
                <Text style={[styles.dayName, !slot.enabled && styles.dayNameDisabled]}>{slot.day_name}</Text>
                {slot.enabled && <Text style={styles.slotSummary}>{slot.start_time} – {slot.end_time}</Text>}
              </View>
              <Switch
                value={slot.enabled}
                onValueChange={() => toggleDay(slot.day_of_week)}
                trackColor={{ false: Colors.gray[300], true: Colors.primaryLight }}
                thumbColor={slot.enabled ? Colors.primary : Colors.gray[400]}
              />
            </View>

            {slot.enabled && (
              <View style={styles.slotDetails}>
                {/* Start Time */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeLabel}>Start Time</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {TIME_SLOTS.map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeChip, slot.start_time === t && styles.timeChipActive]}
                        onPress={() => updateSlot(slot.day_of_week, 'start_time', t)}
                      >
                        <Text style={[styles.timeChipText, slot.start_time === t && styles.timeChipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* End Time */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeLabel}>End Time</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {TIME_SLOTS.filter(t => t > slot.start_time).map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.timeChip, slot.end_time === t && styles.timeChipActive]}
                        onPress={() => updateSlot(slot.day_of_week, 'end_time', t)}
                      >
                        <Text style={[styles.timeChipText, slot.end_time === t && styles.timeChipTextActive]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Max Bookings */}
                <View style={styles.maxRow}>
                  <Text style={styles.timeLabel}>Max bookings per day:</Text>
                  <View style={styles.maxControl}>
                    <TouchableOpacity
                      style={styles.maxBtn}
                      onPress={() => updateSlot(slot.day_of_week, 'max_bookings', Math.max(1, slot.max_bookings - 1))}
                    >
                      <Ionicons name="remove" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.maxValue}>{slot.max_bookings}</Text>
                    <TouchableOpacity
                      style={styles.maxBtn}
                      onPress={() => updateSlot(slot.day_of_week, 'max_bookings', Math.min(10, slot.max_bookings + 1))}
                    >
                      <Ionicons name="add" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color={Colors.white} /> : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.saveBtnText}>Save Schedule</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: Colors.primaryDark },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  list: { padding: 16 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.primaryLight
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.primaryDark, lineHeight: 20 },
  slotCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  slotCardDisabled: { opacity: 0.6 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { fontSize: 17, fontWeight: '700', color: Colors.text.primary },
  dayNameDisabled: { color: Colors.text.muted },
  slotSummary: { fontSize: 13, color: Colors.primary, marginTop: 2 },
  slotDetails: { marginTop: 14, gap: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 14 },
  timeSection: {},
  timeLabel: { fontSize: 12, fontWeight: '600', color: Colors.text.secondary, marginBottom: 8 },
  timeChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, marginRight: 6, backgroundColor: Colors.white
  },
  timeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeChipText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '500' },
  timeChipTextActive: { color: Colors.white },
  maxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  maxControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  maxBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center'
  },
  maxValue: { fontSize: 18, fontWeight: '700', color: Colors.text.primary, minWidth: 24, textAlign: 'center' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, marginTop: 8
  },
  saveBtnText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
});
