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
} from 'react-native';
import auth from '@react-native-firebase/auth';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {LiquidPress} from '../components/LiquidPress';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Button, Input} from '../components/ui';

const RESEND_COUNTDOWN = 60;

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
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmationRef = useRef<any>(null);

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
    if (!/^\d{4,6}$/.test(otpCleaned)) {
      setErrorMsg('Please enter the OTP sent to your number.');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.post('/otp/verify', {
        phone: phone.replace(/\s/g, ''),
        otp: otpCleaned,
      });

      // Sign in with the custom token from backend
      await auth().signInWithCustomToken(res.token);
      // App.tsx onAuthStateChanged auto-routes to MainStack
    } catch (e: any) {
      setErrorMsg(errorMessage(e.message));
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
    confirmationRef.current = null;
    setStep('phone');
    setOtp('');
    setErrorMsg('');
    setCountdown(0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.background}
        />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {paddingBottom: insets.bottom + Spacing.xl},
          ]}
          keyboardShouldPersistTaps="handled">
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>📱</Text>
            <Text style={styles.headerTitle}>Phone Login</Text>
            <Text style={styles.headerSub}>
              {step === 'phone'
                ? 'Enter your 10-digit mobile number'
                : `OTP sent to +91 ${phone}`}
            </Text>
          </View>

          <View style={styles.card}>
            {step === 'phone' ? (
              <>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="10-digit number"
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

                {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

                <Button
                  label="Send OTP →"
                  onPress={handleSendOTP}
                  variant="primary"
                  size="lg"
                  loading={sendingOtp}
                  disabled={sendingOtp || phone.length !== 10}
                  fullWidth
                />
              </>
            ) : (
              <>
                <View style={styles.sentRow}>
                  <Text style={styles.sentLabel}>OTP sent to</Text>
                  <Text style={styles.sentNumber}>+91 {phone}</Text>
                  <TouchableOpacity onPress={handleChangeNumber}>
                    <Text style={styles.changeLink}>Change</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Enter OTP</Text>
                <TextInput
                  style={styles.otpInput}
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

                {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

                <Button
                  label="Verify OTP →"
                  onPress={handleVerifyOTP}
                  variant="primary"
                  size="lg"
                  loading={verifying}
                  disabled={verifying || otp.length !== 6}
                  fullWidth
                />

                {/* RESEND */}
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleResend}
                  disabled={countdown > 0 || sendingOtp}>
                  {sendingOtp ? (
                    <ActivityIndicator
                      size="small"
                      color={Colors.primaryLight}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.resendText,
                        countdown > 0 && styles.resendDisabled,
                      ]}>
                      {countdown > 0
                        ? `Resend OTP in ${countdown}s`
                        : 'Resend OTP'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* BACK */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flexGrow: 1, paddingHorizontal: Spacing.screenH},

  header: {
    alignItems: 'center',
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.xl,
  },
  headerIcon: {fontSize: 52, marginBottom: Spacing.md},
  headerTitle: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
  },

  label: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },

  phoneRow: {flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg},
  countryCode: {
    backgroundColor: Colors.cardHigher,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countryCodeText: {...Typography.btn, color: Colors.textPrimary, fontSize: 15},
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.cardHigher,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: 18,
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  otpInput: {
    backgroundColor: Colors.cardHigher,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    color: Colors.textPrimary,
    fontSize: 28,
    letterSpacing: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },

  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    flexWrap: 'wrap',
  },
  sentLabel: {...Typography.bodySm, color: Colors.textSecondary},
  sentNumber: {
    ...Typography.bodySm,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  changeLink: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  error: {...Typography.bodySm, color: Colors.error, marginBottom: Spacing.md},

  resendBtn: {alignItems: 'center', marginTop: Spacing.lg, padding: Spacing.sm},
  resendText: {
    ...Typography.body,
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  resendDisabled: {color: Colors.textTertiary},

  backBtn: {alignItems: 'center', marginTop: Spacing.sm},
  backText: {...Typography.body, color: Colors.textSecondary},
});
