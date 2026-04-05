import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';
import { LAGOS_LGAS } from '../../constants/config';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(1); // 2-step registration
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    role: 'client', address: '', lga: '',
    // Driver-specific
    tanker_capacity: '10000', price_per_trip: '3000',
    service_areas: [], bio: ''
  });

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.name.trim() || form.name.length < 2) errs.name = 'Full name required (min 2 chars)';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
    if (!form.phone.match(/^(\+234|0)[789]\d{9}$/)) errs.phone = 'Valid Nigerian phone number required (e.g. 08012345678)';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!form.address.trim()) errs.address = 'Address is required';
    if (!form.lga) errs.lga = 'Select your LGA';
    if (form.role === 'driver') {
      if (!form.price_per_trip || parseFloat(form.price_per_trip) < 500) errs.price_per_trip = 'Minimum price ₦500';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
        address: form.address.trim(),
        lga: form.lga,
      };
      if (form.role === 'driver') {
        payload.tanker_capacity = parseInt(form.tanker_capacity) || 10000;
        payload.price_per_trip = parseFloat(form.price_per_trip) || 3000;
        payload.service_areas = form.service_areas;
        payload.bio = form.bio;
      }

      const user = await register(payload);
      if (user.role === 'driver') {
        router.replace('/(driver)/home');
      } else {
        router.replace('/(client)/home');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#0EA5E9', '#0369A1']} style={styles.header}>
          <TouchableOpacity onPress={step === 1 ? () => router.back() : () => setStep(1)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.logoIcon}>
            <Ionicons name="water" size={36} color={Colors.white} />
          </View>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Step {step} of 2</Text>
          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
          </View>
        </LinearGradient>

        <View style={styles.form}>
          {step === 1 && (
            <>
              {/* Role Toggle */}
              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>I am a:</Text>
                <View style={styles.roleToggle}>
                  <TouchableOpacity
                    style={[styles.roleBtn, form.role === 'client' && styles.roleBtnActive]}
                    onPress={() => set('role', 'client')}
                  >
                    <Ionicons name="person" size={18} color={form.role === 'client' ? Colors.white : Colors.primary} />
                    <Text style={[styles.roleBtnText, form.role === 'client' && styles.roleBtnTextActive]}>Water Customer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleBtn, form.role === 'driver' && styles.roleBtnActive]}
                    onPress={() => set('role', 'driver')}
                  >
                    <Ionicons name="car" size={18} color={form.role === 'driver' ? Colors.white : Colors.primary} />
                    <Text style={[styles.roleBtnText, form.role === 'driver' && styles.roleBtnTextActive]}>Tanker Driver</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Field label="Full Name" icon="person-outline" placeholder="Your full name"
                value={form.name} onChangeText={v => set('name', v)} error={errors.name} />
              <Field label="Email Address" icon="mail-outline" placeholder="email@example.com"
                value={form.email} onChangeText={v => set('email', v)}
                keyboardType="email-address" autoCapitalize="none" error={errors.email} />
              <Field label="Phone Number" icon="call-outline" placeholder="08012345678"
                value={form.phone} onChangeText={v => set('phone', v)}
                keyboardType="phone-pad" error={errors.phone} />
              <Field label="Password" icon="lock-closed-outline" placeholder="At least 6 characters"
                value={form.password} onChangeText={v => set('password', v)}
                secureTextEntry={!showPassword} error={errors.password}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.gray[400]} />
                  </TouchableOpacity>
                }
              />

              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.white} />
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Home/Business Address" icon="location-outline"
                placeholder="e.g. 12 Adeola Crescent, Lekki"
                value={form.address} onChangeText={v => set('address', v)} error={errors.address} />

              {/* LGA Picker */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Local Government Area (LGA)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lgaScroll}>
                  {LAGOS_LGAS.map(lga => (
                    <TouchableOpacity
                      key={lga}
                      style={[styles.lgaChip, form.lga === lga && styles.lgaChipActive]}
                      onPress={() => set('lga', lga)}
                    >
                      <Text style={[styles.lgaChipText, form.lga === lga && styles.lgaChipTextActive]}>{lga}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.lga ? <Text style={styles.errorText}>{errors.lga}</Text> : null}
              </View>

              {form.role === 'driver' && (
                <>
                  <Text style={styles.sectionTitle}>🚛 Driver Details</Text>
                  <Field label="Price per Trip (₦)" icon="cash-outline"
                    placeholder="e.g. 3000" value={form.price_per_trip}
                    onChangeText={v => set('price_per_trip', v)}
                    keyboardType="numeric" error={errors.price_per_trip} />
                  <Field label="Tanker Capacity (Litres)" icon="water-outline"
                    placeholder="e.g. 10000" value={form.tanker_capacity}
                    onChangeText={v => set('tanker_capacity', v)} keyboardType="numeric" />
                  <Field label="About You (Bio)" icon="information-circle-outline"
                    placeholder="Tell clients about your experience..."
                    value={form.bio} onChangeText={v => set('bio', v)}
                    multiline numberOfLines={3} />
                </>
              )}

              <TouchableOpacity style={styles.nextBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={Colors.white} /> : (
                  <>
                    <Text style={styles.nextBtnText}>Create Account</Text>
                    <Ionicons name="checkmark" size={20} color={Colors.white} />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Field = ({ label, icon, error, rightIcon, ...props }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputRow, error && styles.inputError]}>
      <Ionicons name={icon} size={20} color={Colors.gray[400]} style={{ marginRight: 10 }} />
      <TextInput style={[styles.input, props.multiline && { height: 80, textAlignVertical: 'top' }]}
        placeholderTextColor={Colors.gray[400]} {...props} />
      {rightIcon}
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 60, paddingBottom: 30, paddingHorizontal: 24,
    alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30
  },
  backBtn: {
    position: 'absolute', top: 60, left: 24, padding: 8,
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)'
  },
  logoIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  progressBar: { width: '60%', height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: Colors.white, borderRadius: 2 },
  form: { padding: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.primaryDark, marginVertical: 12 },
  roleContainer: { marginBottom: 20 },
  roleLabel: { fontSize: 15, fontWeight: '600', color: Colors.text.primary, marginBottom: 10 },
  roleToggle: { flexDirection: 'row', gap: 12 },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.white
  },
  roleBtnActive: { backgroundColor: Colors.primary },
  roleBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  roleBtnTextActive: { color: Colors.white },
  inputWrapper: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text.primary, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  inputError: { borderColor: Colors.error },
  input: { flex: 1, fontSize: 15, color: Colors.text.primary },
  errorText: { color: Colors.error, fontSize: 12, marginTop: 4 },
  lgaScroll: { marginTop: 4 },
  lgaChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.primary,
    backgroundColor: Colors.white, marginRight: 8
  },
  lgaChipActive: { backgroundColor: Colors.primary },
  lgaChipText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  lgaChipTextActive: { color: Colors.white },
  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginTop: 8, flexDirection: 'row',
    justifyContent: 'center', gap: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  nextBtnText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 40 },
  loginText: { color: Colors.text.secondary, fontSize: 15 },
  loginLink: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});
