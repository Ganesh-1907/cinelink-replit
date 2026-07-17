import React from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card} from '../components/ui';

export default function TermsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Terms & Conditions" navigation={navigation} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.content,
            {paddingBottom: insets.bottom + Spacing.xxl},
          ]}>
          <Text style={styles.lastUpdated}>Last updated: June 2026</Text>

          <Card variant="flat" padding={Spacing.lg} style={styles.introCard}>
            <Text style={styles.intro}>
              These Terms and Conditions govern your use of CineLink — India's
              Cinema Network. By downloading, installing, or using CineLink, you
              agree to be bound by these terms. Please read them carefully
              before using the app.
            </Text>
          </Card>

          <Section
            num="1"
            title="Acceptance of Terms"
            text="By creating an account or using CineLink, you confirm that you are at least 18 years old, have read and understood these Terms, and agree to be legally bound by them. If you do not agree, please do not use our app."
          />

          <Section
            num="2"
            title="User Accounts"
            bullets={[
              'You must provide accurate and complete information when registering',
              'You are responsible for maintaining the security of your account',
              'You must not share your account credentials with others',
              'You must notify us immediately of any unauthorized account access',
              'CineLink reserves the right to suspend or terminate accounts that violate these terms',
            ]}
          />

          <Section
            num="3"
            title="Acceptable Use"
            text="You agree NOT to:"
            bullets={[
              'Post false, misleading, or fraudulent audition listings',
              'Harass, threaten, or abuse other users',
              'Upload inappropriate, offensive, or illegal content',
              'Create fake accounts or impersonate others',
              'Spam other users with unsolicited messages',
              'Use the platform for any illegal activities',
              'Attempt to hack or disrupt our services',
              "Collect other users' data without their consent",
            ]}
          />

          <Section
            num="4"
            title="Content & Intellectual Property"
            text="You retain ownership of content you post on CineLink. However, by posting content, you grant CineLink a non-exclusive license to display and distribute your content within the app. You are solely responsible for the content you post. CineLink's logo, design, and features are protected by intellectual property laws and may not be copied or used without our permission."
          />

          <Section
            num="5"
            title="Auditions & Applications"
            bullets={[
              'CineLink is a networking platform — we do not guarantee any employment or roles',
              'Directors are responsible for the accuracy of their audition listings',
              'CineLink does not verify the legitimacy of every audition posted',
              'Users should exercise caution and do their own research before attending auditions',
              'CineLink is not responsible for any disputes between directors and applicants',
            ]}
          />

          <Section
            num="6"
            title="Payments & Refunds"
            bullets={[
              'Payments are processed securely through Razorpay',
              'Contest entry fees are non-refundable once submitted',
              'In case of technical payment failure, contact us within 48 hours',
              'CineLink is not responsible for payment failures due to bank issues',
              'All prices are in Indian Rupees (INR)',
            ]}
          />

          <Section
            num="7"
            title="Contests"
            bullets={[
              'Contest rules and prizes are as described in each contest',
              'Voting manipulation or cheating will result in disqualification',
              "CineLink's decision on contest winners is final",
              'Prize distribution timelines may vary',
              'CineLink reserves the right to cancel contests if necessary',
            ]}
          />

          <Section
            num="8"
            title="Limitation of Liability"
            text={
              'CineLink is provided "as is" without warranties of any kind. We are not liable for any losses arising from your use of the app, content posted by other users, technical issues or app downtime, disputes between users, or fraudulent auditions posted by third parties.'
            }
          />

          <Section
            num="9"
            title="Termination"
            text="CineLink reserves the right to suspend or permanently ban any account that violates these Terms without prior notice. You may delete your account at any time by contacting us. Upon termination, your data will be handled as per our Privacy Policy."
          />

          <Section
            num="10"
            title="Governing Law"
            text="These Terms are governed by the laws of India. Any disputes arising from the use of CineLink shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana, India."
          />

          <Section
            num="11"
            title="Changes to Terms"
            text="We may update these Terms from time to time. Continued use of CineLink after changes are posted constitutes your acceptance of the updated Terms. We will notify users of significant changes through the app."
          />

          <Section
            num="12"
            title="Contact Us"
            text="For any questions about these Terms, please contact us:"
          />
          <Card variant="elevated" padding={Spacing.lg}>
            <Text style={styles.contactText}>📧 cinelink011@gmail.com</Text>
            <Text style={styles.contactText}>📞 +91 7013345950</Text>
            <Text style={styles.contactText}>
              🎬 CineLink — India's Cinema Network
            </Text>
            <Text style={styles.contactText}>
              📍 Hyderabad, Telangana, India
            </Text>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2026 CineLink. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  num,
  title,
  text,
  bullets,
}: {
  num: string;
  title: string;
  text?: string;
  bullets?: string[];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {num}. {title}
      </Text>
      {text ? <Text style={styles.sectionText}>{text}</Text> : null}
      {bullets?.map((b, i) => (
        <Text key={i} style={styles.bullet}>
          • {b}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  content: {padding: Spacing.screenH},
  lastUpdated: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.lg,
    fontStyle: 'italic',
  },
  introCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  intro: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  section: {marginTop: Spacing.xl},
  sectionTitle: {
    ...Typography.h4,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  bullet: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingLeft: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  contactText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  footer: {marginTop: Spacing['4xl'], alignItems: 'center'},
  footerText: {...Typography.caption, color: Colors.textTertiary},
});
