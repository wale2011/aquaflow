import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Switch, TextInput, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { driversAPI } from '../../services/api';
import Colors from '../../constants/colors';
import { LAGOS_LGAS } from '../../constants/config';

export default function DriverProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ price_per_trip: '', bio: '', service_areas: [], tanker_plate: '' });

  useEffect(() => {
    if (!user?.id) return;

    driversAPI.getOne(user.id)
      .then(res => {
        const d = res.data.driver;
        setProfile(d);
        setForm({
          price_per_trip: d.price_per_trip?.toString() || '',
          bio: d.bio || '',
          service_areas: d.service_areas || [],
          tanker_plate: d.tanker_plate || ''
        });
      })
      .catch(() => {});
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await driversAPI.updateProfile({
        price_per_trip: parseFloat(form.price_per_trip) || 3000,
        bio: form.bio,
        service_areas: form.service_areas,
        tanker_plate: form.tanker_plate
      });
      setEditing(false);
      Alert.alert('✅ Saved', 'Your driver profile has been updated');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleArea = (lga) => {
    setForm(f => ({
      ...f,
      service_areas: f.service_areas.includes(lga)
        ? f.service_areas.filter(a => a !== lga)
        : [...f.service_areas, lga]
    }));
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/welcome'); } }
    ]);
  };

  const avgRating = profile?.avg_rating || 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#0369A1', '#1E3A5F']} style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={50} color={Colors.white} />
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <View style={styles.starsRow}>
          {[1,2,3,4,5].map(s => (
            <Ionicons key={s} name={s <= Math.round(avgRating) ? 'star' : 'star-outline'} size={18} color={Colors.accent} />
          ))}
          <Text style={styles.ratingText}>{avgRating > 0 ? avgRating : 'No ratings'}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Ionicons name="car" size={12} color={Colors.primaryDark} />
          <Text style={styles.roleText}>Tanker Driver</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(!editing)}>
          <Ionicons name={editing ? 'close' : 'create-outline'} size={16} color={Colors.primary} />
          <Text style={styles.editBtnText}>{editing ? 'Cancel' : 'Edit Profile'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats */}
        {profile && (
          <View style={styles.statsRow}>
            <StatItem value={profile.total_deliveries} label="Deliveries" />
            <StatItem value={`₦${profile.price_per_trip?.toLocaleString()}`} label="Per Trip" />
            <StatItem value={`${(profile.tanker_capacity / 1000).toFixed(0)}k L`} label="Capacity" />
          </View>
        )}

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow icon="call-outline" label="Phone" value={user?.phone} />
          <InfoRow icon="location-outline" label="Base Area" value={user?.lga} />
        </View>

        {/* Editable Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Details</Text>

          {editing ? (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Price per Trip (₦)</Text>
                <View style={styles.fieldInput}>
                  <Ionicons name="cash-outline" size={18} color={Colors.gray[400]} />
                  <TextInput
                    style={styles.input}
                    value={form.price_per_trip}
                    onChangeText={v => setForm(f => ({ ...f, price_per_trip: v }))}
                    keyboardType="numeric"
                    placeholder="3000"
                    placeholderTextColor={Colors.gray[400]}
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Plate Number</Text>
                <View style={styles.fieldInput}>
                  <Ionicons name="car-outline" size={18} color={Colors.gray[400]} />
                  <TextInput
                    style={styles.input}
                    value={form.tanker_plate}
                    onChangeText={v => setForm(f => ({ ...f, tanker_plate: v }))}
                    placeholder="e.g. LND 234 ABC"
                    placeholderTextColor={Colors.gray[400]}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Bio</Text>
                <View style={[styles.fieldInput, { alignItems: 'flex-start' }]}>
                  <Ionicons name="information-circle-outline" size={18} color={Colors.gray[400]} style={{ marginTop: 2 }} />
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    value={form.bio}
                    onChangeText={v => setForm(f => ({ ...f, bio: v }))}
                    placeholder="Tell clients about your experience..."
                    placeholderTextColor={Colors.gray[400]}
                    multiline
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Service Areas (select all you cover)</Text>
              <View style={styles.lgaGrid}>
                {LAGOS_LGAS.map(lga => (
                  <TouchableOpacity
                    key={lga}
                    style={[styles.lgaChip, form.service_areas.includes(lga) && styles.lgaChipActive]}
                    onPress={() => toggleArea(lga)}
                  >
                    <Text style={[styles.lgaChipText, form.service_areas.includes(lga) && { color: Colors.white }]}>{lga}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} size="small" /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <InfoRow icon="cash-outline" label="Price Per Trip" value={`₦${profile?.price_per_trip?.toLocaleString() || '–'}`} />
              <InfoRow icon="car-outline" label="Plate Number" value={profile?.tanker_plate || '–'} />
              <InfoRow icon="water-outline" label="Tanker Type" value={profile?.tanker_type || 'Standard'} />
              <InfoRow icon="information-circle-outline" label="Bio" value={profile?.bio || '–'} />
              {profile?.service_areas?.length > 0 && (
                <View style={styles.areasSection}>
                  <Text style={styles.infoLabel}>Service Areas</Text>
                  <View style={styles.areaChips}>
                    {profile.service_areas.map((a, i) => (
                      <View key={i} style={styles.areaChip}>
                        <Text style={styles.areaChipText}>{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AquaFlow v1.0.0 · Lagos, Nigeria 🇳🇬</Text>
      </View>
    </ScrollView>
  );
}

const StatItem = ({ value, label }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={Colors.primary} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '–'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 70, paddingBottom: 30, alignItems: 'center', paddingHorizontal: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  name: { fontSize: 24, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 10 },
  ratingText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  roleText: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  editBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  content: { padding: 16 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16, justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  statLabel: { fontSize: 12, color: Colors.text.muted, marginTop: 2 },
  section: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 11, color: Colors.text.muted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: Colors.text.primary },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text.primary, marginBottom: 8 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.gray[100], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 14, color: Colors.text.primary },
  lgaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  lgaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  lgaChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  lgaChipText: { fontSize: 12, color: Colors.text.secondary, fontWeight: '500' },
  areasSection: { paddingVertical: 10 },
  areaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  areaChip: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  areaChipText: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 8 },
  saveBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: 16, borderWidth: 1.5, borderColor: Colors.error + '40', marginBottom: 16 },
  logoutText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, color: Colors.text.muted, marginBottom: 40 },
});
