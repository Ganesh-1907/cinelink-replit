import React, {useState, useContext, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import api from '../src/api/client';
import AppContext from '../src/context/AppContext';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, PopupModal} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

type Step = 'send' | 'otp' | 'newPassword';

export default function ForgotPasswordScreen({navigation}: any) {
  const {isDark} = useTheme();
  const {user} = useContext(AppContext);
  const userEmail = user?.email || '';
  const [step, setStep] = useState<Step>('send');
  const [email, setEmail] = useState(userEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupVariant, setPopupVariant] = useState<'success' | 'warning' | 'info'>('info');

  const showPopup = (title: string, msg: string, v: 'success' | 'warning' | 'info' = 'info') => {
    setPopupTitle(title);
    setPopupMessage(msg);
    setPopupVariant(v);
    setPopupVisible(true);
  };

  useEffect(() => {
    // Don't auto-send — user must click the button
  }, []);

  const sendOtp = async () => {
    if (!email.trim()) { showPopup('Error', 'No email found. Please login first.', 'warning'); return; }
    setLoading(true);
    try {
      await api.post('/auth/send-reset-otp', {email: email.trim().toLowerCase()});
      setStep('otp');
    } catch (e: any) {
      showPopup('Error', e?.message || 'Could not send OTP.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndReset = async () => {
    if (otp.length !== 6) { showPopup('Error', 'Enter the 6-digit OTP.', 'warning'); return; }
    if (newPassword.length < 6) { showPopup('Error', 'Password must be at least 6 characters.', 'warning'); return; }
    if (newPassword !== confirmPassword) { showPopup('Error', 'Passwords do not match.', 'warning'); return; }
    setLoading(true);
    try {
      await api.post('/auth/verify-reset-otp', {
        email: email.toLowerCase(),
        otp,
        newPassword,
      });
      showPopup('Done!', 'Password updated successfully.', 'success');
    } catch (e: any) {
      showPopup('Error', e?.message || 'Invalid OTP or something went wrong.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Reset Password"
        navigation={navigation}
        onBack={() => {
          if (step === 'otp') setStep('send');
          else if (step === 'newPassword') setStep('otp');
          else navigation.goBack();
        }}
      />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 20}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {step === 'send' && (
            <View style={styles.inner}>
              <Text style={styles.icon}>🔐</Text>
              <Text style={styles.heading}>Reset Password</Text>
              {userEmail ? (
                <>
                  <Text style={styles.sub}>
                    A 6-digit OTP will be sent to{'\n'}{userEmail}
                  </Text>
                  {loading ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.loadingText}>Sending OTP to your email...</Text>
                    </View>
                  ) : (
                    <Button label="Send OTP" onPress={sendOtp} variant="primary" fullWidth />
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.sub}>Enter your email to receive a 6-digit OTP.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor={Colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Button
                    label={loading ? 'Sending...' : 'Send OTP'}
                    onPress={sendOtp}
                    variant="primary"
                    fullWidth
                    disabled={loading || !email.trim()}
                  />
                </>
              )}
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.inner}>
              <Text style={styles.heading}>Enter OTP</Text>
              <Text style={styles.sub}>
                A 6-digit code was sent to{'\n'}{email}
              </Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={Colors.textTertiary}
                value={otp}
                onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                textAlign="center"
              />
              <Button
                label="Verify OTP"
                onPress={() => setStep('newPassword')}
                variant="primary"
                fullWidth
                disabled={otp.length !== 6}
              />
              <TouchableOpacity onPress={sendOtp} style={styles.resendBtn}>
                <Text style={styles.resendText}>
                  {loading ? 'Resending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'newPassword' && (
            <View style={styles.inner}>
              <Text style={styles.heading}>New Password</Text>
              <Text style={styles.sub}>Choose a new password (min 6 characters)</Text>
              <TextInput
                style={styles.input}
                placeholder="New password"
                placeholderTextColor={Colors.textTertiary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={Colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showBtn}>
                <Text style={styles.showBtnText}>{showPassword ? '🙈 Hide' : '👁 Show'}</Text>
              </TouchableOpacity>
              <Button
                label={loading ? 'Resetting...' : 'Set New Password'}
                onPress={verifyAndReset}
                variant="primary"
                fullWidth
                disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <PopupModal
        visible={popupVisible}
        onClose={() => {
          setPopupVisible(false);
          if (popupVariant === 'success') navigation.goBack();
        }}
        title={popupTitle}
        message={popupMessage}
        variant={popupVariant}
        confirmLabel={popupVariant === 'success' ? 'OK' : 'Dismiss'}
        onConfirm={() => {
          setPopupVisible(false);
          if (popupVariant === 'success') navigation.goBack();
        }}
        cancelLabel=""
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {flexGrow: 1, justifyContent: 'center', padding: Spacing.xl, paddingBottom: Spacing['4xl']},
  inner: {width: '100%'},
  icon: {fontSize: 48, textAlign: 'center', marginBottom: Spacing.md},
  heading: {color: Colors.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: Spacing.sm, textAlign: 'center'},
  sub: {color: Colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22},
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  otpInput: {fontSize: 28, fontWeight: '700', letterSpacing: 12, paddingVertical: Spacing.lg},
  resendBtn: {alignItems: 'center', marginTop: Spacing.md, padding: Spacing.sm},
  resendText: {color: Colors.primary, fontSize: 14, fontWeight: '600'},
  showBtn: {alignItems: 'flex-end', marginBottom: Spacing.lg},
  showBtnText: {color: Colors.textSecondary, fontSize: 13},
  loadingBox: {alignItems: 'center', marginTop: Spacing.xl},
  loadingText: {color: Colors.textSecondary, fontSize: 14, marginTop: Spacing.md},
});
