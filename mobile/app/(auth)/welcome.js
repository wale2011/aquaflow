import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#0EA5E9', '#0369A1', '#1E3A5F']} style={styles.container}>
      {/* Background decorative circles */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <View style={styles.content}>
        {/* Logo area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="water" size={60} color={Colors.white} />
          </View>
          <Text style={styles.appName}>AquaFlow</Text>
          <Text style={styles.tagline}>Clean Water, Delivered to Your Door</Text>
          <Text style={styles.location}>🇳🇬 Lagos, Nigeria</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="checkmark-circle" text="Book trusted water tanker drivers" />
          <FeatureItem icon="calendar" text="Schedule recurring deliveries" />
          <FeatureItem icon="star" text="Read verified driver reviews" />
          <FeatureItem icon="notifications" text="Real-time delivery tracking" />
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const FeatureItem = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon} size={20} color={Colors.primaryLight} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  circle1: {
    position: 'absolute', top: -80, right: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  circle2: {
    position: 'absolute', bottom: 100, left: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  content: {
    flex: 1, paddingHorizontal: 32, justifyContent: 'center',
    paddingTop: 60, paddingBottom: 40
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)'
  },
  appName: {
    fontSize: 40, fontWeight: '800', color: Colors.white,
    letterSpacing: 1, marginBottom: 8
  },
  tagline: {
    fontSize: 16, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', marginBottom: 8
  },
  location: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  features: { marginBottom: 40 },
  featureItem: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 14, gap: 12
  },
  featureText: { fontSize: 15, color: 'rgba(255,255,255,0.9)', flex: 1 },
  buttons: { gap: 12 },
  primaryBtn: {
    backgroundColor: Colors.white, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
  },
  primaryBtnText: {
    color: Colors.primaryDark, fontSize: 17,
    fontWeight: '700', letterSpacing: 0.5
  },
  secondaryBtn: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16, paddingVertical: 18, alignItems: 'center'
  },
  secondaryBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
});
