import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(form.email.trim().toLowerCase(), form.password);
      if (user.role === 'driver') {
        router.replace('/(driver)/home');
      } else {
        router.replace('/(client)/home');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#0EA5E9', '#0369A1']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.logoIcon}>
            <Ionicons name="water" size={40} color={Colors.white} />
          </View>
          <Text style={styles.headerTitle}>Welcome Back! 👋</Text>
          <Text style={styles.headerSubtitle}>Sign in to your AquaFlow account</Text>
        </LinearGradient>

        {/* Form */}
        <View style={styles.form}>
          <InputField
            label="Email Address"
            icon="mail-outline"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={(v) => { setForm(f => ({ ...f, email: v })); setErrors(e => ({ ...e, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <View>
            <InputField
              label="Password"
              icon="lock-closed-outline"
              placeholder="Your password"
              value={form.password}
              onChangeText={(v) => { setForm(f => ({ ...f, password: v })); setErrors(e => ({ ...e, password: '' })); }}
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.gray[400]} />
                </TouchableOpacity>
              }
            />
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const InputField = ({ label, icon, error, rightIcon, ...props }) => (
  <View style={styles.inputWrapper}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputRow, error && styles.inputError]}>
      <Ionicons name={icon} size={20} color={Colors.gray[400]} style={{ marginRight: 10 }} />
      <TextInput style={styles.input} placeholderTextColor={Colors.gray[400]} {...props} />
      {rightIcon}
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1 },
  header: {
    paddingTop: 60, paddingBottom: 40, paddingHorizontal: 24,
    alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30
  },
  backBtn: {
    position: 'absolute', top: 60, left: 24,
    padding: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  logoIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)' },
  form: { padding: 24, gap: 4 },
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
  errorText: { color: Colors.error, fontSize: 12, marginTop: 4, marginLeft: 4 },
  loginBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginTop: 8,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  loginBtnText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  registerText: { color: Colors.text.secondary, fontSize: 15 },
  registerLink: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});
