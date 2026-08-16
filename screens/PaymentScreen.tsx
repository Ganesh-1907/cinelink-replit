import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Alert, SafeAreaView, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import RazorpayCheckout from 'react-native-razorpay';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, EmptyState} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

export default function PaymentScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const {amount, purpose, itemId, itemTitle, contestId} = route.params;
  const [loading, setLoading] = useState(false);
  const {user} = useApp();

  const handlePayment = async () => {
    setLoading(true);
    try {
      const orderRes = await api.post<any>('/payments/create-order', {
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        purpose,
      });

      if (!orderRes?.order?.id) throw new Error('Failed to create order');

      const options = {
        key: 'rzp_test_rtsWNkrDp1dlT7',
        amount: orderRes.order.amount,
        currency: orderRes.order.currency,
        name: 'CineLink',
        description: purpose || 'Payment',
        order_id: orderRes.order.id,
        prefill: {email: user?.email || '', contact: ''},
        theme: {color: '#C9956C'},
      };

      const razorpayRes = await RazorpayCheckout.open(options);
      if (!razorpayRes?.razorpay_payment_id) throw new Error('Payment failed');

      // Verify payment
      await api.post('/payments/verify-payment', {
        razorpay_order_id: razorpayRes.razorpay_order_id,
        razorpay_payment_id: razorpayRes.razorpay_payment_id,
        razorpay_signature: razorpayRes.razorpay_signature,
      });

      // Save payment record
      await api.post('/payments/save-payment', {
        amount,
        purpose,
        orderId: razorpayRes.razorpay_order_id,
        paymentId: razorpayRes.razorpay_payment_id,
        itemId,
        itemTitle,
        contestId,
      });

      Alert.alert('✅ Payment Successful', 'Thank you!', [{text: 'OK', onPress: () => navigation.goBack()}]);
    } catch (e: any) {
      console.log(e);
      Alert.alert('Payment Failed', e?.description || e?.message || 'Something went wrong. Try again.');
    }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Payment" navigation={navigation} />
      <View style={styles.content}>
        <Card variant="elevated" padding={Spacing.xxl} style={styles.card}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amount}>₹{amount}</Text>
          <Text style={styles.purpose}>{purpose || 'Payment'}</Text>
          {itemTitle ? <Text style={styles.item}>For: {itemTitle}</Text> : null}
        </Card>
        <Button label={loading ? 'Processing...' : `Pay ₹${amount}`} variant="primary" size="lg" fullWidth onPress={handlePayment} loading={loading} disabled={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  content: {padding: Spacing.lg, gap: Spacing.xxl, justifyContent: 'center', flex: 1},
  card: {alignItems: 'center', gap: Spacing.sm},
  amountLabel: {color: Colors.textSecondary, fontSize: 14},
  amount: {fontSize: 48, fontWeight: 'bold', color: Colors.textPrimary},
  purpose: {color: Colors.primary, fontSize: 16},
  item: {color: Colors.textSecondary, fontSize: 14},
});
