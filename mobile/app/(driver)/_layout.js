import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

export default function DriverLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.gray[400],
      tabBarLabelStyle: styles.tabLabel,
    }}>
      <Tabs.Screen name="home" options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} size={24} color={focused ? Colors.primary : Colors.gray[400]} /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={focused ? Colors.primary : Colors.gray[400]} /> }} />
      <Tabs.Screen name="availability" options={{ title: 'Schedule', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'time' : 'time-outline'} size={24} color={focused ? Colors.primary : Colors.gray[400]} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'cash' : 'cash-outline'} size={24} color={focused ? Colors.primary : Colors.gray[400]} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={focused ? Colors.primary : Colors.gray[400]} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
    height: 80, paddingBottom: 16, paddingTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});
