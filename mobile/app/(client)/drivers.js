import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { driversAPI } from '../../services/api';
import Colors from '../../constants/colors';
import { LAGOS_LGAS } from '../../constants/config';

export default function DriversScreen() {
  const router = useRouter();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLGA, setSelectedLGA] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (lga = selectedLGA) => {
    try {
      const params = {};
      if (lga) params.lga = lga;
      const res = await driversAPI.list(params);
      setDrivers(res.data.drivers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLGA]);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const selectLGA = (lga) => {
    const newLGA = selectedLGA === lga ? '' : lga;
    setSelectedLGA(newLGA);
    setLoading(true);
    load(newLGA);
  };

  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.lga?.toLowerCase().includes(search.toLowerCase())
  );

  const renderDriver = ({ item }) => (
    <TouchableOpacity
      style={styles.driverCard}
      onPress={() => router.push(`/(client)/driver-profile?id=${item.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.driverAvatar}>
        <Ionicons name="person" size={28} color={Colors.white} />
      </View>
      <View style={styles.driverInfo}>
        <Text style={styles.driverName}>{item.name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={Colors.accent} />
          <Text style={styles.rating}>{item.avg_rating > 0 ? item.avg_rating : 'New'}</Text>
          {item.rating_count > 0 && <Text style={styles.ratingCount}>({item.rating_count} reviews)</Text>}
        </View>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Ionicons name="location-outline" size={12} color={Colors.primary} />
            <Text style={styles.tagText}>{item.lga}</Text>
          </View>
          <View style={styles.tag}>
            <Ionicons name="water-outline" size={12} color={Colors.secondary} />
            <Text style={styles.tagText}>{(item.tanker_capacity / 1000).toFixed(0)}k L</Text>
          </View>
          <View style={styles.tag}>
            <Ionicons name="checkmark-circle-outline" size={12} color={Colors.success} />
            <Text style={styles.tagText}>{item.total_deliveries} trips</Text>
          </View>
        </View>
      </View>
      <View style={styles.driverRight}>
        <Text style={styles.price}>₦{item.price_per_trip?.toLocaleString()}</Text>
        <Text style={styles.perTrip}>per trip</Text>
        <View style={[styles.availBadge, { backgroundColor: item.is_available ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.availText, { color: item.is_available ? Colors.success : Colors.error }]}>
            {item.is_available ? 'Available' : 'Busy'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Water Drivers</Text>
        <Text style={styles.headerSubtitle}>Lagos, Nigeria 🇳🇬</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={Colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or area..."
            placeholderTextColor={Colors.gray[400]}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray[400]} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* LGA Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lgaFilter}>
          <TouchableOpacity
            style={[styles.lgaChip, !selectedLGA && styles.lgaChipActive]}
            onPress={() => selectLGA('')}
          >
            <Text style={[styles.lgaChipText, !selectedLGA && styles.lgaChipTextActive]}>All LGAs</Text>
          </TouchableOpacity>
          {LAGOS_LGAS.map(lga => (
            <TouchableOpacity
              key={lga}
              style={[styles.lgaChip, selectedLGA === lga && styles.lgaChipActive]}
              onPress={() => selectLGA(lga)}
            >
              <Text style={[styles.lgaChipText, selectedLGA === lga && styles.lgaChipTextActive]}>{lga}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Finding drivers near you...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderDriver}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color={Colors.gray[300]} />
              <Text style={styles.emptyTitle}>No drivers found</Text>
              <Text style={styles.emptySubtitle}>Try a different LGA or check back later</Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.resultCount}>{filtered.length} driver{filtered.length !== 1 ? 's' : ''} available</Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: Colors.primary },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  searchContainer: { backgroundColor: Colors.white, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.gray[100], borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text.primary },
  lgaFilter: { flexDirection: 'row' },
  lgaChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, marginRight: 8
  },
  lgaChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  lgaChipText: { fontSize: 13, color: Colors.text.secondary, fontWeight: '500' },
  lgaChipTextActive: { color: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: Colors.text.secondary, fontSize: 14 },
  list: { padding: 16, gap: 0 },
  resultCount: { fontSize: 13, color: Colors.text.muted, marginBottom: 12 },
  driverCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: Colors.white, borderRadius: 18, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3
  },
  driverAvatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center'
  },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  rating: { fontSize: 13, fontWeight: '600', color: Colors.text.primary },
  ratingCount: { fontSize: 12, color: Colors.text.muted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.gray[100], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4
  },
  tagText: { fontSize: 11, color: Colors.text.secondary, fontWeight: '500' },
  driverRight: { alignItems: 'flex-end', gap: 4 },
  price: { fontSize: 17, fontWeight: '800', color: Colors.primaryDark },
  perTrip: { fontSize: 11, color: Colors.text.muted },
  availBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  availText: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text.primary },
  emptySubtitle: { fontSize: 14, color: Colors.text.secondary, textAlign: 'center' },
});
