import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import Svg, {Path, Circle, Rect, Polyline, Line} from 'react-native-svg';
import {GOOGLE_WEB_CLIENT_ID} from '../src/api/config';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import api from '../src/api/client';
import {storageService} from '../src/services/storageService';
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

const RESEND_COUNTDOWN = 60;
const cinemaSeatsImg = require('../assets/auth/cinema_seats.jpg');
const cinemaSeatsImgLight = require('../assets/auth/cinema_seats_light.jpg');

// ─── SVG VECTOR ICONS ────────────────────────────────────────────────────────
const MailIcon = ({color}: {color: string}) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <Polyline points="22,6 12,13 2,6" />
  </Svg>
);

const errorMessage = (msg: string): string => {
  if (
    msg.includes('Invalid OTP') ||
    msg.includes('invalid OTP') ||
    msg.includes('expired OTP')
  ) {
    return 'Incorrect or expired OTP. Please try again.';
  }
  if (msg.includes('Invalid phone')) {
    return 'Invalid phone number. Please check and try again.';
  }
  if (msg.includes('Too many')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return msg || 'Something went wrong. Please try again.';
};

export default function PhoneLoginScreen({navigation}: any) {
  const {refreshUserData} = useApp();
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COUNTDOWN);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async () => {
    setErrorMsg('');
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\d{10}$/.test(cleaned)) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSendingOtp(true);
    try {
      await api.post('/otp/send', {phone: cleaned});
      setStep('otp');
      startCountdown();
    } catch (e: any) {
      setErrorMsg(errorMessage(e.message));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async () => {
    setErrorMsg('');
    const otpCleaned = otp.replace(/\s/g, '');
    if (!/^\d{6}$/.test(otpCleaned)) {
      setErrorMsg('Please enter a valid 6-digit OTP sent to your number.');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.post('/otp/verify', {
        phone: phone.replace(/\s/g, ''),
        otp: otpCleaned,
      });

      const loginRes = await api.post('/auth/phone-login', {phone: phone.replace(/\s/g, '')});
      await storageService.setToken(loginRes.token);
      await storageService.setUserData(loginRes.user);
      await refreshUserData();
    } catch (e: any) {
      setErrorMsg(errorMessage(e.message));
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) {
      return;
    }
    setErrorMsg('');
    const cleaned = phone.replace(/\s/g, '');
    setSendingOtp(true);
    try {
      await api.post('/otp/resend', {phone: cleaned});
      startCountdown();
    } catch (e: any) {
      setErrorMsg(errorMessage(e.message));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleChangeNumber = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setStep('phone');
    setOtp('');
    setErrorMsg('');
    setCountdown(0);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.background}
        />

        {/* BACKGROUND IMAGE (Fixed at bottom) */}
        <View style={styles.bgImageContainer} pointerEvents="none">
          <Image
            source={isDark ? cinemaSeatsImg : cinemaSeatsImgLight}
            style={[
              styles.bgImage,
              {
                opacity: isDark ? 0.75 : 0.85,
                tintColor: undefined,
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

        {/* BACK ARROW */}
        <View style={[styles.topHeader, {top: insets.top || 12}]}>
          <TouchableOpacity
            onPress={step === 'otp' ? handleChangeNumber : () => navigation.goBack()}
            style={styles.backArrowButton}
            activeOpacity={0.8}
          >
            <Text style={styles.backArrowText}>←</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 110,
              paddingBottom: insets.bottom + 16,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* MAIN FORM */}
          <View style={styles.formContent}>
            {step === 'phone' ? (
              <>
                <View style={styles.welcomeSection}>
                  <Text style={styles.title}>Enter your mobile number</Text>
                  <Text style={styles.subtitle}>We'll send you a 6-digit OTP</Text>
                </View>

                {/* COUNTRY + PHONE PICKER ROW */}
                <View style={styles.phoneInputRow}>
                  <View style={styles.countryPicker}>
                    <Text style={styles.countryFlag}>🇮🇳</Text>
                    <Text style={styles.countryCode}>+91</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="Mobile Number"
                      placeholderTextColor={Colors.textTertiary}
                      value={phone}
                      onChangeText={t => {
                        setPhone(t.replace(/[^0-9]/g, '').slice(0, 10));
                        setErrorMsg('');
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOTP}
                    />
                  </View>
                </View>

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSendOTP}
                  disabled={sendingOtp || phone.length !== 10}
                  activeOpacity={0.85}
                >
                  {sendingOtp ? (
                    <ActivityIndicator size="small" color="#09090B" />
                  ) : (
                    <Text style={styles.submitBtnText}>Send OTP</Text>
                  )}
                </TouchableOpacity>

                {/* SOCIAL DIVIDER */}
                <View style={styles.optionsDividerWrapper}>
                  <View style={styles.optionsDividerLine} />
                  <Text style={styles.optionsDividerText}>or login with</Text>
                  <View style={styles.optionsDividerLine} />
                </View>

                {/* SOCIAL ROW */}
                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={[styles.socialBtn, { backgroundColor: '#FFFFFF', borderColor: '#E6E6E6' }]}
                    onPress={handleGoogleSignIn}
                    disabled={googleLoading}
                    activeOpacity={0.85}
                  >
                    {googleLoading ? (
                      <ActivityIndicator size="small" color="#09090B" />
                    ) : (
                      <View style={styles.socialBtnContent}>
                        <Svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
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
                        <Text style={[styles.socialBtnText, { color: '#09090B' }]}>Google</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.socialBtn, { backgroundColor: '#111113', borderColor: '#2E2E32' }]}
                    onPress={() => navigation.navigate('Auth', { mode: 'login' })}
                    activeOpacity={0.8}
                  >
                    <View style={styles.socialBtnContent}>
                      <View style={{ marginRight: 8 }}>
                        <MailIcon color={Colors.textPrimary} />
                      </View>
                      <Text style={[styles.socialBtnText, { color: '#FAFAFA' }]}>Email</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* TERMS DISCLAIMER */}
                <Text style={styles.disclaimerText}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.disclaimerHighlight} onPress={() => navigation.navigate('Terms')}>
                    Terms & Conditions
                  </Text>{' '}
                  &{' '}
                  <Text style={styles.disclaimerHighlight} onPress={() => navigation.navigate('PrivacyPolicy')}>
                    Privacy Policy
                  </Text>
                </Text>
              </>
            ) : (
              <>
                <View style={styles.welcomeSection}>
                  <Text style={styles.title}>Enter OTP</Text>
                  <Text style={styles.subtitle}>We sent a 6-digit code to +91 {phone}</Text>
                </View>

                <TextInput
                  style={[
                    styles.otpInput,
                    {
                      color: Colors.textPrimary,
                      backgroundColor: '#111113',
                      borderColor: errorMsg ? Colors.error : '#2E2E32',
                    },
                  ]}
                  placeholder="• • • • • •"
                  placeholderTextColor={Colors.textTertiary}
                  value={otp}
                  onChangeText={t => {
                    setOtp(t.replace(/[^0-9]/g, '').slice(0, 6));
                    setErrorMsg('');
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOTP}
                  autoFocus
                />

                {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleVerifyOTP}
                  disabled={verifying || otp.length !== 6}
                  activeOpacity={0.85}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#09090B" />
                  ) : (
                    <Text style={styles.submitBtnText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>

                {/* RESEND COUNTDOWN */}
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleResend}
                  disabled={countdown > 0 || sendingOtp}
                  activeOpacity={0.8}
                >
                  {sendingOtp ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text
                      style={[
                        styles.resendText,
                        countdown > 0 && styles.resendDisabled,
                      ]}
                    >
                      {countdown > 0
                        ? `Resend OTP in ${countdown}s`
                        : 'Resend OTP'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
    height: '45%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: -1,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },

  // ─── WELCOME SECTION
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

  formContent: {
    justifyContent: 'flex-start',
    paddingVertical: 12,
  },

  // ─── COUNTRY PICKER & INPUT ROW
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginBottom: 12,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111113',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E2E32',
    paddingHorizontal: 12,
    height: 46,
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 6,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginRight: 6,
  },
  dropdownArrow: {
    fontSize: 8,
    color: Colors.textTertiary,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111113',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E2E32',
    height: 46,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    height: '100%',
    padding: 0,
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

  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginBottom: 12,
  },

  // ─── SOCIALS
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
    color: Colors.textTertiary,
    paddingHorizontal: 12,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  socialBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ─── DISCLAIMER
  disclaimerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 12,
  },
  disclaimerHighlight: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // ─── OTP STUFF
  otpInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 20,
    letterSpacing: 8,
    borderWidth: 1,
    textAlign: 'center',
    height: 46,
    marginBottom: 12,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  resendDisabled: {
    color: Colors.textTertiary,
  },
});
