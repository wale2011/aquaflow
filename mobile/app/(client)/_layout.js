import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';

function TabIcon({ name, focused, label, badge }) {
  return (
    <View style={styles.tabIconContainer}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={24}
        color={focused ? Colors.primary : Colors.gray[400]}
      />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function ClientLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.gray[400],
      tabBarLabelStyle: styles.tabLabel,
    }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Find Drivers',
          tabBarIcon: ({ focused }) => <TabIcon name="car" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'My Bookings',
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: 'Plans',
          tabBarIcon: ({ focused }) => <TabIcon name="repeat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  tabIconContainer: { position: 'relative', alignItems: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: Colors.error, borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center'
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
});
