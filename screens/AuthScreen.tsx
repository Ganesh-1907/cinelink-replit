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
  Image,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
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
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

type AuthMode = 'options' | 'login' | 'signup' | 'forgot';

const cinemaSeatsImg = require('../assets/auth/cinema_seats.png');
const directorsChairImg = require('../assets/auth/directors_chair.png');
const retroCameraImg = require('../assets/auth/retro_camera.png');
const cinemaProjectorImg = require('../assets/auth/cinema_projector.png');

// ─── SVG VECTOR ICONS ────────────────────────────────────────────────────────
const UserIcon = ({color}: {color: string}) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

const MailIcon = ({color}: {color: string}) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Polyline points="22,6 12,13 2,6" />
  </Svg>
);

const LockIcon = ({color}: {color: string}) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

const PhoneIcon = ({color}: {color: string}) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);

const FilmReelIcon = () => (
  <Svg width="48" height="48" viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill={Colors.primary} />
    <Circle cx="12" cy="12" r="3" fill={Colors.background} />
    <Circle cx="12" cy="6.5" r="1.8" fill={Colors.background} />
    <Circle cx="12" cy="17.5" r="1.8" fill={Colors.background} />
    <Circle cx="6.5" cy="12" r="1.8" fill={Colors.background} />
    <Circle cx="17.5" cy="12" r="1.8" fill={Colors.background} />
  </Svg>
);

const EyeIcon = ({color}: {color: string}) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <Circle cx="12" cy="12" r="3" />
  </Svg>
);

