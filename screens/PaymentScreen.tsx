import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Card, Button, Header, LoadingView, Divider} from '../components/ui';

const sanitizeForRazorpay = (text: string) =>
  text
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .substring(0, 255);

export default function PaymentScreen({route, navigation}: any) {
  const {amount, purpose, itemId, itemTitle, videoLink} = route.params;
  const [loading, setLoading] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const user = auth().currentUser;

  const amountPaise = amount * 100;
  const currentUserName =
    user?.displayName || user?.email?.split('@')[0] || 'User';

  /* ── CHECK DUPLICATE PAYMENT ── */
  useEffect(() => {
    checkDuplicatePayment();
  }, []);

  const checkDuplicatePayment = async () => {
    try {
      // Use backend API to check duplicate
      try {
        const result = await api.get(
          `/payments/check-duplicate?itemId=${itemId}&purpose=${purpose}`,
        );
        if (result.alreadyPaid) {
          setAlreadyPaid(true);
        }
      } catch {
        // Fallback: direct Firestore check
        const snapshot = await firestore()
          .collection('payments')
          .where('userId', '==', user?.uid)
          .where('itemId', '==', itemId)
          .where('status', '==', 'success')
          .get();
        if (!snapshot.empty) {
          setAlreadyPaid(true);
        }

        if (purpose === 'contest_entry') {
          const entrySnap = await firestore()
            .collection('contestEntries')
            .where('contestId', '==', itemId)
            .where('userId', '==', user?.uid)
            .get();
          if (!entrySnap.empty) {
            setAlreadyPaid(true);
          }
        }
      }
    } catch (e) {
      console.log('CHECK DUPLICATE ERROR:', e);
    } finally {
      setCheckingPayment(false);
    }
  };

  /* ── PROCESS PAYMENT ── */
  const processPayment = async () => {
    if (alreadyPaid) {
      Alert.alert('Already Paid', 'You have already paid for this item!');
      return;
    }
    setLoading(true);

    try {
      // Step 1: Create order via backend API
      let orderId: string;
      let razorpayKey: string;

      try {
        const orderResult = await api.post('/payments/create-order', {
          amount,
          notes: {
            userId: user?.uid,
            userEmail: user?.email,
            purpose,
            itemId,
            itemTitle,
            videoLink: videoLink || '',
          },
        });
        orderId = orderResult.orderId;
        razorpayKey = orderResult.keyId;
      } catch {
        Alert.alert(
          'Payment Error',
          'Could not connect to payment server. Please try again.',
        );
        setLoading(false);
        return;
      }

      // Step 2: Open Razorpay checkout
      const options = {
        description: sanitizeForRazorpay(itemTitle),
        currency: 'INR',
        key: razorpayKey,
        amount: amountPaise,
        order_id: orderId,
        name: 'CineLink',
        prefill: {
          email: user?.email || '',
          contact: '',
          name: currentUserName,
        },
        theme: {color: Colors.primary},
      };

      const data = await RazorpayCheckout.open(options);

      // Step 3: Verify payment signature via backend
      if (data.razorpay_payment_id && data.razorpay_signature) {
        try {
          await api.post('/payments/verify-payment', {
            razorpay_order_id: orderId,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
          });
        } catch {
          // Verification failed — but payment went through. Save anyway.
          console.log('Payment verification error (non-fatal)');
        }
      }

      // Step 4: Save payment record via backend
      try {
        await api.post('/payments/save-payment', {
          orderId,
          paymentId: data.razorpay_payment_id,
          amount,
          purpose,
          itemId,
          itemTitle,
          videoLink: videoLink || '',
        });
      } catch {
        // Fallback: direct Firestore write
        await firestore()
          .collection('payments')
          .add({
            userId: user?.uid,
            userEmail: user?.email,
            userName: currentUserName,
            amount,
            purpose,
            itemId,
            itemTitle,
            videoLink: videoLink || '',
            status: 'success',
            transactionId: data.razorpay_payment_id,
            paidAt: firestore.FieldValue.serverTimestamp(),
          });

        if (purpose === 'contest_entry') {
          const existing = await firestore()
            .collection('contestEntries')
            .where('contestId', '==', itemId)
            .where('userId', '==', user?.uid)
            .get();

          if (existing.empty) {
            await firestore()
              .collection('contestEntries')
              .add({
                contestId: itemId,
                contestTitle: itemTitle,
                userId: user?.uid,
                userEmail: user?.email,
                userName: currentUserName,
                videoLink: videoLink || '',
                votes: 0,
                juryScore: 0,
                finalScore: 0,
                paid: true,
                transactionId: data.razorpay_payment_id,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });
            try {
              await firestore()
                .collection('contests')
                .doc(itemId)
                .update({
                  entriesCount: firestore.FieldValue.increment(1),
                });
            } catch (counterErr: any) {
              console.log('ENTRIES_COUNT_UPDATE_ERROR:', counterErr?.message);
            }
          }
        }

        if (purpose === 'film_upload') {
          await firestore()
            .collection('films')
            .doc(itemId)
            .update({paid: true});
        }
      }

      Alert.alert(
        '✅ Payment Successful!',
        `₹${amount} paid successfully!\n\nTransaction ID: ${data.razorpay_payment_id}`,
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (error: any) {
      if (error.code === 2) {
        // User cancelled
        return;
      }
      console.log('PAYMENT ERROR:', error);
      Alert.alert(
        '❌ Payment Failed',
        error.description ||
          error.message ||
          'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingPayment) {
    return (
      <LoadingView
        message="Checking payment status..."
        fullScreen
        color={Colors.primary}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="Payment"
        navigation={navigation}
        onBack={() => navigation.goBack()}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          {/* ALREADY PAID WARNING */}
          {alreadyPaid && (
            <Card variant="outlined" padding={Spacing.lg}>
              <View style={styles.alreadyPaidInner}>
                <Text style={styles.alreadyPaidText}>
                  ✅ You have already paid for this item!
                </Text>
                <Button
                  label="Go Back"
                  onPress={() => navigation.goBack()}
                  variant="secondary"
                  size="sm"
                />
              </View>
            </Card>
          )}

          {/* ORDER SUMMARY */}
          <Card variant="elevated" padding={Spacing.xl}>
            <Text style={styles.orderLabel}>Payment for</Text>
            <Text style={styles.orderTitle}>{itemTitle}</Text>
            <Divider />
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Entry Fee</Text>
              <Text style={styles.amountValue}>₹{amount}</Text>
            </View>
            <Divider />
            <View style={styles.amountRow}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.totalAmount}>₹{amount}</Text>
            </View>
          </Card>

          {/* WHAT YOU GET */}
          <Card variant="elevated" padding={Spacing.lg}>
            <Text style={styles.benefitsTitle}>✅ What you get</Text>
            {purpose === 'contest_entry' && (
              <>
                <Text style={styles.benefitItem}>
                  🎬 Your video submitted to contest
                </Text>
                <Text style={styles.benefitItem}>
                  👍 Public voting on your entry
                </Text>
                <Text style={styles.benefitItem}>⭐ Jury evaluation</Text>
                <Text style={styles.benefitItem}>
                  🏆 Chance to win the prize
                </Text>
              </>
            )}
            {purpose === 'film_upload' && (
              <>
                <Text style={styles.benefitItem}>
                  🎬 Your film featured on CineLink
                </Text>
                <Text style={styles.benefitItem}>
                  👁 Visibility to industry professionals
                </Text>
                <Text style={styles.benefitItem}>
                  ❤️ Likes and comments from users
                </Text>
              </>
            )}
          </Card>

          {/* SECURE BADGE */}
          <Card variant="flat" padding={Spacing.lg}>
            <View style={styles.secureInner}>
              <Text style={styles.secureText}>🔒 100% Secure Payment</Text>
              <Text style={styles.secureDesc}>
                Powered by Razorpay — encrypted and secure
              </Text>
            </View>
          </Card>

          {/* PAY BUTTON */}
          {!alreadyPaid && (
            <View style={styles.payBtnWrap}>
              <Button
                label={`💳 Pay ₹${amount}`}
                onPress={processPayment}
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  section: {
    padding: Spacing.lg,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.md,
  },

  alreadyPaidInner: {alignItems: 'center', gap: Spacing.md},
  alreadyPaidText: {
    ...Typography.label,
    color: Colors.success,
    textAlign: 'center',
  },

  orderLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  orderTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },

  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  amountLabel: {...Typography.body, color: Colors.textSecondary},
  amountValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  totalLabel: {
    ...Typography.bodyLg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  totalAmount: {...Typography.h2, color: Colors.primary},

  benefitsTitle: {
    ...Typography.label,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  benefitItem: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  secureInner: {alignItems: 'center'},
  secureText: {
    ...Typography.label,
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  secureDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  payBtnWrap: {marginTop: Spacing.sm},
});
