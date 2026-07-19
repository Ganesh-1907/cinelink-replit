import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {GOOGLE_WEB_CLIENT_ID} from '../src/api/config';
import {authService} from '../src/services/AuthService';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Button, Input, Divider} from '../components/ui';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

type AuthMode = 'login' | 'signup';

export default function AuthScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {refreshUserData} = useApp();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const {idToken} = await GoogleSignin.getTokens();
      if (!idToken) {
        Alert.alert('Error', 'Could not get Google token. Try again.');
        return;
      }
      await authService.googleSignIn(idToken);
      await refreshUserData();
    } catch (e: any) {
      console.log('GOOGLE SIGN IN ERROR:', e);
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        // cancelled
      } else if (e.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Please wait', 'Sign in already in progress.');
      } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available.');
      } else {
        Alert.alert(
          'Google Sign In Failed',
          e?.message || 'Could not sign in with Google.',
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await authService.login(email.trim(), password.trim());
      await refreshUserData();
    } catch (e: any) {
      Alert.alert('Login Failed', e?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await authService.signup(email.trim(), password.trim(), name.trim());
      await refreshUserData();
    } catch (e: any) {
      Alert.alert('Signup Failed', e?.message || 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled">
        {/* ── LOGO ─────────────────────────────────────────── */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>🎬</Text>
          <Text style={styles.appName}>CineLink</Text>
          <Text style={styles.tagline}>India's Cinema Network</Text>
          <View style={styles.logoDivider} />
        </View>

        {/* ── GOOGLE SIGN IN ────────────────────────────────── */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleSignIn}
          disabled={googleLoading}>
          {googleLoading ? (
            <Button
              label="Continue with Google"
              onPress={handleGoogleSignIn}
              variant="secondary"
              size="lg"
              loading
              fullWidth
            />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── PHONE SIGN IN ─────────────────────────────────── */}
        <Button
          label="📱 Login with Phone Number"
          onPress={() => navigation.navigate('PhoneLogin')}
          variant="outline"
          size="lg"
          fullWidth
        />

        <View style={styles.dividerWrapper}>
          <Divider label="or" />
        </View>

        {/* ── MODE TABS ─────────────────────────────────────── */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[
              styles.modeTab,
              authMode === 'login' && styles.modeTabActive,
            ]}
            onPress={() => setAuthMode('login')}>
            <Text
              style={[
                styles.modeTabText,
                authMode === 'login' && styles.modeTabTextActive,
              ]}>
              Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeTab,
              authMode === 'signup' && styles.modeTabActive,
            ]}
            onPress={() => setAuthMode('signup')}>
            <Text
              style={[
                styles.modeTabText,
                authMode === 'signup' && styles.modeTabTextActive,
              ]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── FORM CARD ─────────────────────────────────────── */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {authMode === 'login' ? '👋 Welcome Back!' : '🚀 Create Account'}
          </Text>
          <Text style={styles.formSubtitle}>
            {authMode === 'login'
              ? 'Login to your CineLink account'
              : "Join India's cinema network"}
          </Text>

          {authMode === 'signup' && (
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
            />
          )}

          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={
              authMode === 'signup' ? 'Min 6 characters' : 'Your password'
            }
            secureTextEntry={!showPassword}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            }
          />

          <Button
            label={authMode === 'login' ? 'Login →' : 'Create Account →'}
            onPress={
              authMode === 'login' ? handleEmailLogin : handleEmailSignup
            }
            variant="primary"
            size="lg"
            loading={loading}
            fullWidth
          />

          {authMode === 'login' && (
            <TouchableOpacity
              onPress={() => {
                if (!email.trim()) {
                  Alert.alert(
                    'Enter Email',
                    'Please enter your email address first.',
                  );
                  return;
                }
                auth()
                  .sendPasswordResetEmail(email.trim())
                  .then(() =>
                    Alert.alert(
                      'Email Sent!',
                      'Check your inbox to reset your password.',
                    ),
                  )
                  .catch((e: any) => Alert.alert('Error', e.message));
              }}
              style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── FOOTER LEGAL ──────────────────────────────────── */}
        <Text style={styles.footerNote}>By continuing you agree to our</Text>
        <View style={styles.footerLinks}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.footerLink}>Terms & Conditions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flexGrow: 1, paddingHorizontal: Spacing.screenH},

  // ── Logo
  logoSection: {alignItems: 'center', paddingBottom: Spacing['3xl']},
  logo: {fontSize: 64, marginBottom: Spacing.md},
  appName: {
    color: Colors.primary,
    fontSize: 38,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  logoDivider: {
    width: 48,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xs,
    marginTop: Spacing.xl,
    opacity: 0.6,
  },

  // ── Google Button
  googleBtn: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  googleIcon: {color: '#4285F4', fontSize: 20, fontWeight: 'bold'},
  googleBtnText: {...Typography.btn, color: Colors.textPrimary, fontSize: 16},

  // ── Divider wrapper
  dividerWrapper: {marginVertical: Spacing.lg},

  // ── Mode Tabs
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  modeTabActive: {backgroundColor: Colors.primary},
  modeTabText: {...Typography.btn, color: Colors.textSecondary, fontSize: 15},
  modeTabTextActive: {
    ...Typography.btn,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },

  // ── Form Card
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  formTitle: {...Typography.h2, marginBottom: Spacing.sm},
  formSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },

  // ── Eye icon
  eyeIcon: {fontSize: 18},

  // ── Forgot
  forgotBtn: {alignItems: 'center', marginTop: Spacing.lg},
  forgotText: {...Typography.body, color: Colors.primaryLight},

  // ── Footer
  footerNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  footerLink: {
    ...Typography.caption,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  footerDot: {...Typography.caption, color: Colors.textTertiary},
});