const EyeOffIcon = ({color}: {color: string}) => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export default function AuthScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const {isDark} = useTheme();
  const [authMode, setAuthMode] = useState<AuthMode>('options');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      Alert.alert('Login Failed', 'Invalid email or password.');
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
    if (password !== confirmPassword) {
      Alert.alert('Passwords Mismatch', 'Password and Confirm Password must match.');
      return;
    }
    if (!agreed) {
      Alert.alert('Terms & Conditions', 'Please agree to the Terms & Conditions and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    try {
      await authService.signup(email.trim(), password.trim(), name.trim());
      await refreshUserData();
    } catch (e: any) {
      Alert.alert('Signup Failed', 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Please enter your email or mobile number first.');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/auth/forgot-password', {email: email.trim()});
      Alert.alert('Email Sent!', 'Check your inbox to reset your password.');
      setAuthMode('login');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setResetLoading(false);
    }
  };

  const bgImage = (() => {
    switch (authMode) {
      case 'options':
        return cinemaProjectorImg;
      case 'login':
        return cinemaSeatsImg;
      case 'signup':
        return cinemaProjectorImg;
      case 'forgot':
        return retroCameraImg;
      default:
        return cinemaProjectorImg;
    }
  })();

  const renderHeader = () => {
    if (authMode === 'options') return null;
    return (
      <View style={[styles.topHeader, {top: insets.top || 16}]}>
        <TouchableOpacity
          onPress={() => setAuthMode(authMode === 'forgot' ? 'login' : 'options')}
          style={styles.backArrowButton}
          activeOpacity={0.8}
        >
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
            {
              opacity: isDark ? 0.32 : 0.14,
              tintColor: isDark ? undefined : Colors.primary,
            }
          ]}
          resizeMode="cover"
        />
        {/* simulated gradient fade-out at the top of the image container to blend into app background */}
        <View style={{position: 'absolute', top: 0, left: 0, right: 0, height: 15, backgroundColor: Colors.background}} />
        <View style={{position: 'absolute', top: 15, left: 0, right: 0, height: 15, backgroundColor: Colors.background, opacity: 0.75}} />
        <View style={{position: 'absolute', top: 30, left: 0, right: 0, height: 15, backgroundColor: Colors.background, opacity: 0.5}} />
        <View style={{position: 'absolute', top: 45, left: 0, right: 0, height: 15, backgroundColor: Colors.background, opacity: 0.25}} />
      </View>

      {renderHeader()}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + (authMode === 'options' ? 24 : 40),
            paddingBottom: insets.bottom + 16,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── OPTIONS MODE (Screen 3) ── */}
        {authMode === 'options' && (
          <View style={styles.optionsContent}>
            <View style={styles.logoSection}>
              <Image
                source={require('../assets/auth/cinelink_logo_emblem.png')}
                style={styles.appLogoEmblem}
                resizeMode="contain"
              />
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
                activeOpacity={0.85}
              >
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
                  <Text style={styles.largeOptionTitle}>Continue with Google</Text>
                  <Text style={styles.largeOptionSubtitle}>Quick and secure</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.largeOptionBtn}
                onPress={() => navigation.navigate('PhoneLogin')}
                activeOpacity={0.85}
              >
                <View style={styles.largeOptionIconWrapper}>
                  <PhoneIcon color={Colors.primary} />
                </View>
                <View style={styles.largeOptionTextWrapper}>
                  <Text style={styles.largeOptionTitle}>Continue with Mobile</Text>
                  <Text style={styles.largeOptionSubtitle}>Login using OTP</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.optionsDividerWrapper}>
                <View style={styles.optionsDividerLine} />
                <Text style={styles.optionsDividerText}>or</Text>
                <View style={styles.optionsDividerLine} />
              </View>

              <TouchableOpacity
                style={styles.largeOptionBtn}
                onPress={() => setAuthMode('login')}
                activeOpacity={0.85}
              >
                <View style={styles.largeOptionIconWrapper}>
                  <MailIcon color={Colors.primary} />
                </View>
                <View style={styles.largeOptionTextWrapper}>
                  <Text style={styles.largeOptionTitle}>Continue with Email</Text>
                  <Text style={styles.largeOptionSubtitle}>Login with email & password</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.bottomLinkRow} onPress={() => setAuthMode('signup')}>
              <Text style={styles.bottomLinkText}>
                New to CineLink? <Text style={styles.bottomLinkHighlight}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SIGN IN MODE (Screen 1) ── */}
        {authMode === 'login' && (
          <View style={styles.formContent}>
            <View style={styles.logoSection}>
              <Image
                source={require('../assets/auth/cinelink_logo_emblem.png')}
                style={styles.appLogoEmblem}
                resizeMode="contain"
              />
              <Text style={styles.appName}>CineLink</Text>
              <Text style={styles.tagline}>Connect. Create. Cast.</Text>
            </View>

            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Welcome back!</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            <View style={styles.formFields}>
              <AuthInput
                placeholder="Email or Mobile Number"
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
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      {showPassword ? <EyeOffIcon color={Colors.textTertiary} /> : <EyeIcon color={Colors.textTertiary} />}
                    </TouchableOpacity>
                  }
                />
                <TouchableOpacity
                  onPress={() => setAuthMode('forgot')}
                  style={styles.forgotBtnInline}
                  activeOpacity={0.8}
                >
                  <Text style={styles.forgotBtnTextInline}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleEmailLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#09090B" />
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
                style={[styles.googleBtn, { backgroundColor: '#FFFFFF', borderColor: '#E6E6E6' }]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#09090B" />
                ) : (
                  <View style={styles.googleBtnContent}>
                    <Svg width="18" height="18" viewBox="0 0 24 24" style={styles.googleBtnIcon}>
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
                    <Text style={[styles.googleBtnText, { color: '#09090B' }]}>Continue with Google</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.bottomLinkRow} onPress={() => setAuthMode('signup')}>
              <Text style={styles.bottomLinkText}>
                Don't have an account? <Text style={styles.bottomLinkHighlight}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SIGN UP MODE (Screen 2) ── */}
        {authMode === 'signup' && (
          <View style={styles.formContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Join CineLink and explore opportunities</Text>
            </View>

            <View style={styles.formFields}>
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

              <AuthInput
                placeholder="Mobile Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                leftIcon={<PhoneIcon color={Colors.textTertiary} />}
              />

              <AuthInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                leftIcon={<LockIcon color={Colors.textTertiary} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOffIcon color={Colors.textTertiary} /> : <EyeIcon color={Colors.textTertiary} />}
                  </TouchableOpacity>
                }
              />

              <AuthInput
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                leftIcon={<LockIcon color={Colors.textTertiary} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    {showConfirmPassword ? <EyeOffIcon color={Colors.textTertiary} /> : <EyeIcon color={Colors.textTertiary} />}
                  </TouchableOpacity>
                }
              />

              {/* CHECKBOX */}
              <TouchableOpacity
                style={styles.checkboxWrapper}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && (
                    <Svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#09090B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <Polyline points="20,6 9,17 4,12" />
                    </Svg>
                  )}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to the{' '}
                  <Text
                    style={styles.checkboxHighlight}
                    onPress={() => navigation.navigate('Terms')}
                  >
                    Terms & Conditions
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={styles.checkboxHighlight}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleEmailSignup}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#09090B" />
                ) : (
                  <Text style={styles.submitBtnText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <View style={styles.optionsDividerWrapper}>
                <View style={styles.optionsDividerLine} />
                <Text style={styles.optionsDividerText}>or continue with</Text>
                <View style={styles.optionsDividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleBtn, { backgroundColor: '#FFFFFF', borderColor: '#E6E6E6' }]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.85}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#09090B" />
                ) : (
                  <View style={styles.googleBtnContent}>
                    <Svg width="18" height="18" viewBox="0 0 24 24" style={styles.googleBtnIcon}>
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
                    <Text style={[styles.googleBtnText, { color: '#09090B' }]}>Continue with Google</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.bottomLinkRow} onPress={() => setAuthMode('login')}>
              <Text style={styles.bottomLinkText}>
                Already have an account? <Text style={styles.bottomLinkHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FORGOT PASSWORD MODE (Screen 5) ── */}
        {authMode === 'forgot' && (
          <View style={styles.formContent}>
            <View style={styles.welcomeSection}>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>Enter your email or mobile number to reset your password</Text>
            </View>

            <View style={styles.formFields}>
              <AuthInput
                placeholder="Email or Mobile Number"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                leftIcon={<MailIcon color={Colors.textTertiary} />}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleForgotPassword}
                disabled={resetLoading}
                activeOpacity={0.85}
              >
                {resetLoading ? (
                  <ActivityIndicator size="small" color="#09090B" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.bottomLinkRow} onPress={() => setAuthMode('login')}>
              <Text style={styles.bottomLinkText}>
                Remember your password? <Text style={styles.bottomLinkHighlight}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    height: '35%',
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
  },
  tagline: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
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
    backgroundColor: '#111113',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2E2E32',
    height: 64,
  },
  largeOptionIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#18181B',
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
    color: '#FAFAFA',
  },
  largeOptionSubtitle: {
    fontSize: 11,
    color: '#717178',
    marginTop: 1,
  },

  // ─── DIVIDERS
  optionsDividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    width: '100%',
  },
  optionsDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2E2E32',
    opacity: 0.5,
  },
  optionsDividerText: {
    fontSize: 12,
    color: '#717178',
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
    color: '#09090B',
  },

  // ─── GOOGLE WHITE BUTTON (Exactly matches reference)
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E6E6E6',
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
    color: '#09090B',
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
    color: '#A1A1AA',
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
    color: '#A1A1AA',
  },
  bottomLinkHighlight: {
    color: Colors.primary,
    fontWeight: 'bold',
  },

  // ─── COMPACT INPUT COMPONENT STYLES
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111113',
    borderColor: '#2E2E32',
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
    color: '#FAFAFA',
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
});
