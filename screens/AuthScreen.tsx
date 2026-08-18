import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {Path, Circle, Rect, Polyline, Line} from 'react-native-svg';
import {GOOGLE_WEB_CLIENT_ID} from '../src/api/config';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import api from '../src/api/client';
import {authService} from '../src/services/AuthService';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing} from '../src/theme';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

type AuthMode = 'options' | 'login' | 'signup' | 'forgot';

const cinemaSeatsImg = require('../assets/auth/cinema_seats.jpg');
const cinemaSeatsImgLight = require('../assets/auth/cinema_seats_light.jpg');

// ─── SVG VECTOR ICONS ────────────────────────────────────────────────────────
const UserIcon = ({color}: {color: string}) => (
  <Svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

const MailIcon = ({color}: {color: string}) => (
  <Svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Polyline points="22,6 12,13 2,6" />
  </Svg>
);

const LockIcon = ({color}: {color: string}) => (
  <Svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

const PhoneIcon = ({color}: {color: string}) => (
  <Svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);

const EyeIcon = ({color}: {color: string}) => (
  <Svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

const EyeOffIcon = ({color}: {color: string}) => (
  <Svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <Line x1="1" y1="1" x2="23" y2="23" />
  </Svg>
);

// ─── COMPACT INPUT COMPONENT ────────────────────────────────────────────────
const AuthInput = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  leftIcon,
  rightIcon,
}: any) => {
  return (
    <View style={styles.inputContainer}>
      {leftIcon && <View style={styles.inputLeftIcon}>{leftIcon}</View>}
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {rightIcon && <View style={styles.inputRightIcon}>{rightIcon}</View>}
    </View>
  );
};

export default function AuthScreen({navigation, route}: any) {
  const insets = useSafeAreaInsets();
  const {isDark} = useTheme();
  const [authMode, setAuthMode] = useState<AuthMode>('options');

  useEffect(() => {
    if (route?.params?.mode) {
      setAuthMode(route.params.mode);
      navigation.setParams({mode: undefined});
    }
  }, [route?.params?.mode, navigation]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<'initial' | 'otp' | 'password'>(
    'initial',
  );
  const [signupOtp, setSignupOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState<'initial' | 'otp' | 'password'>(
    'initial',
  );
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    if (authMode !== 'forgot') {
      setForgotStep('initial');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setShowForgotPassword(false);
    }
  }, [authMode]);

  const {refreshUserData} = useApp();

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
      await GoogleSignin.signOut().catch(() => {});
      await GoogleSignin.signIn();
      const {idToken} = await GoogleSignin.getTokens();
      if (!idToken) {
        Alert.alert('Error', 'Could not get Google token. Try again.');
        setGoogleLoading(false);
        return;
      }
      const googleRes = await authService.googleSignIn(idToken);
      if (googleRes.isNewUser) {
        await AsyncStorage.setItem('first_time_flow', 'true');
        await AsyncStorage.setItem('profile_fill_done', 'false');
        await AsyncStorage.setItem('suggested_follows_done', 'false');
      } else {
        await AsyncStorage.setItem('first_time_flow', 'false');
        await AsyncStorage.setItem('profile_fill_done', 'true');
        await AsyncStorage.setItem('suggested_follows_done', 'true');
      }
      await refreshUserData();
    } catch (e: any) {
      await GoogleSignin.signOut().catch(() => {});
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
          'Could not sign in with Google. Please try again.',
        );
      }
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
      const loginRes = await authService.login(email.trim(), password.trim());
      if (loginRes.isNewUser) {
        await AsyncStorage.setItem('first_time_flow', 'true');
        await AsyncStorage.setItem('profile_fill_done', 'false');
        await AsyncStorage.setItem('suggested_follows_done', 'false');
      } else {
        await AsyncStorage.setItem('first_time_flow', 'false');
        await AsyncStorage.setItem('profile_fill_done', 'true');
        await AsyncStorage.setItem('suggested_follows_done', 'true');
      }
      await refreshUserData();
    } catch (e: any) {
      Alert.alert('Login Failed', 'Invalid email or password.');
      setLoading(false);
    }
  };

  const handleSendSignupOtp = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert(
        'Missing Fields',
        'Please enter your Full Name and Email Address.',
      );
      return;
    }
    if (!agreed) {
      Alert.alert(
        'Terms & Conditions',
        'Please agree to the Terms & Conditions and Privacy Policy to continue.',
      );
      return;
    }
    setOtpLoading(true);
    try {
      await api.post('/auth/send-signup-otp', {email: email.trim()});
      Alert.alert(
        'Verification Sent',
        'An OTP verification code has been sent to your email.',
      );
      setSignupStep('otp');
    } catch (e: any) {
      Alert.alert(
        'Verification Failed',
        e.response?.data?.error ||
          e.message ||
          'Could not send verification code.',
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifySignupOtp = async () => {
    if (!signupOtp.trim()) {
      Alert.alert('Missing OTP', 'Please enter the verification code.');
      return;
    }
    setOtpLoading(true);
    try {
      await api.post('/auth/verify-signup-otp', {
        email: email.trim(),
        otp: signupOtp.trim(),
      });
      Alert.alert('Verified', 'Your email has been verified successfully!');
      setSignupStep('password');
    } catch (e: any) {
      Alert.alert(
        'Verification Failed',
        e.response?.data?.error || e.message || 'Invalid or expired OTP.',
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!password.trim()) {
      Alert.alert('Missing Field', 'Please enter a password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await authService.signup(email.trim(), password.trim(), name.trim());
      await AsyncStorage.setItem('first_time_flow', 'true');
      await AsyncStorage.setItem('profile_fill_done', 'false');
      await AsyncStorage.setItem('suggested_follows_done', 'false');
      await refreshUserData();
    } catch (e: any) {
      Alert.alert(
        'Signup Failed',
        e.response?.data?.error ||
          e.message ||
          'Could not create account. Please try again.',
      );
      setLoading(false);
    }
  };

  const handleSendResetOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Please enter your email first.');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/auth/send-reset-otp', {
        email: email.trim().toLowerCase(),
      });
      Alert.alert('OTP Sent!', 'OTP sent to your registered email');
      setForgotStep('otp');
    } catch (e: any) {
      Alert.alert(
        'Error',
        e.response?.data?.error ||
          e.message ||
          'Could not send verification code.',
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyResetOtp = async () => {
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      Alert.alert('Enter Code', 'Please enter the 6-digit verification code.');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/auth/validate-reset-otp', {
        email: email.trim().toLowerCase(),
        otp: forgotOtp.trim(),
      });
      setForgotStep('password');
    } catch (e: any) {
      Alert.alert(
        'Verification Failed',
        e.response?.data?.error || e.message || 'Invalid or expired OTP.',
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!forgotNewPassword.trim() || forgotNewPassword.trim().length < 6) {
      Alert.alert(
        'Invalid Password',
        'Password must be at least 6 characters.',
      );
      return;
    }
    if (forgotNewPassword.trim() !== forgotConfirmPassword.trim()) {
      Alert.alert('Mismatch', 'Passwords do not match. Please verify.');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/auth/verify-reset-otp', {
        email: email.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword.trim(),
      });
      Alert.alert('Success', 'Password updated successfully! Please sign in.');
      setAuthMode('login');
    } catch (e: any) {
      Alert.alert(
        'Error',
        e.response?.data?.error || e.message || 'Could not reset password.',
      );
    } finally {
      setResetLoading(false);
    }
  };

  const bgImage = isDark ? cinemaSeatsImg : cinemaSeatsImgLight;

  const renderHeader = () => {
    if (authMode === 'options') {
      return null;
    }
    return (
      <View style={[styles.topHeader, {top: insets.top || 16}]}>
        <TouchableOpacity
          onPress={() => {
            if (authMode === 'signup') {
              if (signupStep === 'password') {
                setSignupStep('otp');
              } else if (signupStep === 'otp') {
                setSignupStep('initial');
              } else {
                setAuthMode('options');
              }
            } else if (authMode === 'forgot') {
              if (forgotStep === 'password') {
                setForgotStep('otp');
              } else if (forgotStep === 'otp') {
                setForgotStep('initial');
              } else {
                setAuthMode('login');
              }
            } else {
              setAuthMode('options');
            }
          }}
          style={styles.backArrowButton}
          activeOpacity={0.8}>
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ── BACKGROUND ILLUSTRATION (Fixed at bottom) ── */}
      <View style={styles.bgImageContainer} pointerEvents="none">
        <Image
          source={bgImage}
          style={[
            styles.bgImage,
            isDark ? styles.bgImageDark : styles.bgImageLight,
          ]}
          resizeMode="cover"
        />
        {/* simulated gradient fade-out at the top of the image container to blend into app background */}
        <View style={[styles.fadeBarBase, styles.fadeBar1]} />
        <View style={[styles.fadeBarBase, styles.fadeBar2]} />
        <View style={[styles.fadeBarBase, styles.fadeBar3]} />
        <View style={[styles.fadeBarBase, styles.fadeBar4]} />
      </View>

      {renderHeader()}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop:
              insets.top +
              (authMode === 'forgot' ? 220 : authMode === 'signup' ? 120 : 70),
            paddingBottom: insets.bottom + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* ── OPTIONS MODE (Screen 3) ── */}
        {authMode === 'options' && (
          <View style={styles.optionsContent}>
            <View style={styles.logoSection}>
              <Text style={styles.appName}>CineLink</Text>
              <Text style={styles.tagline}>Connect. Create. Cast.</Text>
            </View>

            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Welcome back!</Text>
              <Text style={styles.subtitle}>Choose a login method</Text>
            </View>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.largeOptionBtn}
                onPress={handleGoogleSignIn}
                activeOpacity={0.85}>
                <View style={styles.largeOptionIconWrapper}>
                  <Svg width="20" height="20" viewBox="0 0 24 24">
                    <Path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <Path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <Path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.63-1.09-1.39-1.39-2.21l3.2-2.48z"
                      fill="#FBBC05"
                    />
                    <Path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </Svg>
                </View>
                <View style={styles.largeOptionTextWrapper}>
                  <Text style={styles.largeOptionTitle}>
                    Continue with Google
                  </Text>
                  <Text style={styles.largeOptionSubtitle}>
                    Quick and secure
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.optionsDividerWrapper}>
                <View style={styles.optionsDividerLine} />
                <Text style={styles.optionsDividerText}>or</Text>
                <View style={styles.optionsDividerLine} />
              </View>

              <TouchableOpacity
                style={styles.largeOptionBtn}
                onPress={() => navigation.navigate('PhoneLogin')}
                activeOpacity={0.85}>
                <View style={styles.largeOptionIconWrapper}>
                  <PhoneIcon color={Colors.primary} />
                </View>
                <View style={styles.largeOptionTextWrapper}>
                  <Text style={styles.largeOptionTitle}>
                    Continue with Mobile
                  </Text>
                  <Text style={styles.largeOptionSubtitle}>
                    Login using OTP
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.largeOptionBtn}
                onPress={() => setAuthMode('login')}
                activeOpacity={0.85}>
                <View style={styles.largeOptionIconWrapper}>
                  <MailIcon color={Colors.primary} />
                </View>
                <View style={styles.largeOptionTextWrapper}>
                  <Text style={styles.largeOptionTitle}>
                    Continue with Email
                  </Text>
                  <Text style={styles.largeOptionSubtitle}>
                    Login with email & password
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.bottomLinkRow}
              onPress={() => setAuthMode('signup')}>
              <Text
                style={[
                  styles.bottomLinkText,
                  isDark
                    ? styles.bottomLinkTextDark
                    : styles.bottomLinkTextLight,
                ]}>
                New to CineLink?{' '}
                <Text style={styles.bottomLinkHighlight}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SIGN IN MODE (Screen 1) ── */}
        {authMode === 'login' && (
          <View style={styles.formContent}>
            <View style={styles.logoSection}>
              <Text style={styles.appName}>CineLink</Text>
              <Text style={styles.tagline}>Connect. Create. Cast.</Text>
            </View>

            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Welcome back!</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            <View style={styles.formFields}>
              <AuthInput
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                leftIcon={<MailIcon color={Colors.textTertiary} />}
              />

              <View style={styles.passwordFieldContainer}>
                <AuthInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  leftIcon={<LockIcon color={Colors.textTertiary} />}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}>
                      {showPassword ? (
                        <EyeOffIcon color={Colors.textTertiary} />
                      ) : (
                        <EyeIcon color={Colors.textTertiary} />
                      )}
                    </TouchableOpacity>
                  }
                />
                <TouchableOpacity
                  onPress={() => setAuthMode('forgot')}
                  style={styles.forgotBtnInline}
                  activeOpacity={0.8}>
                  <Text style={styles.forgotBtnTextInline}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleEmailLogin}
                disabled={loading}
                activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.submitBtnText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.optionsDividerWrapper}>
                <View style={styles.optionsDividerLine} />
                <Text style={styles.optionsDividerText}>or continue with</Text>
                <View style={styles.optionsDividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.85}>
                {googleLoading ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <View style={styles.googleBtnContent}>
                    <Svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      style={styles.googleBtnIcon}>
                      <Path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <Path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <Path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.63-1.09-1.39-1.39-2.21l3.2-2.48z"
                        fill="#FBBC05"
                      />
                      <Path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </Svg>
                    <Text style={styles.googleBtnText}>
                      Continue with Google
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.bottomLinkRow}
              onPress={() => setAuthMode('signup')}>
              <Text
                style={[
                  styles.bottomLinkText,
                  isDark
                    ? styles.bottomLinkTextDark
                    : styles.bottomLinkTextLight,
                ]}>
                Don't have an account?{' '}
                <Text style={styles.bottomLinkHighlight}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SIGN UP MODE (Screen 2) ── */}
        {authMode === 'signup' && (
          <View style={styles.formContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                {signupStep === 'initial' &&
                  'Join CineLink and explore opportunities'}
                {signupStep === 'otp' &&
                  'Enter the verification code sent to your email'}
                {signupStep === 'password' &&
                  'Choose a strong password to secure your account'}
              </Text>
            </View>

            <View style={styles.formFields}>
              {signupStep === 'initial' && (
                <>
                  <AuthInput
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                    leftIcon={<UserIcon color={Colors.textTertiary} />}
                  />

                  <AuthInput
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    leftIcon={<MailIcon color={Colors.textTertiary} />}
                  />

                  {/* CHECKBOX */}
                  <TouchableOpacity
                    style={styles.checkboxWrapper}
                    onPress={() => setAgreed(!agreed)}
                    activeOpacity={0.8}>
                    <View
                      style={[
                        styles.checkbox,
                        agreed && styles.checkboxChecked,
                      ]}>
                      {agreed && (
                        <Svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={Colors.textInverse}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round">
                          <Polyline points="20,6 9,17 4,12" />
                        </Svg>
                      )}
                    </View>
                    <Text style={styles.checkboxText}>
                      I agree to the{' '}
                      <Text
                        style={styles.checkboxHighlight}
                        onPress={() => navigation.navigate('Terms')}>
                        Terms & Conditions
                      </Text>{' '}
                      and{' '}
                      <Text
                        style={styles.checkboxHighlight}
                        onPress={() => navigation.navigate('PrivacyPolicy')}>
                        Privacy Policy
                      </Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSendSignupOtp}
                    disabled={otpLoading}
                    activeOpacity={0.85}>
                    {otpLoading ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        Send Verification Code
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {signupStep === 'otp' && (
                <>
                  <AuthInput
                    placeholder="Verification Code"
                    value={signupOtp}
                    onChangeText={setSignupOtp}
                    keyboardType="number-pad"
                    leftIcon={<LockIcon color={Colors.textTertiary} />}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleVerifySignupOtp}
                    disabled={otpLoading}
                    activeOpacity={0.85}>
                    {otpLoading ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <Text style={styles.submitBtnText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {signupStep === 'password' && (
                <>
                  <AuthInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    leftIcon={<LockIcon color={Colors.textTertiary} />}
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}>
                        {showPassword ? (
                          <EyeOffIcon color={Colors.textTertiary} />
                        ) : (
                          <EyeIcon color={Colors.textTertiary} />
                        )}
                      </TouchableOpacity>
                    }
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleEmailSignup}
                    disabled={loading}
                    activeOpacity={0.85}>
                    {loading ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <Text style={styles.submitBtnText}>Sign Up</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {signupStep === 'initial' && (
                <>
                  <View style={styles.optionsDividerWrapper}>
                    <View style={styles.optionsDividerLine} />
                    <Text style={styles.optionsDividerText}>
                      or continue with
                    </Text>
                    <View style={styles.optionsDividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.googleBtn}
                    onPress={handleGoogleSignIn}
                    disabled={googleLoading}
                    activeOpacity={0.85}>
                    {googleLoading ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <View style={styles.googleBtnContent}>
                        <Svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          style={styles.googleBtnIcon}>
                          <Path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <Path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <Path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.63-1.09-1.39-1.39-2.21l3.2-2.48z"
                            fill="#FBBC05"
                          />
                          <Path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            fill="#EA4335"
                          />
                        </Svg>
                        <Text style={styles.googleBtnText}>
                          Continue with Google
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.bottomLinkRow}
              onPress={() => setAuthMode('login')}>
              <Text
                style={[
                  styles.bottomLinkText,
                  isDark
                    ? styles.bottomLinkTextDark
                    : styles.bottomLinkTextLight,
                ]}>
                Already have an account?{' '}
                <Text style={styles.bottomLinkHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FORGOT PASSWORD MODE (Screen 5) ── */}
        {authMode === 'forgot' && (
          <View style={styles.formContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                {forgotStep === 'initial' &&
                  'Enter your email to verify your identity'}
                {forgotStep === 'otp' &&
                  'Enter the verification code sent to your email'}
                {forgotStep === 'password' &&
                  'Choose a strong password to secure your account'}
              </Text>
            </View>

            <View style={styles.formFields}>
              {forgotStep === 'initial' && (
                <>
                  <AuthInput
                    placeholder="Email Address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    leftIcon={<MailIcon color={Colors.textTertiary} />}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSendResetOtp}
                    disabled={resetLoading}
                    activeOpacity={0.85}>
                    {resetLoading ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        Send Verification Code
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {forgotStep === 'otp' && (
                <>
                  <AuthInput
                    placeholder="6-Digit Verification Code"
                    value={forgotOtp}
                    onChangeText={setForgotOtp}
                    keyboardType="numeric"
                    maxLength={6}
                    leftIcon={<LockIcon color={Colors.textTertiary} />}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleVerifyResetOtp}
                    disabled={resetLoading}
                    activeOpacity={0.85}>
                    {resetLoading ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <Text style={styles.submitBtnText}>Verify Code</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {forgotStep === 'password' && (
                <>
                  <View style={styles.passwordFieldContainer}>
                    <AuthInput
                      placeholder="New Password"
                      value={forgotNewPassword}
                      onChangeText={setForgotNewPassword}
                      secureTextEntry={!showForgotPassword}
                      leftIcon={<LockIcon color={Colors.textTertiary} />}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() =>
                            setShowForgotPassword(!showForgotPassword)
                          }
                          style={styles.eyeBtn}
                          activeOpacity={0.7}>
                          {showForgotPassword ? (
                            <EyeOffIcon color={Colors.textTertiary} />
                          ) : (
                            <EyeIcon color={Colors.textTertiary} />
                          )}
                        </TouchableOpacity>
                      }
                    />
                  </View>

                  <View
                    style={[styles.passwordFieldContainer, styles.marginField]}>
                    <AuthInput
                      placeholder="Confirm New Password"
                      value={forgotConfirmPassword}
                      onChangeText={setForgotConfirmPassword}
                      secureTextEntry={!showForgotPassword}
                      leftIcon={<LockIcon color={Colors.textTertiary} />}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleUpdatePassword}
                    disabled={resetLoading}
                    activeOpacity={0.85}>
                    {resetLoading ? (
                      <ActivityIndicator size="small" color={Colors.textInverse} />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        Update Password & Sign In
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.bottomLinkRow}
              onPress={() => setAuthMode('login')}>
              <Text
                style={[
                  styles.bottomLinkText,
                  isDark
                    ? styles.bottomLinkTextDark
                    : styles.bottomLinkTextLight,
                ]}>
                Remember your password?{' '}
                <Text style={styles.bottomLinkHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {(loading || googleLoading || resetLoading || otpLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Please wait...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  marginField: {
    marginTop: 12,
  },
  bgImageDark: {
    opacity: 0.75,
  },
  bgImageLight: {
    opacity: 0.85,
  },
  fadeBarBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: Colors.background,
  },
  fadeBar1: {
    top: 0,
  },
  fadeBar2: {
    top: 15,
    opacity: 0.75,
  },
  fadeBar3: {
    top: 30,
    opacity: 0.5,
  },
  fadeBar4: {
    top: 45,
    opacity: 0.25,
  },
  bottomLinkTextDark: {
    color: '#FAFAFA',
  },
  bottomLinkTextLight: {
    color: '#18181B',
  },
  topHeader: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  backArrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrowText: {
    fontSize: 26,
    color: Colors.textPrimary,
    fontWeight: '300',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
  },
  bgImageContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '56%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: -1,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },

  // ─── LOGO SECTION
  logoSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  appLogoEmblem: {
    width: 84,
    height: 84,
    marginBottom: 8,
  },
  appName: {
    color: Colors.primary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ─── WELCOME TEXT
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  infoBox: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
    width: '100%',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  // ─── OPTIONS SCREEN CHANNELS
  optionsContent: {
    justifyContent: 'flex-start',
    paddingVertical: 12,
  },
  buttonsContainer: {
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  largeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 64,
  },
  largeOptionIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  largeOptionTextWrapper: {
    flex: 1,
  },
  largeOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  largeOptionSubtitle: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },

  // ─── DIVIDERS
  optionsDividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  optionsDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  optionsDividerText: {
    fontSize: 12,
    color: Colors.textTertiary,
    paddingHorizontal: 12,
  },

  // ─── FORM & SUBMITS
  formContent: {
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  formFields: {
    gap: 8,
    width: '100%',
  },
  passwordFieldContainer: {
    position: 'relative',
    width: '100%',
  },
  forgotBtnInline: {
    alignSelf: 'flex-end',
    marginTop: 4,
    paddingVertical: 4,
  },
  forgotBtnTextInline: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  eyeBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    width: 36,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textInverse,
  },

  // ─── GOOGLE WHITE BUTTON (Exactly matches reference)
  googleBtn: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnIcon: {
    marginRight: Spacing.sm,
  },
  googleBtnText: {
    fontSize: 15,
    color: Colors.textInverse,
    fontWeight: '600',
  },

  // ─── CHECKBOX ROW
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  checkboxText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  checkboxHighlight: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // ─── BOTTOM LINK
  bottomLinkRow: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },
  bottomLinkText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  bottomLinkHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // ─── COMPACT INPUT COMPONENT STYLES
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    height: 46,
    paddingHorizontal: 12,
  },
  inputLeftIcon: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRightIcon: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
});
