import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';

export default function ClientProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/welcome'); } }
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['#0EA5E9', '#0369A1']} style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={50} color={Colors.white} />
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.location}>{user?.lga}, Lagos</Text>
        </View>
        <View style={styles.roleBadge}>
          <Ionicons name="person" size={12} color={Colors.primary} />
          <Text style={styles.roleText}>Water Customer</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <InfoRow icon="mail-outline" label="Email" value={user?.email} />
          <InfoRow icon="call-outline" label="Phone" value={user?.phone} />
          <InfoRow icon="location-outline" label="Address" value={user?.address} />
          <InfoRow icon="map-outline" label="LGA" value={user?.lga} />
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
              <Text style={styles.settingLabel}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.gray[300], true: Colors.primaryLight }}
              thumbColor={notificationsEnabled ? Colors.primary : Colors.gray[400]}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem icon="create-outline" label="Edit Profile" onPress={() => router.push('/(client)/edit-profile')} />
          <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => router.push('/(client)/change-password')} />
          <MenuItem icon="help-circle-outline" label="Help & Support" onPress={() => Alert.alert('Support', 'Contact: support@aquaflow.ng\nPhone: 0800-AQUAFLOW')} />
          <MenuItem icon="information-circle-outline" label="About AquaFlow" onPress={() => Alert.alert('AquaFlow v1.0', 'Water Tanker Delivery App\nLagos, Nigeria\n\n© 2024 AquaFlow')} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AquaFlow v1.0.0 · Lagos, Nigeria 🇳🇬</Text>
      </View>
    </ScrollView>
  );
}

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={Colors.primary} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '–'}</Text>
    </View>
  </View>
);

const MenuItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon} size={20} color={Colors.primary} />
    <Text style={styles.menuLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={Colors.gray[400]} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 70, paddingBottom: 30, alignItems: 'center', paddingHorizontal: 20 },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)'
  },
  name: { fontSize: 24, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  location: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20
  },
  roleText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  content: { padding: 20 },
  section: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 16,
    marginBottom: 16, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 11, color: Colors.text.muted, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: Colors.text.primary },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 15, color: Colors.text.primary, fontWeight: '500' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text.primary, fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 16, paddingVertical: 16,
    borderWidth: 1.5, borderColor: Colors.error + '40', marginBottom: 20
  },
  logoutText: { color: Colors.error, fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, color: Colors.text.muted, marginBottom: 40 },
});
